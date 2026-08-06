import axiosInstance from "../axio";

export type GameHistoryResult = "WIN" | "LOSS" | "DRAW" | "ABANDONED";

export interface GameHistoryPlayer {
  id: string | null | undefined;
  username?: string | null;
  profileImageUrl?: string | null;
  rating?: number | null;
  ratingAfter?: number | null;
  ratingDelta: number; // always 0 for unrated (coerced from NULL by the API)
}

export interface GameHistoryAnalysis {
  overall: string;
  whiteWinRate: number;
  blackWinRate: number;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  averageAccuracy?: number | null;
  reviewedAt?: string | null;
}

export interface GameHistoryItem {
  id: string;
  result: GameHistoryResult;
  status: string;
  gameName: string;
  timeControl: string;
  timeSlot: string;
  date: string;
  startedAt?: string | null;
  endedAt?: string | null;
  currentFen: string;
  pgn: string;
  isRated: boolean;
  moveCount: number;
  playerColor: "white" | "black";
  player: GameHistoryPlayer;
  opponent: GameHistoryPlayer;
  whitePlayer: GameHistoryPlayer;
  blackPlayer: GameHistoryPlayer | null;
  analysis?: GameHistoryAnalysis | null;
}

export interface GameHistorySummary {
  totalGames: number;
  winRate: number;
  reviewedGames: number;
  averageAccuracy: number | null;
}

export type HistoryFilter = "all" | "wins" | "losses" | "draws" | "rated";

export interface FilterCounts {
  all: number;
  wins: number;
  losses: number;
  draws: number;
  rated: number;
}

export interface GameHistoryResponse {
  games: GameHistoryItem[];
  summary: GameHistorySummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filterCounts: FilterCounts;
}

export async function getGameHistory(
  page = 1,
  limit = 8,
  filter: HistoryFilter = "all",
): Promise<GameHistoryResponse> {
  const { data } = await axiosInstance.get<GameHistoryResponse>("/games/history", {
    params: { page, limit, filter },
  });
  return data;
}

export async function getUserGameHistory(
  userId: string,
  page = 1,
  limit = 8,
  filter: HistoryFilter = "all",
): Promise<GameHistoryResponse> {
  const { data } = await axiosInstance.get<GameHistoryResponse>(`/users/${userId}/history`, {
    params: { page, limit, filter },
  });
  return data;
}

export interface RatingPoint {
  date: string;
  rating: number;
}

export async function getRatingHistory(): Promise<{ points: RatingPoint[] }> {
  const { data } = await axiosInstance.get<{ points: RatingPoint[] }>("/games/rating-history");
  return data;
}

export interface CategoryRatingHistory {
  BULLET: RatingPoint[];
  BLITZ: RatingPoint[];
  RAPID: RatingPoint[];
}

export async function getRatingHistoryByCategory(): Promise<CategoryRatingHistory> {
  const { data } = await axiosInstance.get<CategoryRatingHistory>("/games/rating-history/by-category");
  return data;
}
