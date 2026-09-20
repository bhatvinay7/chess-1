import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";

export async function getUserProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        profileImageUrl: true,
        bio: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Fault-tolerant ratings fetch — returns [] if migration hasn't been applied yet
    let ratings: {
      category: string;
      rating: number;
      wins: number;
      losses: number;
      draws: number;
    }[] = [];
    try {
      ratings = await prisma.userRating.findMany({
        where: { userId },
        select: {
          category: true,
          rating: true,
          wins: true,
          losses: true,
          draws: true,
        },
      });
    } catch {
      // UserRating table may not exist yet (pending migration)
    }

    res.json({ ...user, ratings });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateUserProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.params.userId;
  const { username, profileImageUrl, bio } = req.body as {
    username?: string;
    email?: string;
    profileImageUrl?: string;
    bio?: string;
  };

  if (!username && !profileImageUrl && bio === undefined) {
    res.status(400).json({ message: "At least one field must be provided" });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const updateKeys = {} as {
      username?: string;
      profileImageUrl?: string;
      bio?: string;
    };
    if (username) updateKeys.username = username;
    if (profileImageUrl) updateKeys.profileImageUrl = profileImageUrl;
    if (bio !== undefined) updateKeys.bio = bio;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateKeys,
      select: {
        id: true,
        username: true,
        email: true,
        profileImageUrl: true,
        bio: true,
        rating: true,
        wins: true,
        losses: true,
        draws: true,
        createdAt: true,
      },
    });

    // Fault-tolerant ratings fetch
    let ratings: {
      category: string;
      rating: number;
      wins: number;
      losses: number;
      draws: number;
    }[] = [];
    try {
      ratings = await prisma.userRating.findMany({
        where: { userId },
        select: {
          category: true,
          rating: true,
          wins: true,
          losses: true,
          draws: true,
        },
      });
    } catch {
      // UserRating table may not exist yet (pending migration)
    }

    res.json({ ...updatedUser, ratings });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
