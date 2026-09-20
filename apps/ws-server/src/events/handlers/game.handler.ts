import { currentCarrier, SpanKind, withSpan } from "@repo/telemetry-node";
import { Server, Socket } from "socket.io";
import { redisClient } from "@repo/redis-client";
import { processMoveGrpc } from "@repo/grpc-connection";
import type { ChessMoveServiceClient } from "@repo/grpc-connection";
import { syncGameTime } from "../../utils/syncGameTime.js";
import {
  buildGameStatePayload,
  getActiveGameId,
  removeGameFromSchedule,
} from "../../shared/game-state.js";
import { userSocketMap } from "../../shared/socket-store.js";
import type { MatchmakingTicket, RedisStreamItem } from "../../shared/types.js";

export class GameHandler {
  constructor(
    private io: Server,
    private socket: Socket,
    private grpcClient: ChessMoveServiceClient,
  ) {}

  register(): void {
    this.socket.on(
      "join_arena",
      (data: string | { userId: string; isInitialCheck?: boolean }) =>
        this.onJoinArena(data),
    );

    this.socket.on(
      "user_move",
      (moveData: {
        gameId: string;
        userId: string;
        move: { from: string; to: string; promotion?: string };
      }) => withSpan("socket.user_move", SpanKind.SERVER, () => this.onUserMove(moveData), {}).catch(console.error),
    );

    this.socket.on("search_opponent", (payload: MatchmakingTicket) =>
      withSpan("socket.search_opponent", SpanKind.SERVER, () => this.onSearchOpponent(payload), {}).catch(console.error),
    );

    this.socket.on("abandoned", (userId: string) => this.onAbandoned(userId));

    this.socket.on(
      "leave_game",
      ({ userId, gameId }: { userId: string; gameId: string }) =>
        this.onLeaveGame(userId, gameId),
    );

    this.socket.on("leave_search", (user: { userId: string }) =>
      this.onLeaveSearch(user.userId),
    );

    this.socket.on("heartbeat", (userId: string) => this.onHeartbeat(userId));
  }

  private async onJoinArena(
    data: string | { userId: string; isInitialCheck?: boolean },
  ): Promise<void> {
    const userId = typeof data === "string" ? data : data.userId;
    const isInitialCheck =
      typeof data === "object" ? (data.isInitialCheck ?? false) : false;

    let gameId: string | null = null;
    try {
      gameId = await getActiveGameId(userId);
      if (!gameId) {
        const nowMs = Date.now();
        const active = await redisClient.zRange(
          `user:active:games:${userId}`,
          nowMs, // max (upper bound when REV=true)
          0, // min
          { BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 1 } },
        );
        gameId = active.length > 0 ? (active[0] ?? null) : null;
      }
    } catch (err) {
      console.error(
        `[join_arena] Redis lookup failed for user ${userId}:`,
        err,
      );
      this.socket.emit("no_active_game");
      return;
    }

    if (!gameId) {
      this.socket.emit("no_active_game");
      return;
    }

    await this.socket.join(`game:${gameId}`);

    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 1000;
    let gameData: Record<string, string | undefined | null> = {};

    try {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        gameData = await syncGameTime(gameId);
        if (gameData.current_fen && gameData.game_state) break;
        if (attempt < MAX_RETRIES) {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }

      if (gameData.current_fen && gameData.game_state) {
        const payload = buildGameStatePayload(gameId, gameData);
        const isActive =
          gameData.game_state === "IN_PROGRESS" ||
          gameData.game_state === "INITIALIZED";
        if (isActive) {
          const event = isInitialCheck ? "active_game_found" : "game_state";
          userSocketMap.get(userId)?.emit(event, payload);
        } else {
          this.io.to(`game:${gameId}`).emit("game_state", payload);
        }
      } else {
        try {
          await removeGameFromSchedule(userId, gameId);
        } catch {
          /* ignored */
        }
        this.socket.emit("no_active_game");
      }
    } catch (err) {
      console.error(
        `[join_arena] Failed to fetch state for game ${gameId}:`,
        err,
      );
      try {
        await removeGameFromSchedule(userId, gameId ?? undefined);
      } catch {
        /* ignored */
      }
      this.socket.emit("no_active_game");
    }

