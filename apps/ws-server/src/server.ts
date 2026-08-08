import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { SocketIORedisAdapter, redisClient, connectRedisClient, PubSub } from "@repo/redis-client";
import { createGrpcClient } from "@repo/grpc-connection";
import type { ChessMoveServiceClient } from "@repo/grpc-connection";
import { handleLeaveSpectate } from "./utils/spectateHandler.js";
import { buildGameStatePayload } from "./shared/game-state.js";
import { syncGameTime } from "./utils/syncGameTime.js";
import {
  userSocketMap, socketUserMap, spectatorGameMap, socketSpectatingMap,
} from "./shared/socket-store.js";
import type { MatchmakingTicket } from "./shared/types.js";
import type {
  ClaimDrawSuccessResponse, DeclineDrawResponse, OfferDrawSuccessResponse, RematchOpponent,
} from "@repo/socket-types";

// Per-connection handlers
import { DrawHandler }       from "./events/handlers/draw.handler.js";
import { RematchHandler }    from "./events/handlers/rematch.handler.js";
import { ResignHandler }     from "./events/handlers/resign.handler.js";
import { SpectateHandler }   from "./events/handlers/spectate.handler.js";
import { TournamentHandler } from "./events/handlers/tournament.handler.js";
import { GameHandler }       from "./events/handlers/game.handler.js";

export class WebSocketServer {
  private readonly httpServer = createServer();
  private readonly io = new Server(this.httpServer, { cors: { origin: "*" } });
  private readonly grpcClient: ChessMoveServiceClient = createGrpcClient();

