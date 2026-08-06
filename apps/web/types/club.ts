export type ClubRole = "ADMIN" | "COORDINATOR" | "MEMBER";
export type ClubRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type FriendshipStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";

export interface ClubMemberUser {
  id: string;
  username: string;
  profileImageUrl: string | null;
  rating: number;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: ClubRole;
  joinedAt: string;
  user: ClubMemberUser;
}

export interface ClubCount {
  members: number;
  tournaments: number;
}

export interface Club {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  creatorId: string;
  creator: { id: string; username: string; profileImageUrl: string | null };
  members: ClubMember[];
  _count: ClubCount;
  createdAt: string;
  updatedAt: string;
}

export interface ClubListItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  creatorId: string;
  creator: { id: string; username: string };
  _count: ClubCount;
  createdAt: string;
}

export interface ClubListResponse {
  clubs: ClubListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ClubJoinRequest {
  id: string;
  clubId: string;
  userId: string;
  status: ClubRequestStatus;
  createdAt: string;
  user: ClubMemberUser;
}

export interface FriendUser {
  id: string;
  username: string;
  profileImageUrl: string | null;
  rating: number;
}

export interface FriendEntry {
  friendshipId: string;
  friend: FriendUser;
  since: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  recipientId: string;
  status: FriendshipStatus;
  createdAt: string;
  requester?: FriendUser;
  recipient?: FriendUser;
}

export interface PendingRequests {
  incoming: Friendship[];
  outgoing: Friendship[];
}
