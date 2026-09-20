import { useQuery } from "@tanstack/react-query";
import {
  getGameHistory,
  getRatingHistory,
  getRatingHistoryByCategory,
  getUserGameHistory,
  type HistoryFilter,
} from "../app/lib/api/games";

export const useGameHistory = (
  page: number,
  limit = 8,
  filter: HistoryFilter = "all",
) => {
  return useQuery({
    queryKey: ["game-history", page, limit, filter],
    queryFn: () => getGameHistory(page, limit, filter),
    placeholderData: (prev) => prev,
  });
};

export const useUserGameHistory = (
  userId: string | undefined,
  page: number,
  limit = 8,
  filter: HistoryFilter = "all",
) => {
  return useQuery({
    queryKey: ["user-game-history", userId, page, limit, filter],
    queryFn: () => getUserGameHistory(userId as string, page, limit, filter),
    enabled: !!userId,
    placeholderData: (prev) => prev,
  });
};

export const useRatingHistory = () => {
  return useQuery({
    queryKey: ["rating-history"],
    queryFn: getRatingHistory,
  });
};

export const useRatingHistoryByCategory = () => {
  return useQuery({
    queryKey: ["rating-history-by-category"],
    queryFn: getRatingHistoryByCategory,
  });
};
