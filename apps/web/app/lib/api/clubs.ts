import axiosInstance from "../axio";
import type {
  Club,
  ClubListResponse,
  ClubJoinRequest,
} from "../../../types/club";
import type { ClubSummary } from "../../../components/tournament/types";
import type { TournamentsResponse } from "./tournaments";

export const listClubs = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ClubListResponse> => {
  const { data } = await axiosInstance.get("/clubs", { params });
  return data;
};

export const getClub = async (clubId: string): Promise<Club> => {
  const { data } = await axiosInstance.get(`/clubs/${clubId}`);
  return data;
};

export const createClub = async (payload: {
  name: string;
  description?: string;
  imageUrl?: string;
  creatorId: string;
}): Promise<Club> => {
  const { data } = await axiosInstance.post("/clubs", payload);
  return data;
};

export const updateClub = async (
  clubId: string,
  payload: {
    name?: string;
    description?: string;
    imageUrl?: string;
    requesterId: string;
  },
): Promise<Club> => {
  const { data } = await axiosInstance.put(`/clubs/${clubId}`, payload);
  return data;
};

export const requestJoinClub = async (
  clubId: string,
  userId: string,
): Promise<void> => {
  await axiosInstance.post(`/clubs/${clubId}/join`, { userId });
};

export const getJoinRequests = async (
  clubId: string,
  adminId: string,
): Promise<ClubJoinRequest[]> => {
  const { data } = await axiosInstance.get(`/clubs/${clubId}/requests`, {
    params: { adminId },
  });
  return data;
};

export const handleJoinRequest = async (
  clubId: string,
  requestId: string,
  action: "accept" | "reject",
  adminId: string,
): Promise<void> => {
  await axiosInstance.patch(`/clubs/${clubId}/requests/${requestId}`, {
    action,
    adminId,
  });
};

export const removeMember = async (
  clubId: string,
  userId: string,
  adminId: string,
): Promise<void> => {
  await axiosInstance.delete(`/clubs/${clubId}/members/${userId}`, {
    data: { adminId },
  });
};

export const sendCoordinatorInvite = async (
  clubId: string,
  invitedUserId: string,
  invitedById: string,
): Promise<void> => {
  await axiosInstance.post(`/clubs/${clubId}/coordinator-invite`, {
    invitedUserId,
    invitedById,
  });
};

export const getMyAdminClubs = async (): Promise<ClubSummary[]> => {
  const { data } = await axiosInstance.get("/clubs/mine");
  return data;
};

export const handleCoordinatorInvite = async (
  clubId: string,
  inviteId: string,
  action: "accept" | "reject",
  userId: string,
): Promise<void> => {
  await axiosInstance.patch(`/clubs/${clubId}/coordinator-invite/${inviteId}`, {
    action,
    userId,
  });
};

export const getClubTournaments = async (
  clubId: string,
): Promise<TournamentsResponse> => {
  const { data } = await axiosInstance.get(`/clubs/${clubId}/tournaments`);
  return data;
};
