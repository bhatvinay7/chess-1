import { Server, Socket } from "socket.io";
import { redisClient } from "@repo/redis-client";
import {
  handleWatchGame, handleLeaveSpectate, syncSpectateTime,
} from "../../utils/spectateHandler.js";
import { spectatorGameMap, socketSpectatingMap } from "../../shared/socket-store.js";
import type { ChessMoveServiceClient } from "@repo/grpc-connection";

export class SpectateHandler {
  constructor(
    private io: Server,
    private socket: Socket,
    private grpcClient: ChessMoveServiceClient,
  ) {}

  register(): void {
    this.socket.on("watch_game", ({ gameId }: { gameId: string }) =>
      this.onWatchGame(gameId));

    this.socket.on("leave_spectate", ({ gameId }: { gameId: string }) =>
      this.onLeaveSpectate(gameId));

    this.socket.on("get_live_games", () => this.onGetLiveGames());
  }

  private async onWatchGame(gameId: string): Promise<void> {
    await handleWatchGame(
      this.socket, gameId, spectatorGameMap, socketSpectatingMap, this.grpcClient,
    );
  }

  private async onLeaveSpectate(gameId: string): Promise<void> {
    await handleLeaveSpectate(
      this.socket.id, gameId, spectatorGameMap, socketSpectatingMap,
    );
  }

  // Returns every active game tracked in live:games (all games, not just spectated ones).
  // spectators:active is checked separately to include spectator counts.
  private async onGetLiveGames(): Promise<void> {
    try {
      const [gameIds, spectatorHash] = await Promise.all([
        redisClient.zRange("live:games", 0, -1),
        redisClient.hGetAll("spectators:active"),
      ]);

      if (gameIds.length === 0) {
        this.socket.emit("live_games_list", { games: [] });
        return;
      }

      const results = await Promise.all(
        gameIds.map(async (gameId) => {
          const s = await syncSpectateTime(gameId);
          if (!s.current_fen || !s.game_state) return null;
          if (s.game_state !== "IN_PROGRESS" && s.game_state !== "INITIALIZED") return null;

          return {
            gameId,
            gameState:     s.game_state,
            player1: {
              id:           s.player1_id               ?? null,
              username:     s.player1_username          ?? "Player 1",
              rating:       parseInt(s.player1_rating   ?? "0", 10),
              profileImage: s.player1_profile_image_url ?? null,
            },
            player2: {
              id:           s.player2_id               ?? null,
              username:     s.player2_username          ?? "Player 2",
              rating:       parseInt(s.player2_rating   ?? "0", 10),
              profileImage: s.player2_profile_image_url ?? null,
            },
            whitePlayerId:  s.white_player_id ?? null,
            blackPlayerId:  s.black_player_id ?? null,
            timeSlot:       s.time_slot       ?? "5+0",
            isRated:        s.is_rated        === "true",
            spectatorCount: parseInt(spectatorHash[gameId] ?? "0", 10),
          };
        }),
      );

      const seen = new Set<string>();
      const unique = results.filter((g): g is NonNullable<typeof g> => {
        if (!g || seen.has(g.gameId)) return false;
        seen.add(g.gameId);
        return true;
      });

      this.socket.emit("live_games_list", { games: unique });
    } catch (err) {
      console.error("[get_live_games] error:", err);
      this.socket.emit("live_games_list", { games: [] });
    }
  }
}
