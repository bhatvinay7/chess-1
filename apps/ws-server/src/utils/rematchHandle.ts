import { randomUUID } from "crypto";
import { redisClient, PubSub } from "@repo/redis-client";
import type {
  RematchRequestPayload,
  RematchOpponent,
} from "@repo/socket-types";

export type { RematchRequestPayload, RematchOpponent };

interface Player {
  userId: string;
  profileImageUrl: string | null;
  rating: number;
  username: string;
}

interface MatchData {
  p1: Player;
  p2: Player;
  game_id: string;
  time_slot: string;
  is_rated: boolean;
}

// interface RedisGameHash {
//   player1_id: string;
//   player1_rating: string;
//   player1_profile_image_url: string;
//   black_player_left_time: string;
//   player1_username: string;
//   player2_username: string;
//   increment: string;
//   player2_id: string;
//   player2_rating: string;
//   player2_profile_image_url: string;
//   white_player_left_time: string;
//   white_player_id: string;
//   black_player_id: string;
//   current_fen: string;
//   is_rated: boolean;
//   time_slot: string;
//   last_move_time: string;
//   winner_id: string;
//   game_state: string;
// }

async function acquireLock(
  lockKey: string,
  ttlMs: number = 5000,
): Promise<boolean> {
  const result = await redisClient.set(lockKey, "locked", {
    NX: true,
    PX: ttlMs,
  });
  return result === "OK";
}

async function releaseLock(lockKey: string): Promise<void> {
  await redisClient.del(lockKey);
}

export async function exceptRematch(
  rematchPayload: RematchRequestPayload,
): Promise<void> {
  const [smallerId, largerId] =
    rematchPayload.userId < rematchPayload.opponentId
      ? [rematchPayload.userId, rematchPayload.opponentId]
      : [rematchPayload.opponentId, rematchPayload.userId];

  const baseKey = `${smallerId}:${largerId}`;
  const dataKey = `game:rematch:${baseKey}`;
  const lockKey = `lock:rematch:${baseKey}`;

  const isLocked = await acquireLock(lockKey, 6000);
  if (!isLocked) {
    return;
  }

  try {
    const isRequestExists = await redisClient.exists(dataKey);
    const response = (await redisClient.hGetAll(dataKey)) as Record<
      string,
      string
    >;

    if (isRequestExists && Object.keys(response).length > 0) {
      const newGameId = randomUUID();

      // Mapping the Redis Hash columns directly from the active Redis session data
      const INITIAL_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const timeSlotBase = parseInt(
        response?.time_slot?.split("+")?.[0] ?? "5",
        10,
      );
      const initialTimeSec = String(timeSlotBase * 60);

      const hashFields = {
        player1_id: response.player1_id!,
        player1_rating: response.player1_rating!,
        player1_profile_image_url: response.player1_profile_image_url! || "",
        black_player_left_time: initialTimeSec,
        player1_username: response.player1_username!,
        player2_username: response.player2_username!,
        increment: response.increment!,
        player2_id: response.player2_id!,
        player2_rating: response.player2_rating!,
        player2_profile_image_url: response.player2_profile_image_url! || "",
        white_player_left_time: initialTimeSec,
        white_player_id: response.white_player_id!,
        black_player_id: response.black_player_id!,
        current_fen: INITIAL_FEN,
        is_rated: response.is_rated!,
        time_slot: response.time_slot!,
        last_move_time: "0",
        winner_id: "",
        game_state: "INITIALIZED",
      };

      const gameStateKey = `game:state:${newGameId}`;
      const userKey1 = `matchmaking:gameId:${rematchPayload.userId}`;
      const userKey2 = `matchmaking:gameId:${rematchPayload.opponentId}`;
      const matchData: MatchData = {
        p1: {
          userId: response.player1_id!,
          profileImageUrl: response.player1_profile_image_url || null,
          rating: parseInt(response.player1_rating!, 10) || 1200,
          username: response.player1_username!,
        },
        p2: {
          userId: response.player2_id!,
          profileImageUrl: response.player2_profile_image_url || null,
          rating: parseInt(response.player2_rating!, 10) || 1200,
          username: response.player2_username!,
        },
        game_id: newGameId,
        time_slot: response.time_slot!,
        is_rated: response.is_rated === "true",
      };

      const startMs = Date.now();
      const durationMs = (timeSlotBase * 60 * 2 + 15 * 60) * 1000;
      const endMs = startMs + durationMs;
      const zsetVal = `${newGameId}:${startMs}`;

      await redisClient
        .multi()
        .hSet(gameStateKey, hashFields)
        .xAdd("matchmaking:queue", "*", { payload: JSON.stringify(matchData) })
        .zAdd(userKey1, [{ score: endMs, value: zsetVal }])
        .zAdd(userKey2, [{ score: endMs, value: zsetVal }])
        .del(dataKey)
        .exec();

      await Promise.all([
        PubSub.publish("game:matchmaking:started", JSON.stringify(matchData)),
        PubSub.publish("game:created", JSON.stringify({ gameId: newGameId })),
      ]);
    }
  } catch (error) {
    console.error("Failed to process rematch transaction:", error);
    throw error;
  } finally {
    await releaseLock(lockKey);
  }
}

