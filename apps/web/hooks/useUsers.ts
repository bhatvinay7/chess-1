import { useQuery } from "@tanstack/react-query";
import { getPublicUserProfile, searchUsers } from "../app/lib/api/users";

export const usePublicUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["public-user-profile", userId],
    queryFn: () => getPublicUserProfile(userId as string),
    enabled: !!userId,
  });
};

export const useUserSearch = (query: string) => {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["user-search", trimmed],
    queryFn: () => searchUsers(trimmed),
    enabled: trimmed.length >= 2,
  });
};
