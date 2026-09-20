import { Request, Response } from "express";
import crypto from "crypto";
import { mongoPrisma } from "@repo/mongo-db";
import { prisma as pgPrisma } from "@repo/postgres-db";
import { getAuthenticatedUserId } from "../../utils/auth.js";
import { z } from "zod";
import { redisClient } from "@repo/redis-client";

const ALGORITHM = "aes-256-cbc";
// Must be 32 bytes
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.INVITATION_ENCRYPTION_KEY || "default_secret",
  "salt",
  32,
);

function encryptData(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encryptedData: encrypted, iv: iv.toString("hex") };
}

function decryptData(encryptedData: string, ivHex: string) {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const createInviteSchema = z.object({
  receiverId: z.string().uuid(),
  timeControl: z.string().min(1),
  gameMode: z.string().min(1),
  scheduledTime: z.string().datetime(),
  color: z.enum(["random", "white", "black"]),
});

function getDurationMs(timeControl: string): number {
  const [minsStr] = timeControl.split("+");
  const mins = parseInt(minsStr || "0", 10);
  return (mins * 60 * 2 + 15 * 60) * 1000;
}

function generateChess960Fen(): string {
  const pieces = Array(8).fill("");
  const lightB = Math.floor(Math.random() * 4) * 2 + 1;
  const darkB = Math.floor(Math.random() * 4) * 2;
  pieces[lightB] = "b";
  pieces[darkB] = "b";

  let emptyIndices = pieces
    .map((p, i) => (p === "" ? i : -1))
    .filter((i) => i !== -1);
  const qIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)]!;
  pieces[qIndex] = "q";

  emptyIndices = pieces
    .map((p, i) => (p === "" ? i : -1))
    .filter((i) => i !== -1);
  const n1Index =
    emptyIndices[Math.floor(Math.random() * emptyIndices.length)]!;
  pieces[n1Index] = "n";
  emptyIndices = pieces
    .map((p, i) => (p === "" ? i : -1))
    .filter((i) => i !== -1);
  const n2Index =
    emptyIndices[Math.floor(Math.random() * emptyIndices.length)]!;
  pieces[n2Index] = "n";

  emptyIndices = pieces
    .map((p, i) => (p === "" ? i : -1))
    .filter((i) => i !== -1);
  pieces[emptyIndices[0]!] = "r";
  pieces[emptyIndices[1]!] = "k";
  pieces[emptyIndices[2]!] = "r";

  const row = pieces.join("");
  return `${row.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${row.toUpperCase()} w KQkq - 0 1`;
}

async function flushGhostInvites(userId: string) {
  const now = Date.now();
  const oldGameIds = await redisClient.zRange(
    `matchmaking:gameId:${userId}`,
    0,
    now,
    { BY: "SCORE" },
  );
  if (oldGameIds.length > 0) {
    const pipeline = redisClient.multi();
    for (const entry of oldGameIds) {
      const gid = entry.split(":")[0];
      pipeline.del(`game:state:${gid}`);
      pipeline.zRem(`matchmaking:gameId:${userId}`, entry);
    }
    await pipeline.exec();
  }
}

async function hasOverlappingGame(
  userId: string,
  startMs: number,
  endMs: number,
): Promise<boolean> {
  const futureGameEntries = await redisClient.zRange(
    `matchmaking:gameId:${userId}`,
    startMs,
    "+inf",
    { BY: "SCORE" },
  );
  for (const entry of futureGameEntries) {
    const [, exStartStr] = entry.split(":");
    if (exStartStr) {
      const exStartMs = parseInt(exStartStr, 10);
      if (exStartMs < endMs) {
        return true;
      }
    } else {
      return true;
    }
  }
  return false;
}