export async function requestRematch(
  rematchRequestPayLoad: RematchRequestPayload,
): Promise<RematchOpponent | null> {
  try {
    const [smallerId, largerId] =
      rematchRequestPayLoad.userId < rematchRequestPayLoad.opponentId
        ? [rematchRequestPayLoad.userId, rematchRequestPayLoad.opponentId]
        : [rematchRequestPayLoad.opponentId, rematchRequestPayLoad.userId];

    const baseKey = `${smallerId}:${largerId}`;
    const dataKey = `game:rematch:${baseKey}`;
    const requestKey = `game:rematch:request:${rematchRequestPayLoad.opponentId}`;

    const isBaseExists = await redisClient.exists(dataKey);
    if (!isBaseExists) {
      throw new Error("Rematch session expired or does not exist.");
    }

    const response = (await redisClient.hGetAll(dataKey)) as Record<
      string,
      string
    >;
    if (!response || Object.keys(response).length === 0) return null;

    const isUserP1 = rematchRequestPayLoad.userId === response.player1_id;
    const senderUsername = isUserP1
      ? response.player1_username!
      : response.player2_username!;
    const senderProfileUrl = isUserP1
      ? response.player1_profile_image_url!
      : response.player2_profile_image_url!;

    const payloadData: RematchOpponent = {
      opponentId: rematchRequestPayLoad.userId!,
      profile_image_url: senderProfileUrl || "",
      username: senderUsername!,
      receiverId: rematchRequestPayLoad.opponentId!,
    };

    await redisClient
      .multi()
      .hSet(requestKey, { payload: JSON.stringify(payloadData) })
      .expire(requestKey, 25)
      .exec();

    return payloadData;
  } catch (error) {
    console.error("[requestRematch]", error);
    return null;
  }
}

export async function checkPendingRematchRequest(
  userId: string,
): Promise<RematchOpponent | null> {
  try {
    const requestKey = `game:rematch:request:${userId}`;
    const raw = (await redisClient.hGetAll(requestKey)) as Record<
      string,
      string
    >;
    if (!raw?.payload) return null;

    return JSON.parse(raw.payload) as RematchOpponent;
  } catch {
    return null;
  }
}

export async function declineRematchRequest(
  rematchRequestPayLoad: RematchRequestPayload,
): Promise<void> {
  try {
    const [smallerId, largerId] =
      rematchRequestPayLoad.userId < rematchRequestPayLoad.opponentId
        ? [rematchRequestPayLoad.userId, rematchRequestPayLoad.opponentId]
        : [rematchRequestPayLoad.opponentId, rematchRequestPayLoad.userId];

    const baseKey = `${smallerId}:${largerId}`;
    const rematchGameKey = `game:rematch:${baseKey}`;

    // Check both possible directions for the request key depending on who triggers the decline
    const requestKey1 = `game:rematch:request:${rematchRequestPayLoad.userId}`;
    const requestKey2 = `game:rematch:request:${rematchRequestPayLoad.opponentId}`;

    await redisClient
      .multi()
      .del(rematchGameKey)
      .del(requestKey1)
      .del(requestKey2)
      .exec();
  } catch {}
}
