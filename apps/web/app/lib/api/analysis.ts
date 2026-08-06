import axiosInstance from "../axio";
import type { GameHistoryAnalysis } from "./games";

export interface GameDetail {
  id: string;
  pgn: string;
  currentFen: string;
  initialFen: string;
  timeControl: string;
  gameName: string;
  isRated: boolean;
  status: string;
  result: "WIN" | "LOSS" | "DRAW" | "ABANDONED";
  playerColor: "white" | "black";
  gameMode: "standard" | "chess960" | string;
  moveCount: number;
  startedAt: string | null;
  endedAt: string | null;
  whitePlayer: {
    id: string;
    username: string | null;
    profileImageUrl: string | null;
    rating: number | null;
    ratingAfter: number | null;
  };
  blackPlayer: {
    id: string;
    username: string | null;
    profileImageUrl: string | null;
    rating: number | null;
    ratingAfter: number | null;
  } | null;
  analysis: GameHistoryAnalysis | null;
}

export async function getGameDetail(gameId: string): Promise<GameDetail> {
  const { data } = await axiosInstance.get<GameDetail>(`/games/${gameId}`);
  return data;
}

export async function saveAnalysis(
  gameId: string,
  whiteAccuracy: number,
  blackAccuracy: number
): Promise<void> {
  await axiosInstance.post(`/games/${gameId}/analysis`, { whiteAccuracy, blackAccuracy });
}
