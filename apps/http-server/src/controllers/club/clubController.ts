import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";

const DEFAULT_CLUB_IMAGE =
  "https://res.cloudinary.com/dhfyav4og/image/upload/v1779739162/defaultUser_afbf5y.jpg";

const s = (v: string | undefined): string => v as string;

export async function createClub(req: Request, res: Response): Promise<void> {
  const { name, description, imageUrl, creatorId } = req.body as {
    name?: string;
    description?: string;
    imageUrl?: string;
    creatorId?: string;
  };

  if (!name || !creatorId) {
    res.status(400).json({ message: "name and creatorId are required" });
    return;
  }

  try {
    const existing = await prisma.club.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ message: "Club name already taken" });
      return;
    }

    const club = await prisma.club.create({
      data: {
        name,
        description,
        imageUrl: imageUrl || DEFAULT_CLUB_IMAGE,
        creatorId,
        members: {
          create: { userId: creatorId, role: "ADMIN" },
        },
      },
      include: { members: true },
    });

    res.status(201).json(club);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getClub(req: Request, res: Response): Promise<void> {
  const clubId = s(req.params.clubId);

  try {
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        creator: { select: { id: true, username: true, profileImageUrl: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, profileImageUrl: true, rating: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { members: true, tournaments: true } },
      },
    });

    if (!club) {
      res.status(404).json({ message: "Club not found" });
      return;
    }

    res.json(club);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function listClubs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const search = String(req.query.search || "").trim();

  try {
    const where = search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] }
      : {};

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { members: true, tournaments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.club.count({ where }),
    ]);

    res.json({ clubs, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateClub(req: Request, res: Response): Promise<void> {
  const clubId = s(req.params.clubId);
  const { name, description, imageUrl, requesterId } = req.body as {
    name?: string;
    description?: string;
    imageUrl?: string;
    requesterId?: string;
  };

  if (!requesterId) {
    res.status(400).json({ message: "requesterId is required" });
    return;
  }

  try {
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: requesterId } },
    });

    if (!membership || !["ADMIN", "COORDINATOR"].includes(membership.role)) {
      res.status(403).json({ message: "Only admin or coordinator can update club" });
      return;
    }

    const club = await prisma.club.update({
      where: { id: clubId },
      data: {
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    res.json(club);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function requestJoinClub(req: Request, res: Response): Promise<void> {
  const clubId = s(req.params.clubId);
  const { userId } = req.body as { userId?: string };

  if (!userId) {
    res.status(400).json({ message: "userId is required" });
    return;
  }

  try {
    const existing = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (existing) {
      res.status(409).json({ message: "Already a member" });
      return;
    }

    const existingRequest = await prisma.clubJoinRequest.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (existingRequest && existingRequest.status === "PENDING") {
      res.status(409).json({ message: "Join request already pending" });
      return;
    }

    const request = await prisma.clubJoinRequest.upsert({
      where: { clubId_userId: { clubId, userId } },
      create: { clubId, userId, status: "PENDING" },
      update: { status: "PENDING" },
    });

    res.status(201).json(request);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleJoinRequest(req: Request, res: Response): Promise<void> {
  const clubId    = s(req.params.clubId);
  const requestId = s(req.params.requestId);
  const { action, adminId } = req.body as { action?: "accept" | "reject"; adminId?: string };

  if (!action || !adminId || !["accept", "reject"].includes(action)) {
    res.status(400).json({ message: "action (accept|reject) and adminId are required" });
    return;
  }

  try {
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: adminId } },
    });
    if (!membership || !["ADMIN", "COORDINATOR"].includes(membership.role)) {
      res.status(403).json({ message: "Not authorised to manage join requests" });
      return;
    }

    const joinRequest = await prisma.clubJoinRequest.findUnique({ where: { id: requestId } });
    if (!joinRequest || joinRequest.clubId !== clubId) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    await prisma.clubJoinRequest.update({
      where: { id: requestId },
      data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" },
    });

    if (action === "accept") {
      await prisma.clubMember.upsert({
        where: { clubId_userId: { clubId, userId: joinRequest.userId } },
        create: { clubId, userId: joinRequest.userId, role: "MEMBER" },
        update: { role: "MEMBER" },
      });
    }

    res.json({ message: `Request ${action}ed` });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const clubId = s(req.params.clubId);
  const userId = s(req.params.userId);
  const { adminId } = req.body as { adminId?: string };

  if (!adminId) {
    res.status(400).json({ message: "adminId is required" });
    return;
  }

  try {
    const adminMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: adminId } },
    });
    if (!adminMembership || adminMembership.role !== "ADMIN") {
      res.status(403).json({ message: "Only admin can remove members" });
      return;
    }

    if (userId === adminId) {
      res.status(400).json({ message: "Admin cannot remove themselves" });
      return;
    }

    await prisma.clubMember.deleteMany({ where: { clubId, userId } });
    res.json({ message: "Member removed" });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendCoordinatorInvite(req: Request, res: Response): Promise<void> {
  const clubId = s(req.params.clubId);
  const { invitedUserId, invitedById } = req.body as {
    invitedUserId?: string;
    invitedById?: string;
  };

  if (!invitedUserId || !invitedById) {
    res.status(400).json({ message: "invitedUserId and invitedById are required" });
    return;
  }

  try {
    const adminMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: invitedById } },
    });
    if (!adminMembership || adminMembership.role !== "ADMIN") {
      res.status(403).json({ message: "Only admin can send coordinator invites" });
      return;
    }

    const invite = await prisma.clubCoordinatorInvite.upsert({
      where: { clubId_invitedUserId: { clubId, invitedUserId } },
      create: { clubId, invitedUserId, invitedById, status: "PENDING" },
      update: { status: "PENDING", invitedById },
    });

    res.status(201).json(invite);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleCoordinatorInvite(req: Request, res: Response): Promise<void> {
  const clubId   = s(req.params.clubId);
  const inviteId = s(req.params.inviteId);
  const { action, userId } = req.body as { action?: "accept" | "reject"; userId?: string };

  if (!action || !userId || !["accept", "reject"].includes(action)) {
    res.status(400).json({ message: "action (accept|reject) and userId are required" });
    return;
  }

  try {
    const invite = await prisma.clubCoordinatorInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.clubId !== clubId || invite.invitedUserId !== userId) {
      res.status(404).json({ message: "Invite not found" });
      return;
    }

    await prisma.clubCoordinatorInvite.update({
      where: { id: inviteId },
      data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" },
    });

    if (action === "accept") {
      await prisma.clubMember.upsert({
        where: { clubId_userId: { clubId, userId } },
        create: { clubId, userId, role: "COORDINATOR" },
        update: { role: "COORDINATOR" },
      });
    }

    res.json({ message: `Coordinator invite ${action}ed` });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMyAdminClubs(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  let userId: string;
  try {
    const { verifyToken } = await import('../../utils/middleware.commonfie.js');
    userId = verifyToken(authHeader.slice(7)).userId;
  } catch {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  try {
    const memberships = await prisma.clubMember.findMany({
      where: { userId, role: 'ADMIN' },
      include: {
        club: {
          select: { id: true, name: true, imageUrl: true, _count: { select: { members: true } } },
        },
      },
    });
    res.json(memberships.map((m: (typeof memberships)[number]) => m.club));
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getJoinRequests(req: Request, res: Response): Promise<void> {
  const clubId  = s(req.params.clubId);
  const adminId = req.query.adminId as string | undefined;

  if (!adminId) {
    res.status(400).json({ message: "adminId is required" });
    return;
  }

  try {
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId: adminId } },
    });
    if (!membership || !["ADMIN", "COORDINATOR"].includes(membership.role)) {
      res.status(403).json({ message: "Not authorised" });
      return;
    }

    const requests = await prisma.clubJoinRequest.findMany({
      where: { clubId, status: "PENDING" },
      include: { user: { select: { id: true, username: true, profileImageUrl: true, rating: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json(requests);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}
