"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { Chess, Square, Move } from "chess.js";
import type { Arrow } from "react-chessboard";
import { useChessTimer } from "@/hooks/useClockTime";
import type {
  GameMovePayload,
  GameRoomState,
  InvalidMoveResponse,
  ServerTimes,
} from "./useSocket/useGameRoom";
import { toSafeFen } from "@/lib/fen";
import type { CapturedPiece } from "../components/chess/CapturedPiecesPanel";
import type { MovePair } from "../components/chess/MoveHistoryPanel";

interface DropArgs {
  sourceSquare: string;
  targetSquare?: string | null;
  piece?: { pieceType?: string };
}

interface UseChessGameInput {
  movesHistory: GameMovePayload[];
  gameState: GameRoomState | null;
  invalidMove: InvalidMoveResponse | null;
  activeGameId: string | null;
  serverTimes: ServerTimes | null;
  sendMove: (
    gameId: string,
    userId: string,
    move: { from: string; to: string; promotion?: string },
  ) => void;
  isWhite: boolean;
  user: { id: string } | null | undefined;
  onTimeout?: () => void;
}

export interface PendingPromotion {
  from: string;
  to: string;
  color: "w" | "b";
}

function isPromotionNeeded(game: Chess, from: string, to: string): boolean {
  const piece = game.get(from as Square);
  if (!piece || piece.type !== "p") return false;
  const rank = to[1];
  return (
    (piece.color === "w" && rank === "8") ||
    (piece.color === "b" && rank === "1")
  );
}

export function pairMoves(moves: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ white: moves[i]!, black: moves[i + 1] });
  }
  return pairs;
}