    // Send full move history as a single batch event.
    try {
      const streams = (await redisClient.xRead({
        key: `game:moveshistory:${gameId}`,
        id: "0-0",
      })) as RedisStreamItem[] | null;

      const batch: {
        userId: string;
        move: object;
        newFen: string;
        timeTakenMs?: number;
      }[] = [];
      if (streams && streams.length > 0) {
        for (const { message } of streams[0]!.messages) {
          try {
            if (message.move) {
              const parsed = JSON.parse(message.move);
              const timeTakenMs =
                parsed.time_taken != null
                  ? Math.round(parsed.time_taken * 1000)
                  : undefined;
              batch.push({
                userId: message.userId,
                move: {
                  from: parsed.from,
                  to: parsed.to,
                  promotion: parsed.promotion,
                },
                newFen: parsed.fen_after || parsed.newFen,
                timeTakenMs,
              });
            }
          } catch {
            /* malformed entry, skip */
          }
        }
      }
      this.socket.emit("move_history_batch", batch);
    } catch (err) {
      console.error(
        `[join_arena] Failed to read move history for game ${gameId}:`,
        err,
      );
      this.socket.emit("move_history_batch", []);
    }
  }

  private async onUserMove(moveData: {
    gameId: string;
    userId: string;
    move: { from: string; to: string; promotion?: string };
  }): Promise<void> {
    const { gameId, userId, move } = moveData;
    await processMoveGrpc(this.grpcClient, {
      game_id: gameId,
      user_id: userId,
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? "",
    }).catch((err: unknown) => {
      console.error(
        `[gRPC] ProcessMove failed for game ${gameId} user ${userId}:`,
        err,
      );
    });
  }

  private getDurationMs(timeControl: string): number {
    const [minsStr] = timeControl.split("+");
    const mins = parseInt(minsStr || "0", 10);
    return (mins * 60 * 2 + 15 * 60) * 1000;
  }

  private async flushGhostInvites(userId: string) {
    const now = Date.now();
    const oldGameIds = await redisClient.zRange(
      `matchmaking:gameId:${userId}`,
      0,
      now,
      { BY: 'SCORE' }
    );
    if (oldGameIds.length > 0) {
      const pipeline = redisClient.multi();
      for (const entry of oldGameIds) {
        const gid = entry.split(":")[0];
        if (gid) {
          pipeline.del(`game:state:${gid}`);
          pipeline.zRem(`matchmaking:gameId:${userId}`, entry);
        }
      }
      await pipeline.exec();
    }
  }

  private async hasOverlappingGame(
    userId: string,
    startMs: number,
    endMs: number,
  ): Promise<boolean> {
    const futureGameEntries = await redisClient.zRange(
      `matchmaking:gameId:${userId}`,
      startMs,
      "+inf",
      { BY: 'SCORE' }
    );
    for (const entry of futureGameEntries) {
      const [gid, exStartStr] = entry.split(":");
      
      // If the game doesn't exist in Redis anymore, it's a ghost, clean it up and ignore it.
      if (gid) {
        const exists = await redisClient.exists(`game:state:${gid}`);
        if (!exists) {
          await redisClient.zRem(`matchmaking:gameId:${userId}`, entry);
          continue;
        }
      }

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

  private async onSearchOpponent(payload: MatchmakingTicket): Promise<void> {
    const streamChannel = "matchmaker:stream";
    const entry = {
      data: JSON.stringify({
        _trace_context: currentCarrier(),
        userId: payload.userId,
        rating: payload.elo,
        profileImageUrl: payload.profileImageUrl,
        timestamp: Date.now() / 1000,
        username: payload.username,
        time_slot: payload.time_slot,
        isRated: payload.isRated,
        gameMode: payload.gameMode,
      }),
    };
    
    try {
      console.log(entry)
      await this.flushGhostInvites(payload.userId);
      const startMs = Date.now();
      const durationMs = this.getDurationMs(payload.time_slot);
      const endMs = startMs + durationMs;

      const hasOverlap = await this.hasOverlappingGame(
        payload.userId,
        startMs,
        endMs,
      );
      if (hasOverlap) {
        this.socket.emit("error", {
          message: "You already have an active or scheduled game.",
        });
        return;
      }

      const existingTicket = await redisClient.get(
        `matchmaking:ticket:${payload.userId}`,
      );
      if (existingTicket) {
        try {
          await redisClient.zRem("matchmaker:zset", existingTicket);
          await redisClient.del(`matchmaking:ticket:${payload.userId}`);
        } catch (err) {
          console.error(
            `[search_opponent] Failed to clean stale ticket for user ${payload.userId}:`,
            err,
          );
        }
      }
     
      await redisClient.xAdd(streamChannel, "*", entry);
      await redisClient.set(`matchmaking:ticket:${payload.userId}`, entry.data);
      await redisClient.set(`presence:${payload.userId}`, "1", {
        EX: 30,
        NX: true,
      });
      this.socket.emit("searching", {
        message: "Searching for an opponent...",
      });
    } catch (err) {
      console.error(
        `[search_opponent] Failed to queue ticket for user ${payload.userId}:`,
        err,
      );
    }
  }

  private async onAbandoned(userId: string): Promise<void> {
    try {
      const ticket = await redisClient.get(`matchmaking:ticket:${userId}`);
      if (ticket) {
        await redisClient.zRem("matchmaker:zset", ticket);
        await redisClient.del(`matchmaking:ticket:${userId}`);
      }
      await redisClient.del(`presence:${userId}`);
      const gameId = await getActiveGameId(userId);
      if (gameId) {
        await removeGameFromSchedule(userId, gameId);
        const [p1Id, p2Id] = await redisClient.hmGet(`game:state:${gameId}`, [
          "player1_id",
          "player2_id",
        ]);
        if (p1Id && p1Id !== userId) await removeGameFromSchedule(p1Id, gameId);
        if (p2Id && p2Id !== userId) await removeGameFromSchedule(p2Id, gameId);
      }
    } catch (err) {
      console.error(`[abandoned] Error for user ${userId}:`, err);
    }
  }

  private async onLeaveGame(userId: string, gameId: string): Promise<void> {
    try {
      const currentGameId = await getActiveGameId(userId);
      if (currentGameId === gameId) {
        await removeGameFromSchedule(userId, gameId);
      }
    } catch (err) {
      console.error(`[leave_game] Error for user ${userId}:`, err);
    }
  }

  private async onLeaveSearch(userId: string): Promise<void> {
    try {
      const ticket = await redisClient.get(`matchmaking:ticket:${userId}`);
      if (ticket) {
        await redisClient.zRem("matchmaker:zset", ticket);
        await redisClient.del(`matchmaking:ticket:${userId}`);
      }
      await redisClient.del(`presence:${userId}`);
    } catch (err) {
      console.error(`[leave_search] Error for user ${userId}:`, err);
    }
  }

  private async onHeartbeat(userId: string): Promise<void> {
    if (!this.socket.connected || !redisClient.isOpen) return;
    try {
      await redisClient.set(`presence:${userId}`, "1", { EX: 15 });
    } catch (err) {
      console.error(`[heartbeat] Error for user ${userId}:`, err);
    }
  }
}
