"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./socketConnection";
import type {
  OfferDrawPayload,
  OfferDrawSuccessResponse,
  ClaimDrawSuccessResponse,
  DeclineDrawResponse,
  RematchOpponent,
} from "@repo/socket-types";

export type RematchStatus = "idle" | "requesting" | "incoming";

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san?: string;
}

export interface GameMovePayload {
  userId: string;
  move: ChessMove;
  timeTakenMs?: number;
  newFen?: string;
}

export interface ServerTimes {
  /** Remaining white time in milliseconds */
  white: number;
  /** Remaining black time in milliseconds */
  black: number;
}

export interface GameRoomState {
  // Included in reconnect responses so the client can set activeGameId
  // without needing a separate lookup. May be absent for live move updates.
  gameId?: string;
  initialFen?: string;
  currentFen: string;
  gameState: string;
  whitePlayerId?: string;
  blackPlayerId?: string;
  player1Id?: string;
  player1Username?: string;
  player1Rating?: string;
  player1ProfileImageUrl?: string;
  player2Id?: string;
  player2Username?: string;
  player2Rating?: string;
  player2ProfileImageUrl?: string;
  winnerId: string | null;
  blackPlayerLeftTime: number;
  whitePlayerLeftTime: number;
  time_slot: string;
  isRated: boolean;
  /** Present for tournament games; absent (undefined) for casual/rated games. */
  tournamentId?: string;
  /** Unix epoch ms when the tournament game is scheduled to start. Present only
   *  for tournament games before (or at) game start; undefined for casual games. */
  leftGameStartTime?: number;
  gameMode: string;
}

/** Extended move event shape that includes server-authoritative clock times */
interface MoveEventData extends GameMovePayload {
  whitePlayerLeftTime?: number;
  blackPlayerLeftTime?: number;
  timeTakenMs?: number;
}
export interface InvalidMoveResponse {
  gameId: string;
  userId: string;
  move?: { from: string; to: string; promotion?: string };
  error?: string;
  message?: string;
  reason?: string;
}