export async function createInvite(req: Request, res: Response): Promise<void> {
  try {
    const senderId = getAuthenticatedUserId(req);
    if (!senderId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const parsed = createInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          message: "Invalid request payload",
          errors: parsed.error.format(),
        });
      return;
    }

    const { receiverId, timeControl, gameMode, scheduledTime, color } =
      parsed.data;

    // 1. Validate Friendship in PostgreSQL
    const friendship = await pgPrisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: senderId, recipientId: receiverId },
          { requesterId: receiverId, recipientId: senderId },
        ],
        status: "ACCEPTED",
      },
    });

    if (!friendship) {
      res.status(403).json({ message: "You can only invite your friends." });
      return;
    }

    const startMs = new Date(scheduledTime).getTime();
    const durationMs = getDurationMs(timeControl);
    const endMs = startMs + durationMs;

    await flushGhostInvites(senderId);
    const hasOverlap = await hasOverlappingGame(senderId, startMs, endMs);
    if (hasOverlap) {
      res
        .status(400)
        .json({
          message: "You already have a game scheduled for this duration.",
        });
      return;
    }

    // 2. Encrypt Payload
    const payload = JSON.stringify({
      timeControl,
      gameMode,
      scheduledTime,
      color,
    });
    const { encryptedData, iv } = encryptData(payload);

    // 3. Mongo Transaction (Invitation + Notification)
    // 1 hour expiry for the invitation itself
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const result = await mongoPrisma.$transaction(async (tx) => {
      const invite = await tx.invitation.create({
        data: {
          senderId,
          receiverId,
          encryptedData,
          iv,
          expiresAt,
          status: "PENDING",
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: receiverId,
          type: "GAME_INVITATION",
          message: `You received a game invitation!`,
          metadata: { inviteId: invite.id, senderId },
        },
      });

      return { invite, notification };
    });

    res
      .status(201)
      .json({ message: "Invitation sent successfully", invite: result.invite });
  } catch (error) {
    console.error("[createInvite] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSentInvites(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const senderId = getAuthenticatedUserId(req);
    if (!senderId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const invites = await mongoPrisma.invitation.findMany({
      where: { senderId },
      orderBy: { createdAt: "desc" },
    });

    const receiverIds = [...new Set(invites.map((inv) => inv.receiverId))];
    const receivers = await pgPrisma.user.findMany({
      where: { id: { in: receiverIds } },
      select: { id: true, username: true, profileImageUrl: true, rating: true },
    });
    const receiverMap = new Map(
      receivers.map((r: (typeof receivers)[number]) => [r.id, r]),
    );

    const decryptedInvites = invites.map((inv) => {
      let payload = null;
      let error = undefined;
      try {
        const payloadStr = decryptData(inv.encryptedData, inv.iv);
        payload = JSON.parse(payloadStr);
      } catch (err) {
        error = "Decryption failed";
      }
      return {
        ...inv,
        payload,
        error,
        receiver: receiverMap.get(inv.receiverId) || null,
      };
    });

    res.status(200).json(decryptedInvites);
  } catch (error) {
    console.error("[getSentInvites] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getReceivedInvites(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const receiverId = getAuthenticatedUserId(req);
    if (!receiverId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const invites = await mongoPrisma.invitation.findMany({
      where: { receiverId },
      orderBy: { createdAt: "desc" },
    });

    const senderIds = [...new Set(invites.map((inv) => inv.senderId))];
    const senders = await pgPrisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, username: true, profileImageUrl: true, rating: true },
    });
    const senderMap = new Map(
      senders.map((s: (typeof senders)[number]) => [s.id, s]),
    );

    const decryptedInvites = invites.map((inv) => {
      let payload = null;
      let error = undefined;
      try {
        const payloadStr = decryptData(inv.encryptedData, inv.iv);
        payload = JSON.parse(payloadStr);
      } catch (err) {
        error = "Decryption failed";
      }
      return {
        ...inv,
        payload,
        error,
        sender: senderMap.get(inv.senderId) || null,
      };
    });

    res.status(200).json(decryptedInvites);
  } catch (error) {
    console.error("[getReceivedInvites] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  try {
    const receiverId = getAuthenticatedUserId(req);
    const inviteId = req.params.id;
    if (!receiverId || !inviteId) {
      res.status(400).json({ message: "Missing id or unauthorized" });
      return;
    }

    const invite = await mongoPrisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    if (invite.receiverId !== receiverId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (new Date() > invite.expiresAt) {
      res.status(400).json({ message: "Invitation expired" });
      return;
    }

    const payloadStr = decryptData(invite.encryptedData, invite.iv);
    const payload = JSON.parse(payloadStr);

    const startMs = new Date(payload.scheduledTime).getTime();
    const durationMs = getDurationMs(payload.timeControl);
    const endMs = startMs + durationMs;

    await flushGhostInvites(receiverId);
    await flushGhostInvites(invite.senderId);

    const existingReceiverGames = await redisClient.zRange(
      `matchmaking:gameId:${receiverId}`,
      0,
      -1,
    );

    // Safety check: if they somehow accepted this exact invite already, don't throw an overlap error.
    for (const entry of existingReceiverGames) {
      const gid = entry.split(":")[0];
      const stateInviteId = await redisClient.hGet(
        `game:state:${gid}`,
        "invite_id",
      );
      if (stateInviteId === inviteId) {
        res.status(200).json({ message: "Game accepted", gameId: gid });
        return;
      }
    }

    const hasOverlap = await hasOverlappingGame(receiverId, startMs, endMs);
    if (hasOverlap) {
      res
        .status(400)
        .json({ message: "You have an overlapping scheduled game." });
      return;
    }

    const gameId = crypto.randomUUID();
    const [mins, incrementStr] = payload.timeControl.split("+");
    const initialTimeSec = parseInt(mins, 10) * 60;
    const increment = parseInt(incrementStr ?? "0", 10);

    const isWhite =
      payload.color === "white" ||
      (payload.color === "random" && Math.random() > 0.5);
    const whitePlayerId = isWhite ? invite.senderId : receiverId;
    const blackPlayerId = isWhite ? receiverId : invite.senderId;

    const sender = await pgPrisma.user.findUnique({
      where: { id: invite.senderId },
    });
    const receiver = await pgPrisma.user.findUnique({
      where: { id: receiverId },
    });

    const startingFen =
      payload.gameMode === "chess960"
        ? generateChess960Fen()
        : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const currentTs = Math.floor(Date.now() / 1000).toString();

    const pipeline = redisClient.multi();
    pipeline.hSet(`game:state:${gameId}`, {
      invite_id: inviteId,
      initial_fen: startingFen,
      current_fen: startingFen,
      white_player_left_time: initialTimeSec.toString(),
      black_player_left_time: initialTimeSec.toString(),
      white_player_id: whitePlayerId,
      black_player_id: blackPlayerId,
      player1_id: whitePlayerId,
      player2_id: blackPlayerId,
      player1_username: isWhite
        ? (sender?.username ?? "")
        : (receiver?.username ?? ""),
      player2_username: isWhite
        ? (receiver?.username ?? "")
        : (sender?.username ?? ""),
      player1_rating: isWhite
        ? (sender?.rating?.toString() ?? "1200")
        : (receiver?.rating?.toString() ?? "1200"),
      player2_rating: isWhite
        ? (receiver?.rating?.toString() ?? "1200")
        : (sender?.rating?.toString() ?? "1200"),
      player1_profile_image_url: isWhite
        ? (sender?.profileImageUrl ?? "")
        : (receiver?.profileImageUrl ?? ""),
      player2_profile_image_url: isWhite
        ? (receiver?.profileImageUrl ?? "")
        : (sender?.profileImageUrl ?? ""),
      increment: increment.toString(),
      game_state: "INITIALIZED",
      gameMode: payload.gameMode,
      is_rated: "false",
      time_slot: payload.timeControl,
      left_game_start_time: startMs.toString(),
      last_move_time: currentTs,
      winner_id: "",
      tournament_id: "",
      tournament_type: "",
      round_id: "",
      group_id: "",
      match_id: "",
      paired_game_id: "",
    });
    pipeline.zAdd(`matchmaking:gameId:${invite.senderId}`, [
      { score: endMs, value: `${gameId}:${startMs}` },
    ]);
    pipeline.zAdd(`matchmaking:gameId:${receiverId}`, [
      { score: endMs, value: `${gameId}:${startMs}` },
    ]);

    const execResult = await pipeline.exec();
    if (!execResult) {
      throw new Error("Redis pipeline execution failed");
    }

    try {
      const updated = await mongoPrisma.$transaction(async (tx) => {
        const updatedInvite = await tx.invitation.update({
          where: { id: inviteId },
          data: { status: "ACCEPTED" },
        });

        await tx.notification.create({
          data: {
            userId: updatedInvite.senderId,
            type: "GAME_INVITATION_ACCEPTED",
            message: `Your game invitation was accepted!`,
            metadata: {
              inviteId: updatedInvite.id,
              receiverId,
              url: `/arena/${gameId}`,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: receiverId,
            type: "GAME_INVITATION_ACCEPTED",
            message: `You accepted the game invitation!`,
            metadata: {
              inviteId: updatedInvite.id,
              senderId: invite.senderId,
              url: `/arena/${gameId}`,
            },
          },
        });

        return updatedInvite;
      });

      res.status(200).json({ message: "Invitation accepted", payload, gameId });
    } catch (dbErr) {
      console.error("DB update failed during acceptInvite", dbErr);
      res
        .status(500)
        .json({
          message: "Failed to accept invite fully, but state was allocated.",
        });
    }
  } catch (error) {
    console.error("[acceptInvite] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function rejectInvite(req: Request, res: Response): Promise<void> {
  try {
    const receiverId = getAuthenticatedUserId(req);
    const inviteId = req.params.id;
    if (!receiverId || !inviteId) {
      res.status(400).json({ message: "Missing id or unauthorized" });
      return;
    }

    const invite = await mongoPrisma.invitation.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      res.status(404).json({ message: "Invitation not found" });
      return;
    }

    if (invite.receiverId !== receiverId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    await mongoPrisma.$transaction(async (tx) => {
      const updatedInvite = await tx.invitation.update({
        where: { id: inviteId },
        data: { status: "REJECTED" },
      });

      await tx.notification.create({
        data: {
          userId: updatedInvite.senderId,
          type: "GAME_INVITATION_REJECTED",
          message: `Your game invitation was rejected.`,
          metadata: { inviteId: updatedInvite.id, receiverId },
        },
      });

      return updatedInvite;
    });

    res.status(200).json({ message: "Invitation rejected" });
  } catch (error) {
    console.error("[rejectInvite] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