  async start(): Promise<void> {
    await SocketIORedisAdapter.setup(this.io);
    await connectRedisClient();

    await this.setupPubSub();
    this.setupConnections();

    const PORT = process.env.PORT ?? 8080;
    this.httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`WS server listening on port ${PORT}`);
    });
  }

  // ── Global PubSub subscriptions (registered once, not per-connection) ─────

  private async setupPubSub(): Promise<void> {
    try {
      await PubSub.pSubscribe("game:move:processed:*", async (message: string) => {
        const moveResult = JSON.parse(message);
        userSocketMap.get(moveResult.userId)?.emit("move_result", moveResult);
      });

      await PubSub.pSubscribe("game:move:invalid:*", async (message: string) => {
        const moveData = JSON.parse(message);
        userSocketMap.get(moveData.userId)?.emit("invalid_move", moveData);
      });

      // Relay move to the opponent (the player who did NOT make the move)
      await PubSub.pSubscribe("game:move:processed:*", async (message: string) => {
        const moveData = JSON.parse(message) as { gameId: string; userId: string };
        const { gameId, userId: moverId } = moveData;
        try {
          const [p1Id, p2Id] = await redisClient.hmGet(`game:state:${gameId}`, [
            "player1_id",
            "player2_id",
          ]);
          const opponentId = moverId === p1Id ? p2Id : p1Id;
          if (opponentId) {
            userSocketMap.get(opponentId)?.emit("opponent_move", moveData);
          }
        } catch (err) {
          console.error(`[opponent_move] Error routing move for game ${gameId}:`, err);
        }
      });

      await PubSub.pSubscribe("offer-draw:*", async (message: string) => {
        const data = JSON.parse(message) as OfferDrawSuccessResponse;
        if (data?.payload) {
          userSocketMap.get(data.payload.opponentId)?.emit("draw-request", data);
        }
      });

      await PubSub.pSubscribe("accept-draw:*", async (message: string) => {
        const data = JSON.parse(message) as ClaimDrawSuccessResponse;
        if (data) {
          userSocketMap.get(data.black_player_id!)?.emit("accept-draw", data);
          userSocketMap.get(data.white_player_id!)?.emit("accept-draw", data);
        }
      });

      await PubSub.pSubscribe("decline-draw:*", async (message: string) => {
        const data = JSON.parse(message) as DeclineDrawResponse;
        if (data?.opponentId) {
          userSocketMap.get(data.opponentId)?.emit("draw-declined", data);
        }
      });

      await PubSub.pSubscribe("rematch-request:*", async (message: string) => {
        const data = JSON.parse(message) as RematchOpponent;
        if (data?.receiverId) {
          userSocketMap.get(data.receiverId)?.emit("rematch-request", data);
        }
      });

      await PubSub.subscribe("game:matchmaking:started", async (message: string) => {
        const { p1, p2, game_id } = JSON.parse(message) as {
          p1: MatchmakingTicket;
          p2: MatchmakingTicket;
          game_id: string;
        };
        try {
          const nowMs = Date.now();
          await Promise.all([
            // Track in live:games so get_live_games can return ALL active games,
            // not just those already being spectated.
            redisClient.zAdd("live:games", { score: nowMs, value: game_id }),
          ]);
        } catch (err) {
          console.error(
            `[matchmaking:started] Failed to set gameId keys for game ${game_id}:`, err,
          );
        }

        await userSocketMap.get(p1.userId)?.join(`game:${game_id}`);
        await userSocketMap.get(p2.userId)?.join(`game:${game_id}`);
        userSocketMap.get(p1.userId)?.emit("match_found", { p1, p2, game_id });
        userSocketMap.get(p2.userId)?.emit("match_found", { p1, p2, game_id });

        const emitActiveGameFound = async (userId: string): Promise<void> => {
          const MAX_RETRIES = 3;
          const RETRY_DELAY_MS = 1000;
          let gameData: Record<string, string | boolean | undefined | null> = {};

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            gameData = await syncGameTime(game_id);
            if (gameData.current_fen && gameData.game_state) break;
            if (attempt < MAX_RETRIES) {
              await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
            }
          }

          if (gameData.current_fen && gameData.game_state) {
            userSocketMap.get(userId)?.emit(
              "active_game_found",
              buildGameStatePayload(game_id, gameData),
            );
          } else {
            console.warn(
              `[matchmaking:started] Game state not ready after retries for game ${game_id}, user ${userId}`,
            );
          }
        };

        emitActiveGameFound(p1.userId).catch((err) =>
          console.error(`[matchmaking:started] emitActiveGameFound failed for ${p1.userId}:`, err),
        );
        emitActiveGameFound(p2.userId).catch((err) =>
          console.error(`[matchmaking:started] emitActiveGameFound failed for ${p2.userId}:`, err),
        );
      });

      await PubSub.pSubscribe("game:spectate:move:*", async (message: string) => {
        const data = JSON.parse(message) as { gameId: string };
        if (spectatorGameMap.has(data.gameId)) {
          this.io.to(`spectate:${data.gameId}`).emit("spectate_move", data);
        }
      });
    } catch (err) {
      console.error("[WebSocketServer] Error setting up PubSub listeners:", err);
    }
  }

  // ── Per-connection handler registration ───────────────────────────────────

  private setupConnections(): void {
    this.io.on("connection", (socket: Socket) => {
      socket.on("register_user", (userId: string) => {
        const prev = userSocketMap.get(userId);
        if (prev && prev.id !== socket.id) socketUserMap.delete(prev.id);
        userSocketMap.set(userId, socket);
        socketUserMap.set(socket.id, userId);
      });

      // Register modular handlers
      new GameHandler(this.io, socket, this.grpcClient).register();
      new DrawHandler(this.io, socket).register();
      new ResignHandler(this.io, socket).register();
      new RematchHandler(this.io, socket).register();
      new SpectateHandler(this.io, socket, this.grpcClient).register();
      new TournamentHandler(this.io, socket).register();

      socket.on("disconnect", async () => {
        console.log(`Socket ${socket.id} disconnected`);
        const userId = socketUserMap.get(socket.id);
        if (userId && userSocketMap.get(userId)?.id === socket.id) {
          userSocketMap.delete(userId);
        }
        socketUserMap.delete(socket.id);

        const spectatingGameId = socketSpectatingMap.get(socket.id);
        if (spectatingGameId) {
          await handleLeaveSpectate(
            socket.id, spectatingGameId, spectatorGameMap, socketSpectatingMap,
          );
        }
      });
    });
  }
}
