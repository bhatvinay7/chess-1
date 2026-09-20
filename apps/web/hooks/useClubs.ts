import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../app/lib/api/clubs";

export const useClubList = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) =>
  useQuery({
    queryKey: ["clubs", params],
    queryFn: () => api.listClubs(params),
  });

export const useClub = (clubId: string | undefined) =>
  useQuery({
    queryKey: ["club", clubId],
    queryFn: () => api.getClub(clubId as string),
    enabled: !!clubId,
  });

export const useCreateClub = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createClub,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clubs"] }),
  });
};

export const useUpdateClub = (clubId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name?: string;
      description?: string;
      imageUrl?: string;
      requesterId: string;
    }) => api.updateClub(clubId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club", clubId] });
      qc.invalidateQueries({ queryKey: ["clubs"] });
    },
  });
};

export const useRequestJoinClub = (clubId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.requestJoinClub(clubId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club", clubId] }),
  });
};

export const useJoinRequests = (clubId: string, adminId: string | undefined) =>
  useQuery({
    queryKey: ["club-requests", clubId],
    queryFn: () => api.getJoinRequests(clubId, adminId as string),
    enabled: !!adminId,
  });

export const useHandleJoinRequest = (clubId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      adminId,
    }: {
      requestId: string;
      action: "accept" | "reject";
      adminId: string;
    }) => api.handleJoinRequest(clubId, requestId, action, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-requests", clubId] });
      qc.invalidateQueries({ queryKey: ["club", clubId] });
    },
  });
};

export const useRemoveMember = (clubId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, adminId }: { userId: string; adminId: string }) =>
      api.removeMember(clubId, userId, adminId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club", clubId] }),
  });
};

export const useSendCoordinatorInvite = (clubId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invitedUserId,
      invitedById,
    }: {
      invitedUserId: string;
      invitedById: string;
    }) => api.sendCoordinatorInvite(clubId, invitedUserId, invitedById),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["club", clubId] }),
  });
};
