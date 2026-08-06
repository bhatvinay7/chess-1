import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";
import { getAuthenticatedUserId } from "../../utils/auth.js";

const friendUserSelect = {
  id: true,
  username: true,
  profileImageUrl: true,
  rating: true,
  wins: true,
  losses: true,
  draws: true,
  createdAt: true,
} as const;

function requireUserId(req: Request, res: Response): string | null {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return userId;
}

export async function listFriends(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        requester: { select: friendUserSelect },
        recipient: { select: friendUserSelect },
      },
    });

    res.json({
      friends: friendships.map((friendship: (typeof friendships)[number]) => ({
        id: friendship.id,
        friendsSince: friendship.updatedAt,
        user: friendship.requesterId === userId ? friendship.recipient : friendship.requester,
      })),
    });
  } catch (error) {
    console.error("[friends-list]", error);
    res.status(500).json({ message: "Failed to load friends" });
  }
}

export async function listIncomingRequests(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const requests = await prisma.friendship.findMany({
      where: { recipientId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: friendUserSelect } },
    });

    res.json({
      requests: requests.map((request: (typeof requests)[number]) => ({
        id: request.id,
        createdAt: request.createdAt,
        user: request.requester,
      })),
    });
  } catch (error) {
    console.error("[incoming-friend-requests]", error);
    res.status(500).json({ message: "Failed to load incoming requests" });
  }
}

export async function listOutgoingRequests(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const requests = await prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { recipient: { select: friendUserSelect } },
    });

    res.json({
      requests: requests.map((request: (typeof requests)[number]) => ({
        id: request.id,
        createdAt: request.createdAt,
        user: request.recipient,
      })),
    });
  } catch (error) {
    console.error("[outgoing-friend-requests]", error);
    res.status(500).json({ message: "Failed to load outgoing requests" });
  }
}

export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  const requesterId = requireUserId(req, res);
  if (!requesterId) return;

  const { recipientId } = req.body as { recipientId?: string };
  if (!recipientId) {
    res.status(400).json({ message: "recipientId is required" });
    return;
  }
  if (requesterId === recipientId) {
    res.status(400).json({ message: "You cannot send a friend request to yourself" });
    return;
  }

  try {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!recipient) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, recipientId },
          { requesterId: recipientId, recipientId: requesterId },
        ],
      },
      include: {
        requester: { select: friendUserSelect },
        recipient: { select: friendUserSelect },
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        res.status(409).json({ message: "You are already friends" });
        return;
      }
      if (existing.status === "PENDING") {
        res.status(409).json({
          message: existing.requesterId === requesterId
            ? "Friend request already sent"
            : "This user already sent you a friend request",
          request: existing,
        });
        return;
      }
    }

    const request = await prisma.friendship.create({
      data: { requesterId, recipientId, status: "PENDING" },
      include: {
        requester: { select: friendUserSelect },
        recipient: { select: friendUserSelect },
      },
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error("[send-friend-request]", error);
    res.status(500).json({ message: "Failed to send friend request" });
  }
}

export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  const recipientId = requireUserId(req, res);
  if (!recipientId) return;

  try {
    const request = await prisma.friendship.findFirst({
      where: {
        id: req.params.requestId,
        recipientId,
        status: "PENDING",
      },
    });

    if (!request) {
      res.status(404).json({ message: "Incoming friend request not found" });
      return;
    }

    const friendship = await prisma.friendship.update({
      where: { id: request.id },
      data: { status: "ACCEPTED" },
      include: {
        requester: { select: friendUserSelect },
        recipient: { select: friendUserSelect },
      },
    });

    res.json({ friendship });
  } catch (error) {
    console.error("[accept-friend-request]", error);
    res.status(500).json({ message: "Failed to accept friend request" });
  }
}

export async function rejectFriendRequest(req: Request, res: Response): Promise<void> {
  const recipientId = requireUserId(req, res);
  if (!recipientId) return;

  try {
    const request = await prisma.friendship.findFirst({
      where: {
        id: req.params.requestId,
        recipientId,
        status: "PENDING",
      },
    });

    if (!request) {
      res.status(404).json({ message: "Incoming friend request not found" });
      return;
    }

    await prisma.friendship.update({
      where: { id: request.id },
      data: { status: "REJECTED" },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[reject-friend-request]", error);
    res.status(500).json({ message: "Failed to reject friend request" });
  }
}
