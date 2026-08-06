export type RatingCategory = "BULLET" | "BLITZ" | "RAPID";

export interface UserRating {
  category: RatingCategory;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  ratings: UserRating[];
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  profileImageUrl?: string;
  bio?: string;
}
