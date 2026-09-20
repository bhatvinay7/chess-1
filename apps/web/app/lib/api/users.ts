import axiosInstance from "../axio";
import type { UserProfile } from "../../../types/profile";

export type FriendshipStatus =
  | "SELF"
  | "NONE"
  | "FRIENDS"
  | "OUTGOING_REQUEST"
  | "INCOMING_REQUEST"
  | "REJECTED"
  | "BLOCKED";

export interface PublicUserProfile extends Omit<UserProfile, "email"> {
  friendshipStatus: FriendshipStatus;
}

export interface UserSearchResult extends Omit<UserProfile, "email"> {
  friendshipStatus?: FriendshipStatus;
}

export async function getPublicUserProfile(
  userId: string,
): Promise<PublicUserProfile> {
  const { data } = await axiosInstance.get<PublicUserProfile>(
    `/users/${userId}/profile`,
  );
  return data;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const { data } = await axiosInstance.get<{ users: UserSearchResult[] }>(
    "/users/search",
    {
      params: { query },
    },
  );
  return data.users;
}