export function useGameRoom() {
  const { socket } = useSocket();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameRoomState | null>(null);
  const [movesHistory, setMovesHistory] = useState<GameMovePayload[]>([]);
  const [invalidMove, setInvalidMove] = useState<InvalidMoveResponse | null>(
    null,
  );
  const [serverTimes, setServerTimes] = useState<ServerTimes | null>(null);
  // A draw offer the opponent sent that this user must accept or decline —
  // the popup driven by this stays open until the user responds (it cannot
  // be dismissed), so a reconnect re-checks via checkDrawOffer/"draw-request".
  const [drawOffer, setDrawOffer] = useState<OfferDrawPayload | null>(null);
  // Transient banner message for draw events (offer sent / declined) — cleared
  // by the consumer (e.g. on a timer) via clearDrawNotice.
  const [drawNotice, setDrawNotice] = useState<string | null>(null);
  // True from the moment we send a draw offer until the opponent responds —
  // used to disable the "Draw" button so a second offer can't be stacked.
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  // Holds a game the server found on initial join_arena — shown as a resume prompt.
  const [pendingActiveGame, setPendingActiveGame] =
    useState<GameRoomState | null>(null);

  const [rematchStatus, setRematchStatus] = useState<RematchStatus>("idle");
  const [incomingRematch, setIncomingRematch] =
    useState<RematchOpponent | null>(null);
  const [showBoardAnimation, setShowBoardAnimation] = useState(false);

  // true while waiting for the server to reply to join_arena
  const [isCheckingActiveGame, setIsCheckingActiveGame] =
    useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    function handleGameState(state: GameRoomState): void {
      setGameState(state);
      if (state.gameId) {
        const isActive =
          state.gameState === "IN_PROGRESS" ||
          state.gameState === "INITIALIZED";
        if (isActive) {
          // Restore activeGameId only for live games so a completed game on
          // reconnect doesn't lock the user into an endless game-over modal loop.
          setActiveGameId(state.gameId);
          localStorage.setItem(state.gameId, state.time_slot ?? "");
        } else {
          localStorage.removeItem(state.gameId);
        }
      }
      // Sync authoritative clock times whenever game state arrives
      setServerTimes({
        white: Number(state.whitePlayerLeftTime) * 1000,
        black: Number(state.blackPlayerLeftTime) * 1000,
      });
      setIsCheckingActiveGame(false);
    }

    function handleNoActiveGame(): void {
      // Server confirmed no active game exists for this user.
      // Clear the in-memory reference so the lobby is shown.
      setActiveGameId(null);
      setPendingActiveGame(null);
      setIsCheckingActiveGame(false);
    }

    // Server found an active game — either pushed after a new match or returned
    // from an initial join_arena reconnect check.
    // INITIALIZED  → new game just started; apply state directly (no modal).
    // IN_PROGRESS  → reconnecting to an ongoing game; show resume modal.
    function handleActiveGameFound(state: GameRoomState): void {
      if (state.gameId) {
        localStorage.setItem(state.gameId, state.time_slot ?? "");
      }
      setServerTimes({
        white: Number(state.whitePlayerLeftTime) * 1000,
        black: Number(state.blackPlayerLeftTime) * 1000,
      });
      setIsCheckingActiveGame(false);

      if (state.gameState === "INITIALIZED") {
        // Fresh game (including rematch) — clear stale history and load immediately.
        setMovesHistory([]);
        setGameState(state);
        if (state.gameId) setActiveGameId(state.gameId);
        setRematchStatus("idle");
        setIncomingRematch(null);
        setShowBoardAnimation(true);
      } else {
        // In-progress reconnect — prompt user to resume or start new.
        setPendingActiveGame(state);
      }
    }

    function handleRematchRequest(data: RematchOpponent): void {
      setRematchStatus("incoming");
      setIncomingRematch(data);
    }

    // Issue #3: Server now sends a single batch on join_arena — replace the
    // entire history atomically so the board is always fully in sync on refresh.
    function handleMoveHistoryBatch(moves: GameMovePayload[]): void {
      setMovesHistory(moves.filter((m) => m && m.move));
    }

    // Issue #5: Server confirms the move the user just made.
    // Find the optimistic entry we added in sendMove (most recent entry for
    // this user / from / to) and replace it with the server-confirmed data.
    // If no optimistic entry exists (e.g. client reconnected mid-game) just append.
    function handleMoveResult(moveData: MoveEventData): void {
      setInvalidMove(null);
      // Sync server-authoritative clock times from the move result
      if (
        moveData.whitePlayerLeftTime != null &&
        moveData.blackPlayerLeftTime != null
      ) {
        setServerTimes({
          white: Number(moveData.whitePlayerLeftTime) * 1000,
          black: Number(moveData.blackPlayerLeftTime) * 1000,
        });
      }
      setMovesHistory((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          const m = prev[i]!;
          if (
            m.userId === moveData.userId &&
            m.move.from === moveData.move.from &&
            m.move.to === moveData.move.to
          ) {
            // Replace the optimistic entry with server-confirmed data so
            // timeTakenMs (and any other server fields) are stored.
            const next = [...prev];
            next[i] = moveData;
            return next;
          }
        }
        return [...prev, moveData];
      });
    }

    function handleOpponentMove(moveData: MoveEventData): void {
      setInvalidMove(null);
      // Sync server-authoritative clock times from the opponent move
      if (
        moveData.whitePlayerLeftTime != null &&
        moveData.blackPlayerLeftTime != null
      ) {
        setServerTimes({
          white: Number(moveData.whitePlayerLeftTime) * 1000,
          black: Number(moveData.blackPlayerLeftTime) * 1000,
        });
      }
      setMovesHistory((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.userId === moveData.userId &&
          last.move.from === moveData.move.from &&
          last.move.to === moveData.move.to
        ) {
          return prev;
        }
        return [...prev, moveData];
      });
    }

    // Issue #5: Server rejected the move — remove the last optimistic entry.
    // invalid_move is only sent to the mover, so the last entry is always
    // the one to remove (the opponent can't have moved between the optimistic
    // add and this rejection because it would still have been the user's turn).
    function handleInvalidMove(errorData: InvalidMoveResponse): void {
      setInvalidMove(errorData);
      setMovesHistory((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
    }

    // Opponent offered a draw (or we reconnected and a draw offer is still
    // pending for us via checkDrawOffer) — show the popup. The user must
    // accept or decline; there is no way to dismiss it otherwise.
    function handleDrawRequest(data: OfferDrawSuccessResponse): void {
      console.log(data);
      if (data?.payload)
        setDrawOffer((priv) =>
          priv ? { ...priv, ...data.payload } : data.payload,
        );
    }

    // Either side claimed the draw — fold the result into gameState so the
    // existing GameOverModal (driven by gameState.gameState) picks it up.
    function handleAcceptDraw(data: ClaimDrawSuccessResponse): void {
      setDrawOffer(null);
      setDrawNotice(null);
      setDrawOfferSent(false);
      setGameState((prev) =>
        prev ? { ...prev, gameState: data.game_state, winnerId: null } : prev,
      );
    }

    // Our draw offer was declined — let the offerer know via a banner message.
    function handleDrawDeclined(data: DeclineDrawResponse): void {
      setDrawOfferSent(false);
      setDrawNotice(data.message || "Your draw offer was declined");
    }

    socket.on("draw-request", handleDrawRequest);
    socket.on("accept-draw", handleAcceptDraw);
    socket.on("draw-declined", handleDrawDeclined);
    socket.on("game_state", handleGameState);
    socket.on("active_game_found", handleActiveGameFound);
    socket.on("no_active_game", handleNoActiveGame);
    socket.on("move_history_batch", handleMoveHistoryBatch);
    socket.on("move_result", handleMoveResult);
    socket.on("opponent_move", handleOpponentMove);
    socket.on("invalid_move", handleInvalidMove);
    socket.on("rematch-request", handleRematchRequest);

    return () => {
      socket.off("game_state", handleGameState);
      socket.off("active_game_found", handleActiveGameFound);
      socket.off("no_active_game", handleNoActiveGame);
      socket.off("move_history_batch", handleMoveHistoryBatch);
      socket.off("move_result", handleMoveResult);
      socket.off("opponent_move", handleOpponentMove);
      socket.off("invalid_move", handleInvalidMove);
      socket.off("draw-request", handleDrawRequest);
      socket.off("accept-draw", handleAcceptDraw);
      socket.off("draw-declined", handleDrawDeclined);
      socket.off("rematch-request", handleRematchRequest);
    };
  }, [socket]);

  // Emits join_arena with isInitialCheck:true — server responds with
  // "active_game_found" (resume prompt) or "no_active_game".
  // Returns true if the emit actually fired (socket was ready), false otherwise.
  const joinArena = useCallback(
    (userId: string): boolean => {
      if (!socket) return false;
      setGameState(null);
      setMovesHistory([]);
      setInvalidMove(null);
      setPendingActiveGame(null);
      setIsCheckingActiveGame(true);
      socket.emit("join_arena", { userId, isInitialCheck: true });

      // Safety-net timeout: if the server has not responded within 8 s
      // (network issue, Redis error, etc.) unblock the spinner so the
      // user can still use the lobby / "Find Match" button.
      const timer = setTimeout(() => {
        setIsCheckingActiveGame((prev) => {
          if (prev) {
            console.warn(
              "[joinArena] Timed out waiting for server response — showing lobby",
            );
          }
          return false;
        });
      }, 8000);

      // Prevent the timeout from keeping the process alive if component unmounts.
      void timer;

      return true;
    },
    [socket],
  );

  // Silent background re-sync — emits join_arena WITHOUT clearing existing state.
  // Used for periodic 10s syncs while a game is in progress.
  const syncGameState = useCallback(
    (userId: string): void => {
      if (!socket) return;
      // isInitialCheck omitted → server sends game_state directly (no popup)
      socket.emit("join_arena", userId);
    },
    [socket],
  );

  // User chose to resume the pending game — apply it as the active game state.
  const resumeActiveGame = useCallback((): void => {
    if (!pendingActiveGame) return;
    setGameState(pendingActiveGame);
    if (pendingActiveGame.gameId) {
      const isActive =
        pendingActiveGame.gameState === "IN_PROGRESS" ||
        pendingActiveGame.gameState === "INITIALIZED";
      if (isActive) setActiveGameId(pendingActiveGame.gameId);
    }
    setPendingActiveGame(null);
  }, [pendingActiveGame]);

  // User chose NOT to resume — discard the pending game state.
  // Caller is responsible for emitting leave_game to clean up Redis.
  const dismissActiveGame = useCallback((): void => {
    setPendingActiveGame(null);
  }, []);

  const sendMove = useCallback(
    (gameId: string, userId: string, move: ChessMove): void => {
      if (!socket) return;
      setMovesHistory((prev) => [...prev, { userId, move }]);
      socket.emit("user_move", { gameId, userId, move });
    },
    [socket],
  );

  const resign = useCallback(
    (userId: string, gameId: string): void => {
      if (!socket) return;
      socket.emit("resign", { userId, gameId });
    },
    [socket],
  );

  const abort = useCallback(
    (userId: string, gameId: string): void => {
      if (!socket) return;
      socket.emit("abort_game", { userId, gameId });
    },
    [socket],
  );

  // Emitted when the user explicitly leaves a finished game (New Game / Rematch).
  // Passes the specific gameId so the server only removes the key if it still
  // points to that game — prevents accidentally clobbering a new match assignment.
  const leaveGame = useCallback(
    (userId: string, gameId: string): void => {
      if (!socket) return;
      socket.emit("leave_game", { userId, gameId });
    },
    [socket],
  );

  /* ── Draw flow ────────────────────────────────────────────────────────── */

  // Sends a draw offer to the opponent — only the player to move may offer.
  const offerDraw = useCallback(
    (userId: string, opponentId: string): void => {
      if (!socket) return;
      socket.emit("offer-draw", { userId, opponentId });
      setDrawOfferSent(true);
      setDrawNotice("Draw offer sent — waiting for your opponent to respond");
    },
    [socket],
  );

  // Accepts the pending draw offer shown in the popup. The server confirms
  // via "accept-draw", which closes the popup and surfaces the game-over modal.
  const acceptDraw = useCallback(
    (userId: string): void => {
      if (!socket) return;
      socket.emit("claim-draw", { userId });
    },
    [socket],
  );

  // Declines the pending draw offer. There is no server confirmation routed
  // back to the decliner, so the popup is cleared optimistically.
  const declineDraw = useCallback(
    (userId: string, opponentId: string): void => {
      if (!socket) return;
      socket.emit("decline-draw", { userId, opponentId });
      setDrawOffer(null);
    },
    [socket],
  );

  // Asks the server whether a draw offer is still pending for us — used on
  // reconnect so the popup reappears and the user can't simply refresh away
  // from having to accept/decline it.
  const checkDrawOffer = useCallback(
    (userId: string): void => {
      if (!socket) return;
      socket.emit("check_draw_offer", { userId });
    },
    [socket],
  );

  const clearDrawNotice = useCallback((): void => {
    setDrawNotice(null);
  }, []);

  /* ── Rematch flow ─────────────────────────────────────────────────────── */

  const sendRematchRequest = useCallback(
    (userId: string, opponentId: string): void => {
      if (!socket) return;
      socket.emit("rematch-request", { userId, opponentId });
      setRematchStatus("requesting");
    },
    [socket],
  );

  const acceptRematch = useCallback(
    (userId: string, opponentId: string): void => {
      if (!socket) return;
      socket.emit("accept-rematch", { userId, opponentId });
    },
    [socket],
  );

  const declineRematch = useCallback(
    (userId: string, opponentId: string): void => {
      if (!socket) return;
      socket.emit("decline-rematch-request", { userId, opponentId });
      setRematchStatus("idle");
      setIncomingRematch(null);
    },
    [socket],
  );

  const checkRematchRequest = useCallback(
    (userId: string): void => {
      if (!socket) return;
      socket.emit("check-rematch-request", { userId });
    },
    [socket],
  );

  const clearBoardAnimation = useCallback((): void => {
    setShowBoardAnimation(false);
  }, []);

  return {
    activeGameId,
    gameState,
    movesHistory,
    invalidMove,
    isCheckingActiveGame,
    serverTimes,
    pendingActiveGame,
    joinArena,
    syncGameState,
    resumeActiveGame,
    dismissActiveGame,
    sendMove,
    resign,
    abort,
    leaveGame,
    drawOffer,
    drawNotice,
    drawOfferSent,
    offerDraw,
    acceptDraw,
    declineDraw,
    checkDrawOffer,
    clearDrawNotice,
    rematchStatus,
    incomingRematch,
    sendRematchRequest,
    acceptRematch,
    declineRematch,
    checkRematchRequest,
    showBoardAnimation,
    clearBoardAnimation,
    setGameState,
    setMovesHistory,
    setActiveGameId,
  };
}
