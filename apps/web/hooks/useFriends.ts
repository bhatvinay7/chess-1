import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  rejectFriendRequest,
  sendFriendRequest,
} from "../app/lib/api/friends";

function useInvalidateFriends() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["incoming-friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["outgoing-friend-requests"] });
    queryClient.invalidateQueries({ queryKey: ["public-user-profile"] });
    queryClient.invalidateQueries({ queryKey: ["user-search"] });
  };
}

export const useFriends = () => {
  return useQuery({
    queryKey: ["friends"],
    queryFn: getFriends,
  });
};

export const useIncomingFriendRequests = () => {
  return useQuery({
    queryKey: ["incoming-friend-requests"],
    queryFn: getIncomingFriendRequests,
  });
};

export const useOutgoingFriendRequests = () => {
  return useQuery({
    queryKey: ["outgoing-friend-requests"],
    queryFn: getOutgoingFriendRequests,
  });
};

export const useSendFriendRequest = () => {
  const invalidateFriends = useInvalidateFriends();

  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: invalidateFriends,
  });
};

export const useAcceptFriendRequest = () => {
  const invalidateFriends = useInvalidateFriends();

  return useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: invalidateFriends,
  });
};

export const useRejectFriendRequest = () => {
  const invalidateFriends = useInvalidateFriends();

  return useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: invalidateFriends,
  });
};
