import axiosInstance from "../axio";
import type { UserSearchResult } from "./users";

export interface FriendListItem {
  id: string;
  friendsSince: string;
  user: UserSearchResult;
}

export interface FriendRequestItem {
  id: string;
  createdAt: string;
  user: UserSearchResult;
}

export async function getFriends(): Promise<FriendListItem[]> {
  const { data } = await axiosInstance.get<{ friends: FriendListItem[] }>("/friends");
  return data.friends;
}

export async function getIncomingFriendRequests(): Promise<FriendRequestItem[]> {
  const { data } = await axiosInstance.get<{ requests: FriendRequestItem[] }>("/friends/requests/incoming");
  return data.requests;
}

export async function getOutgoingFriendRequests(): Promise<FriendRequestItem[]> {
  const { data } = await axiosInstance.get<{ requests: FriendRequestItem[] }>("/friends/requests/outgoing");
  return data.requests;
}

export async function sendFriendRequest(recipientId: string): Promise<void> {
  await axiosInstance.post("/friends/requests", { recipientId });
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await axiosInstance.post(`/friends/requests/${requestId}/accept`);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await axiosInstance.post(`/friends/requests/${requestId}/reject`);
}
