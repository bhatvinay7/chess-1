import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile } from "../app/lib/api/profile";
import { UpdateProfileRequest, UserProfile } from "../types/profile";

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId as string),
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateProfileRequest;
    }) => updateProfile(userId, data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(["profile", updatedProfile.id], updatedProfile);
      queryClient.invalidateQueries({
        queryKey: ["profile", updatedProfile.id],
      });
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (user.id === updatedProfile.id) {
            localStorage.setItem(
              "user",
              JSON.stringify({ ...user, ...updatedProfile }),
            );
          }
        } catch {
          /* ignore */
        }
      }
    },
  });
};
