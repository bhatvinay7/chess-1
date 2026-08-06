"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import { useSocket } from "./useSocket/socketConnection";
import type { GameRoomState } from "./useSocket/useGameRoom";
import { toSafeFen } from "@/lib/fen";
import type { MovePair } from "../components/chess/MoveHistoryPanel";

export interface SpectateServerTimes {
  white: number; // ms
  black: number; // ms
}

interface SpectateMoveLive {
  gameId:              string;
  userId:              string;
  move:                { from: string; to: string; promotion?: string };
  newFen:              string;
  gameStatus:          string;
  blackPlayerLeftTime: number;
  whitePlayerLeftTime: number;
  timeTakenMs:         number;
  increment:           number;
}

export function useSpectateGame(gameId: string) {
  const { socket } = useSocket();

  const [spectateState,  setSpectateState]  = useState<GameRoomState | null>(null);
  const [movePairs,      setMovePairs]      = useState<MovePair[]>([]);
  const [moveCount,      setMoveCount]      = useState(0);
  const [serverTimes,    setServerTimes]    = useState<SpectateServerTimes | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [connected,      setConnected]      = useState(false);

  // Running chess instance drives SAN computation for live moves
  const gameRef = useRef(new Chess());

  const applyServerState = useCallback((state: GameRoomState) => {
    setSpectateState(state);
    setServerTimes({
      white: Number(state.whitePlayerLeftTime) * 1000,
      black: Number(state.blackPlayerLeftTime) * 1000,
    });
    try {
      if (state.currentFen) gameRef.current = new Chess(toSafeFen(state.currentFen));
    } catch { /* invalid fen — keep previous */ }
  }, []);

  useEffect(() => {
    if (!socket || !gameId) return;

    function onSpectateGameState(state: GameRoomState) {
      applyServerState(state);
      setConnected(true);
      // Reset move history when we get a fresh game state
      setMovePairs([]);
      setMoveCount(0);
    }

    function onSpectateMove(data: SpectateMoveLive) {
      setSpectateState((prev) =>
        prev
          ? {
              ...prev,
              currentFen:          data.newFen,
              gameState:           data.gameStatus,
              blackPlayerLeftTime: data.blackPlayerLeftTime,
              whitePlayerLeftTime: data.whitePlayerLeftTime,
            }
          : prev,
      );

      setServerTimes({
        white: data.whitePlayerLeftTime * 1000,
        black: data.blackPlayerLeftTime * 1000,
      });

      // Compute SAN by applying the move to the running instance
      let san = `${data.move.from}-${data.move.to}`;
      try {
        const result = gameRef.current.move({
          from:      data.move.from,
          to:        data.move.to,
          promotion: data.move.promotion || undefined,
        });
        if (result) san = result.san;
      } catch { /* illegal move in local state — use coordinate fallback */ }

      const isWhiteMove = gameRef.current.turn() === "b"; // after the move, turn flipped

      setMovePairs((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (isWhiteMove || !last || last.black !== undefined) {
          // Start a new pair
          next.push({ white: san, whiteTimeTakenMs: data.timeTakenMs });
        } else {
          // Complete the current pair with black's move
          next[next.length - 1] = { ...last, black: san, blackTimeTakenMs: data.timeTakenMs };
        }
        return next;
      });

      setMoveCount((c) => c + 1);
    }

    function onSpectatorCount(count: number) {
      setSpectatorCount(count);
    }

    socket.on("spectate_game_state", onSpectateGameState);
    socket.on("spectate_move",       onSpectateMove);
    socket.on("spectator_count",     onSpectatorCount);

    socket.emit("watch_game", { gameId });

    return () => {
      socket.emit("leave_spectate", { gameId });
      socket.off("spectate_game_state", onSpectateGameState);
      socket.off("spectate_move",       onSpectateMove);
      socket.off("spectator_count",     onSpectatorCount);
    };
  }, [socket, gameId, applyServerState]);

  return {
    spectateState,
    movePairs,
    moveCount,
    serverTimes,
    spectatorCount,
    connected,
    gameRef,
  };
}
