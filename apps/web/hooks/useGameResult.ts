"use client";

import { useMemo } from "react";
import type { Chess } from "chess.js";
import type { GameRoomState } from "./useSocket/useGameRoom";

const SERVER_GAME_OVER_STATES = new Set(["GAME_OVER", "CHECKMATE", "DRAW", "STALEMATE", "TIMEOUT", "RESIGN"]);

interface GameResultInput {
  game: Chess;
  gameState: GameRoomState | null;
  isWhite: boolean;
  myRating: number;
  opponentRating: number;
  userId?: string | null;
}

export interface GameResult {
  isGameOver: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  /** true = local player won, false = lost, null = draw */
  didLocalPlayerWin: boolean | null;
  winnerColor: "w" | "b" | null;
  resultLabel: string;
  outcomeLabel: string;
  /** Estimated ELO delta for the local player. null when unrated. */
  ratingDelta: number | null;
  isRated: boolean;
  timeSlot: string;
}

export function useGameResult({
  game,
  gameState,
  isWhite,
  myRating,
  opponentRating,
  userId,
}: GameResultInput): GameResult {
  return useMemo(() => {
    const chessGameOver = game.isGameOver();
    const isCheckmate = game.isCheckmate();
    const chessIsDraw = game.isDraw();

    // Server-reported game over covers timeouts and other server-resolved endings.
    const serverGameOver =
      !!gameState?.gameState && SERVER_GAME_OVER_STATES.has(gameState.gameState);
    const isGameOver = chessGameOver || serverGameOver;

    // Winner determination: prefer chess.js (checkmate), fall back to server winnerId (timeout).
    let winnerColor: "w" | "b" | null = null;
    let didLocalPlayerWin: boolean | null = null;
    let isDraw = chessIsDraw;

    if (isCheckmate) {
      winnerColor = game.turn() === "w" ? "b" : "w";
      const localColor: "w" | "b" = isWhite ? "w" : "b";
      didLocalPlayerWin = winnerColor === localColor;
    } else if (serverGameOver && gameState?.winnerId) {
      // Timeout or server-resolved win: compare winnerId against current user.
      didLocalPlayerWin = gameState.winnerId === userId ? true : false;
    } else if (serverGameOver && !gameState?.winnerId) {
      // Server ended with no winner → draw.
      isDraw = true;
      didLocalPlayerWin = null;
    } else if (chessIsDraw) {
      didLocalPlayerWin = null;
    }

    let resultLabel = "Game Over";
    if (isCheckmate) resultLabel = "Checkmate";
    else if (game.isStalemate()) resultLabel = "Stalemate";
    else if (game.isInsufficientMaterial()) resultLabel = "Insufficient Material";
    else if (game.isThreefoldRepetition()) resultLabel = "Threefold Repetition";
    else if (chessIsDraw) resultLabel = "Draw";
    else if (serverGameOver && gameState?.gameState === "RESIGN") resultLabel = "Resignation";
    else if (serverGameOver && gameState?.winnerId) resultLabel = "Timeout";
    else if (serverGameOver) resultLabel = "Draw";

    const outcomeLabel =
      didLocalPlayerWin === null
        ? "Draw!"
        : didLocalPlayerWin
          ? "You Won!"
          : "You Lost";

    let ratingDelta: number | null = null;
    if (gameState?.isRated) {
      const K = 20;
      const safe_my = myRating || 1500;
      const safe_opp = opponentRating || 1500;
      const expected = 1 / (1 + Math.pow(10, (safe_opp - safe_my) / 400));
      const actual =
        didLocalPlayerWin === null ? 0.5 : didLocalPlayerWin ? 1 : 0;
      ratingDelta = Math.round(K * (actual - expected));
    }

    return {
      isGameOver,
      isCheckmate,
      isDraw,
      didLocalPlayerWin,
      winnerColor,
      resultLabel,
      outcomeLabel,
      ratingDelta,
      isRated: gameState?.isRated ?? false,
      timeSlot: gameState?.time_slot ?? "",
    };
  }, [game, gameState?.gameState, gameState?.winnerId, gameState?.isRated, gameState?.time_slot, isWhite, myRating, opponentRating, userId]);
}
