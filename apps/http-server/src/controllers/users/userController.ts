import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";
import { getAuthenticatedUserId } from "../../utils/auth.js";
import { getUserGameHistory } from "../game/gameController.js";

const publicUserSelect = {
  id: true,
  username: true,
  profileImageUrl: true,
  rating: true,
  wins: true,
  losses: true,
  draws: true,
  createdAt: true,
} as const;

async function friendshipStatus(currentUserId: string, targetUserId: string) {
  if (currentUserId === targetUserId) return "SELF";

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: currentUserId, recipientId: targetUserId },
        { requesterId: targetUserId, recipientId: currentUserId },
      ],
    },
    select: { requesterId: true, recipientId: true, status: true },
  });

  if (!friendship) return "NONE";
  if (friendship.status === "ACCEPTED") return "FRIENDS";
  if (friendship.status !== "PENDING") return friendship.status;
  return friendship.requesterId === currentUserId ? "OUTGOING_REQUEST" : "INCOMING_REQUEST";
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const currentUserId = getAuthenticatedUserId(req);
  if (!currentUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const query = String(req.query.query ?? "").trim();
  if (query.length < 2) {
    res.json({ users: [] });
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isAdmin: false,
        username: { contains: query, mode: "insensitive" },
      },
      orderBy: [{ rating: "desc" }, { username: "asc" }],
      take: 12,
      select: publicUserSelect,
    });

    res.json({
      users: await Promise.all(
        users.map(async (user: (typeof users)[number]) => ({
          ...user,
          friendshipStatus: await friendshipStatus(currentUserId, user.id),
        })),
      ),
    });
  } catch (error) {
    console.error("[user-search]", error);
    res.status(500).json({ message: "Failed to search users" });
  }
}

export async function getPublicUserProfile(req: Request, res: Response): Promise<void> {
  const currentUserId = getAuthenticatedUserId(req);
  if (!currentUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "User id is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      ...user,
      friendshipStatus: await friendshipStatus(currentUserId, userId),
    });
  } catch (error) {
    console.error("[get-public-profile]", error);
    res.status(500).json({ message: "Failed to load user profile" });
  }
}

// Re-export from gameController so userRoutes can use it
export { getUserGameHistory };