function pairMovesWithTiming(
  sans: string[],
  movesHistory: GameMovePayload[],
): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < sans.length; i += 2) {
    pairs.push({
      white: sans[i]!,
      whiteTimeTakenMs: movesHistory[i]?.timeTakenMs,
      black: sans[i + 1],
      blackTimeTakenMs: movesHistory[i + 1]?.timeTakenMs,
    });
  }
  return pairs;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (seconds < 20 && seconds > 0) {
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, "0")}:${secs.padStart(4, "0")}`;
  }
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getCapturedPieces(
  movesHistory: GameMovePayload[],
): CapturedPiece[] {
  const replayGame = new Chess();
  const capturedPieces: CapturedPiece[] = [];

  movesHistory.forEach((item) => {
    try {
      const moveResult = replayGame.move({
        from: item.move.from,
        to: item.move.to,
        promotion: item.move.promotion || "q",
      });
      if (moveResult?.captured) {
        capturedPieces.push({
          color: moveResult.color === "w" ? "b" : "w",
          type: moveResult.captured,
        });
      }
    } catch {}
  });

  return capturedPieces;
}

export function useChessGame({
  movesHistory,
  gameState,
  invalidMove,
  activeGameId,
  serverTimes,
  sendMove,
  isWhite,
  user,
  onTimeout,
}: UseChessGameInput) {
  const [game, setGame] = useState<Chess>(new Chess());
  const [fen, setFen] = useState<string>(() => new Chess().fen());
  const [displayedFen, setDisplayedFen] = useState<string>(() =>
    new Chess().fen(),
  );
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState<number>(-1);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<
    Record<string, CSSProperties>
  >({});
  const [hintArrow, setHintArrow] = useState<Arrow[]>([]);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  const moveScrollRef = useRef<HTMLDivElement>(null);
  const prevLastMoveKeyRef = useRef<string>("");
  const prevLastMoveFenRef = useRef<string>("");
  const normalMoveSoundRef = useRef<HTMLAudioElement | null>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);
  const checkSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    normalMoveSoundRef.current = new Audio("/normalMove.mp3");
    captureSoundRef.current = new Audio("/capture.mp3");
    checkSoundRef.current = new Audio("/check.mp3");
  }, []);

  const { displayWhiteTime, displayBlackTime, syncTimeFromOutside } =
    useChessTimer(
      gameState?.time_slot ?? "",
      gameState?.whitePlayerLeftTime.toString() ?? "",
      gameState?.blackPlayerLeftTime.toString() ?? "",
      activeGameId,
      game,
      onTimeout,
      gameState?.leftGameStartTime,
    );
  const movesHistoryRef = useRef(movesHistory);
  const prevMovesLengthRef = useRef(-1);
  useEffect(() => {
    movesHistoryRef.current = movesHistory;
  }, [movesHistory]);

  // Sync board FEN when authoritative game state arrives (join_arena / bg sync).
  useEffect(() => {
    if (gameState) {
      try {
        const fenStr = gameState.currentFen;
        const initialFenStr = gameState.initialFen || fenStr;
        const safeFen = toSafeFen(initialFenStr);
        const newGame =
          !safeFen || safeFen === "startpos" ? new Chess() : new Chess(safeFen);

        // Only set fenStr if we're not immediately going to replay moves,
        // or just rely on the replay loop to set it correctly.
        // Actually, if we have movesHistory, we'll replay it. If we don't,
        // we should show currentFen.
        if (movesHistory.length === 0) {
          const safeCurrentFen = toSafeFen(fenStr);
          if (safeCurrentFen && safeCurrentFen !== "startpos") {
            newGame.load(safeCurrentFen);
          }
        }
        setGame(newGame);
        setFen(newGame.fen());
      } catch {
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
      }
    }
  }, [gameState]);

  // Sync clock whenever the server provides authoritative times — this fires
  // from game_state (initial / bg-sync) and move_result / opponent_move events.
  useEffect(() => {
    if (serverTimes) {
      syncTimeFromOutside(serverTimes.white, serverTimes.black);
    }
  }, [serverTimes]);

  // Replay moves history to build the internal chess.js game log and SANs.
  useEffect(() => {
    const prevLen = prevMovesLengthRef.current;
    prevMovesLengthRef.current = movesHistory.length;

    // Fingerprint the last move so we can detect metadata-only updates
    // (e.g. timeTakenMs added by handleMoveResult) vs. genuine new moves
    // or newly confirmed FENs from the server.
    const lastEntry = movesHistory[movesHistory.length - 1];
    const lastMoveKey = lastEntry
      ? `${lastEntry.move.from}${lastEntry.move.to}`
      : "";
    const lastNewFen = lastEntry?.newFen || "";

    const prevLastKey = prevLastMoveKeyRef.current;
    const prevLastFen = prevLastMoveFenRef.current;

    prevLastMoveKeyRef.current = lastMoveKey;
    prevLastMoveFenRef.current = lastNewFen;

    if (
      movesHistory.length === prevLen &&
      lastMoveKey === prevLastKey &&
      lastNewFen === prevLastFen
    ) {
      // Only metadata changed (timeTakenMs populated) — no board update needed.
      return;
    }

    const initialFenStr = gameState?.initialFen || "startpos";
    const safeInitialFen = toSafeFen(initialFenStr);
    const replayGame =
      !safeInitialFen || safeInitialFen === "startpos"
        ? new Chess()
        : new Chess(safeInitialFen);
    const sans: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastMoveResult: any = null;
    let currentFen = replayGame.fen();

    movesHistory.forEach((item) => {
      try {
        const moveResult = replayGame.move({
          from: item.move.from,
          to: item.move.to,
          promotion: item.move.promotion || "q",
        });
        if (moveResult) {
          sans.push(moveResult.san);
          lastMoveResult = moveResult;
        } else {
          sans.push(`${item.move.from}-${item.move.to}`);
        }
      } catch (err) {
        sans.push(`${item.move.from}-${item.move.to}`);
        // If move fails (e.g. Chess960 castling), we'll rely on newFen to fix the state
      }

      if (item.newFen) {
        currentFen = toSafeFen(item.newFen) || currentFen;
        try {
          replayGame.load(currentFen);
        } catch {}
      } else {
        currentFen = replayGame.fen();
      }
    });

    setGame(replayGame);
    setFen(currentFen);
    setMoveHistory(sans);

    if (movesHistory.length > prevLen && prevLen >= 0) {
      if (replayGame.inCheck()) {
        checkSoundRef.current?.play().catch(() => {});
      } else if (lastMoveResult?.captured) {
        captureSoundRef.current?.play().catch(() => {});
      } else {
        normalMoveSoundRef.current?.play().catch(() => {});
      }
    }

    setCurrentMoveIdx((prev) => {
      // New moves arrived or initial load → advance viewer to latest.
      if (movesHistory.length > prevLen || prevLen < 0) {
        return movesHistory.length - 1;
      }
      // Background sync with same move count → keep user's history position.
      return Math.min(prev, movesHistory.length - 1);
    });
  }, [movesHistory]);

  // Re-calculate the displayed FEN when the user navigates history.
  // NOTE: movesHistory is intentionally omitted from deps — it is read inside
  // the effect but should NOT be a trigger. Adding it causes the effect to fire
  // while currentMoveIdx is still catching up to the new length, which briefly
  // replays to the old index and produces a "back and forth" board animation.
  // The movesHistory effect already advances currentMoveIdx; this effect only
  // needs to fire once currentMoveIdx and fen have both settled.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentMoveIdx === -1) {
      const initialFenStr = gameState?.initialFen || "startpos";
      const safeInitialFen = toSafeFen(initialFenStr);
      setDisplayedFen(
        !safeInitialFen || safeInitialFen === "startpos"
          ? new Chess().fen()
          : new Chess(safeInitialFen).fen(),
      );
    } else if (currentMoveIdx >= 0 && currentMoveIdx < movesHistory.length) {
      const initialFenStr = gameState?.initialFen || "startpos";
      const safeInitialFen = toSafeFen(initialFenStr);
      const replayGame =
        !safeInitialFen || safeInitialFen === "startpos"
          ? new Chess()
          : new Chess(safeInitialFen);
      let currentFen = replayGame.fen();

      for (let i = 0; i <= currentMoveIdx; i++) {
        const item = movesHistory[i];
        if (item) {
          try {
            replayGame.move({
              from: item.move.from,
              to: item.move.to,
              promotion: item.move.promotion || "q",
            });
          } catch {
            // Ignore failure during history inspection.
          }
          if (item.newFen) {
            currentFen = toSafeFen(item.newFen) || currentFen;
            try {
              replayGame.load(currentFen);
            } catch {}
          } else {
            currentFen = replayGame.fen();
          }
        }
      }
      setDisplayedFen(currentFen);
    } else {
      setDisplayedFen(fen);
    }
  }, [currentMoveIdx, fen]);

  // Auto-scroll move table when new moves are added.
  useEffect(() => {
    if (moveScrollRef.current) {
      moveScrollRef.current.scrollTop = moveScrollRef.current.scrollHeight;
    }
  }, [moveHistory]);

  useEffect(() => {
    if (invalidMove) {
      setMoveFrom(null);
      setOptionSquares({});
      const replayGame = new Chess();
      movesHistoryRef.current.forEach((item) => {
        try {
          replayGame.move({
            from: item.move.from,
            to: item.move.to,
            promotion: item.move.promotion ?? "q",
          });
        } catch {
          // ignore malformed history entries
        }
      });
      setGame(replayGame);
      setFen(replayGame.fen());
      setDisplayedFen(replayGame.fen());
    }
  }, [invalidMove]);

  const getMoveOptions = useCallback(
    (square: string): boolean => {
      const moves = game.moves({
        square: square as Square,
        verbose: true,
      }) as Move[];
      if (moves.length === 0) {
        setOptionSquares({});
        return false;
      }

      const newSquares: Record<string, CSSProperties> = {};
      moves.forEach((move) => {
        const toPiece = game.get(move.to);
        const fromPiece = game.get(square as Square);
        const hasOpponentPiece =
          toPiece && fromPiece && toPiece.color !== fromPiece.color;
        newSquares[move.to] = {
          background: hasOpponentPiece
            ? "radial-gradient(circle, transparent 55%, rgba(59,130,246,0.55) 55%, rgba(59,130,246,0.55) 75%, transparent 75%)"
            : "radial-gradient(circle, rgba(59,130,246,0.5) 22%, transparent 22%)",
          borderRadius: "0",
        };
      });
      newSquares[square] = { background: "rgba(59, 130, 246, 0.3)" };
      setOptionSquares(newSquares);
      return true;
    },
    [game],
  );

  const getHintMove = useCallback((): Move | null => {
    const legalMoves = game.moves({ verbose: true }) as Move[];
    if (legalMoves.length === 0) return null;

    const pieceValue: Record<string, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    // 1. Best capture
    const captures = legalMoves
      .filter((m) => m.captured)
      .sort(
        (a, b) =>
          (pieceValue[b.captured ?? ""] ?? 0) -
          (pieceValue[a.captured ?? ""] ?? 0),
      );
    if (captures.length > 0) return captures[0]!;

    // 2. Checks
    const checks = legalMoves.filter((m) => m.san.includes("+"));
    if (checks.length > 0) return checks[0]!;

    // 3. Centre / development squares
    const centerMoves = legalMoves.filter((m) =>
      ["e4", "d4", "e5", "d5", "f3", "c3", "f6", "c6"].includes(m.to),
    );
    if (centerMoves.length > 0) return centerMoves[0]!;

    return legalMoves[0]!;
  }, [game]);

  const handleShowHint = useCallback(() => {
    const hint = getHintMove();
    if (!hint) return;
    setHintArrow([
      {
        startSquare: hint.from,
        endSquare: hint.to,
        color: "rgba(34, 197, 94, 0.85)",
      },
    ]);
  }, [getHintMove]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const isLatestMove = currentMoveIdx === movesHistory.length - 1;
  const gameHasStarted =
    !gameState?.leftGameStartTime || Date.now() >= gameState.leftGameStartTime;

  const isUserTurn =
    activeGameId !== null &&
    pendingPromotion === null &&
    isLatestMove &&
    gameHasStarted &&
    ((game.turn() === "w" && isWhite) || (game.turn() === "b" && !isWhite));

  const lastMoveArrow: Arrow[] = (() => {
    if (currentMoveIdx < 0 || currentMoveIdx >= movesHistory.length) return [];
    const mv = movesHistory[currentMoveIdx]?.move;
    if (!mv) return [];
    return [
      {
        startSquare: mv.from,
        endSquare: mv.to,
        color: "rgba(59, 130, 246, 0.65)",
      },
    ];
  })();

  const boardArrows: Arrow[] = hintArrow.length > 0 ? hintArrow : lastMoveArrow;

  // ── Event handlers ──────────────────────────────────────────────────────────

  const handleSquareClick = useCallback(
    (square: string): void => {
      if (!activeGameId || !user || !isUserTurn) return;
      setHintArrow([]);

      if (moveFrom === null) {
        const hasOptions = getMoveOptions(square);
        if (hasOptions) setMoveFrom(square);
        return;
      }

      const testGame = new Chess(game.fen());

      let localMoveSucceeded = false;
      try {
        if (isPromotionNeeded(game, moveFrom, square)) {
          // Check if promotion is legal locally (might throw if illegal)
          // We only do this if it's a normal move. If it's chess960, maybe it throws?
          // Actually, promotion in chess960 is same as standard.
          const checkGame = new Chess(game.fen());
          checkGame.move({ from: moveFrom, to: square, promotion: "q" });
          setPendingPromotion({
            from: moveFrom,
            to: square,
            color: game.get(moveFrom as Square)!.color,
          });
          setMoveFrom(null);
          setOptionSquares({});
          return;
        }

        const moveResult = testGame.move({
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        if (moveResult) {
          setGame(testGame);
          setDisplayedFen(testGame.fen());
          localMoveSucceeded = true;
        }
      } catch {
        // Local validation failed.
      }

      const isCastlingAttempt = (() => {
        if (gameState?.gameMode !== "chess960") return false;
        const fromPiece = game.get(moveFrom as Square);
        const toPiece = game.get(square as Square);
        return (
          fromPiece?.type === "k" &&
          toPiece?.type === "r" &&
          fromPiece.color === toPiece.color
        );
      })();

      // If it succeeded, or if it's chess960 castling (which fails locally), send to server.
      if (localMoveSucceeded || isCastlingAttempt) {
        sendMove(activeGameId, user.id, {
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        setMoveFrom(null);
        setOptionSquares({});
        return;
      }

      // If we got here, it's an illegal standard move.
      const hasOptions = getMoveOptions(square);
      if (hasOptions) setMoveFrom(square);
      else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    },
    [activeGameId, user, isUserTurn, game, moveFrom, getMoveOptions, sendMove],
  );

  const handlePieceDragBegin = useCallback(
    ({
      square: sourceSquare,
    }: {
      isSparePiece: boolean;
      piece: { pieceType: string };
      square: string | null;
    }): void => {
      if (!isUserTurn || !sourceSquare) return;
      setHintArrow([]);
      getMoveOptions(sourceSquare);
    },
    [isUserTurn, getMoveOptions],
  );

  const canDragPiece = useCallback(
    ({
      piece,
    }: {
      isSparePiece: boolean;
      piece: { pieceType: string };
      square: string | null;
    }) => {
      // Allow only the player's own pieces to be dragged
      const pieceColor = piece.pieceType[0];
      const myColor = isWhite ? "w" : "b";
      if (pieceColor !== myColor) return false;

      // In Chess960, if it is not the user's turn, do not allow dragging the King or Rook
      // to prevent castling premove glitches.
      if (!isUserTurn && gameState?.gameMode === "chess960") {
        const type = piece.pieceType[1]?.toLowerCase();
        if (type === "k" || type === "r") {
          return false;
        }
      }

      return true;
    },
    [isUserTurn, gameState?.gameMode, isWhite],
  );

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: DropArgs): boolean => {
      if (!activeGameId || !user || !targetSquare || !isUserTurn) {
        setOptionSquares({});
        setMoveFrom(null);
        return false;
      }

      const promotion = piece?.pieceType?.[1]?.toLowerCase() ?? "q";

      if (isPromotionNeeded(game, sourceSquare, targetSquare)) {
        try {
          const checkGame = new Chess(game.fen());
          checkGame.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          });
          setPendingPromotion({
            from: sourceSquare,
            to: targetSquare,
            color: game.get(sourceSquare as Square)!.color,
          });
        } catch {
          // Not a legal move — ignore.
        }
        setOptionSquares({});
        setMoveFrom(null);
        return false; // snap piece back; picker will overlay
      }

      const testGame = new Chess(game.fen());
      let localMoveSucceeded = false;
      try {
        const moveResult = testGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });
        if (moveResult) {
          setGame(testGame);
          setDisplayedFen(testGame.fen());
          localMoveSucceeded = true;
        }
      } catch {
        // Move not valid locally
      }

      const isCastlingAttempt = (() => {
        if (gameState?.gameMode !== "chess960") return false;
        const fromPiece = game.get(sourceSquare as Square);
        const toPiece = game.get(targetSquare as Square);
        return (
          fromPiece?.type === "k" &&
          toPiece?.type === "r" &&
          fromPiece.color === toPiece.color
        );
      })();

      // If it succeeded, or if it's chess960 castling (which fails locally), send to server.
      if (localMoveSucceeded || isCastlingAttempt) {
        sendMove(activeGameId, user.id, {
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });
        setOptionSquares({});
        setMoveFrom(null);
        return true;
      }

      setOptionSquares({});
      setMoveFrom(null);
      return false;
    },
    [activeGameId, user, isUserTurn, game, sendMove],
  );

  // ── Promotion handlers ──────────────────────────────────────────────────────

  const handlePromotionSelect = useCallback(
    (piece: string) => {
      if (!pendingPromotion || !activeGameId || !user) return;
      const { from, to } = pendingPromotion;
      const testGame = new Chess(game.fen());
      try {
        const moveResult = testGame.move({ from, to, promotion: piece });
        if (moveResult) {
          setGame(testGame);
          setDisplayedFen(testGame.fen());
          sendMove(activeGameId, user.id, { from, to, promotion: piece });
        }
      } catch {
        // ignore invalid promotion
      }
      setPendingPromotion(null);
    },
    [pendingPromotion, activeGameId, user, game, sendMove],
  );

  const handleCancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setMoveFrom(null);
    setOptionSquares({});
  }, []);

  // ── History navigation ──────────────────────────────────────────────────────

  const resetInspection = () => setHintArrow([]);

  const handleFirstMove = () => {
    setCurrentMoveIdx(-1);
    resetInspection();
  };
  const handlePreviousMove = () => {
    setCurrentMoveIdx((prev) => Math.max(-1, prev - 1));
    resetInspection();
  };
  const handleNextMove = () => {
    setCurrentMoveIdx((prev) => Math.min(moveHistory.length - 1, prev + 1));
    resetInspection();
  };
  const handleLastMove = () => {
    setCurrentMoveIdx(moveHistory.length - 1);
    resetInspection();
  };
  const handleSelectMove = (index: number) => {
    setCurrentMoveIdx(index);
    resetInspection();
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const pairs = pairMovesWithTiming(moveHistory, movesHistory);
  const capturedPieces = getCapturedPieces(movesHistory);

  return {
    game,
    displayedFen,
    moveHistory,
    currentMoveIdx,
    moveScrollRef,
    optionSquares,
    boardArrows,
    displayWhiteTime,
    displayBlackTime,
    isUserTurn,
    pairs,
    capturedPieces,
    pendingPromotion,
    handleSquareClick,
    handlePieceDragBegin,
    handleDrop,
    handleShowHint,
    handlePromotionSelect,
    handleCancelPromotion,
    handleFirstMove,
    handlePreviousMove,
    handleNextMove,
    handleLastMove,
    handleSelectMove,
    canDragPiece,
  };
}
