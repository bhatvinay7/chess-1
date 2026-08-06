import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { Chess } from "chess.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
dotenv.config()
import {
  redisClient,
  connectRedisClient,
  PubSub,
} from "@repo/redis-client";
import type {
  MoveRequest,
  MoveResponse,
  ProcessMoveHandler,
  SpectateRequest,
  SpectateResponse,
} from "./types.js";

// Games that have at least one spectator — populated by RegisterSpectatedGame.
const watchedGames = new Set<string>();

async function removeGameFromSchedule(userId: string, gameId: string): Promise<void> {
  try {
    if (!userId) return;
    const key = `matchmaking:gameId:${userId}`;
    const members = await redisClient.zRange(key, 0, -1);
    for (const member of members) {
      if (member === gameId || member.startsWith(`${gameId}:`)) {
        await redisClient.zRem(key, member);
      }
    }
  } catch (err) {
    console.error(`[removeGameFromSchedule] Failed for ${userId}:`, err);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROTO_PATH = join(__dirname, "..", "proto", "chess.proto");

export function toSafeFen(fen: string): string {
  if (!fen || fen === "startpos") return fen;
  try {
    const parts = fen.split(" ");
    if (parts.length >= 3) {
      if (parts[2] && parts[2] !== "-" && !/^[KQkq]+$/.test(parts[2])) {
        parts[2] = "KQkq";
      }
    }
    return parts.join(" ");
  } catch {
    return fen;
  }
}

const processMove: ProcessMoveHandler = async (call, callback) => {
  const { game_id, user_id, from, to, promotion } = call.request;
  
  const invalidResponse = (reason: string): MoveResponse => ({
    valid: false,
    new_fen: "",
    game_status: "",
    turn: "",
    is_game_over: false,
    black_player_left_time: 0,
    white_player_left_time: 0,
    error_reason: reason,
    game_id,
    user_id,
    move_from: from,
    move_to: to,
    move_promotion: promotion,
    game_mode: "standard",
  });
  
  try {
    const hashKey = `game:state:${game_id}`;
    
    const gameData = await redisClient.hGetAll(hashKey);
    if (!gameData.current_fen) {
      const reason = `Game state not found for game ${game_id}`;
      console.error(`[gRPC ProcessMove] ${reason}`);
      callback(null, invalidResponse(reason));
      return;
    }
    
    let chess = new Chess(toSafeFen(gameData.current_fen));
    const turn = chess.turn() === "w" ? "WHITE_TO_MOVE" : "BLACK_TO_MOVE";
    let moveResult: ReturnType<typeof chess.move> | null = null;
    try {
      moveResult = chess.move({
        from,
        to,
        promotion: promotion || undefined,
      });
    } catch {
      moveResult = null;
    }

    if (!moveResult) {
      await PubSub.publish(
        `game:move:invalid:${game_id}`,
        JSON.stringify({
          gameId: game_id,
          userId: user_id,
          move: { from, to, promotion },
          reason: "Illegal move according to chess rules.",
        }),
      );
      callback(null, invalidResponse("Illegal move according to chess rules."));
      return;
    }


    const newFen = chess.fen();
    const isGameOver = chess.isGameOver();
    const isCheckmate = chess.isCheckmate();
    const isDraw = chess.isDraw();

    const currentTime = Date.now() / 1000;
    let black_player_left_time = parseFloat(gameData.black_player_left_time ?? "300");
    let white_player_left_time = parseFloat(gameData.white_player_left_time ?? "300");
    const lastGameMoveTime = parseFloat(gameData.last_move_time ?? "0");
    const increment = parseFloat(gameData.increment ?? "0");
    const MOVE_COMPENSATION_S = 0.1; // 100ms lag compensation per move
    let finalState = isGameOver
      ? isCheckmate
        ? "CHECKMATE"
        : isDraw
          ? "DRAW"
          : "GAME_OVER"
      : "IN_PROGRESS";

    // null means no timeout winner yet; set inside the IN_PROGRESS block if clock hits 0
    let timeoutWinnerId: string | null = null;
    let timeoutStatus: "WHITE_WIN" | "BLACK_WIN" | null = null;

    const timeElapsed = lastGameMoveTime > 0 ? Math.max(0, currentTime - lastGameMoveTime) : 0;

    const updates: Record<string, string> = {
        current_fen: newFen,
        game_state: finalState,
    };

    if (finalState === "IN_PROGRESS") {
      updates.last_move_time = String(currentTime);

      if (chess.turn() === "b") {
        // Black to move next → white just moved → deduct from white's clock
        white_player_left_time = Math.max(0, (white_player_left_time + increment) - timeElapsed);
        updates.white_player_left_time = String(white_player_left_time);
        if (white_player_left_time === 0) {
          finalState = "TIMEOUT";
          timeoutWinnerId = gameData.black_player_id ?? null;
          timeoutStatus = "BLACK_WIN";
        }
      } else {
        // White to move next → black just moved → deduct from black's clock
        black_player_left_time = Math.max(0, (black_player_left_time + increment) - timeElapsed);
        updates.black_player_left_time = String(black_player_left_time);
        if (black_player_left_time === 0) {
          finalState = "TIMEOUT";
          timeoutWinnerId = gameData.white_player_id ?? null;
          timeoutStatus = "WHITE_WIN";
        }
      }

      updates.game_state = finalState;
    }

  const redisOperations: Promise<any>[] = [
      redisClient.hSet(hashKey, updates),
      redisClient.xAdd(`game:moveshistory:${game_id}`, "*", {
      userId: user_id,
      move: JSON.stringify({ from, to, promotion, fen_after: newFen, san: "", moveNumber: chess.moveNumber(), time_taken: timeElapsed }),
    })
  ];
    if (finalState !== "IN_PROGRESS") {
      let winnerId: string | null;
      let status: string;

      if (finalState === "TIMEOUT") {
        winnerId = timeoutWinnerId;
        status = timeoutStatus!;
      } else if (isCheckmate) {
        // after chess.move(), chess.turn() is the checkmated player → winner is the other
        winnerId = chess.turn() === "w"
          ? (gameData.black_player_id ?? null)
          : (gameData.white_player_id ?? null);
        status = chess.turn() === "w" ? "BLACK_WIN" : "WHITE_WIN";
      } else {
        winnerId = null;
        status = "DRAW";
      }

      redisOperations.push(
        // Trigger full DB sync in sync-worker (moves, Game update, ratings, tournament stats,
        // scheduling cleanup: game:schedule / user:active:games).
        redisClient.xAdd('match:process:results', "*", {
          payload: JSON.stringify({ gameId: game_id, winnerId, status }),
        }),
        // Remove matchmaking game-ID pointers so arena join sees no active game.
        // No-op (returns 0) for tournament games where these keys are not set.
        removeGameFromSchedule(gameData.white_player_id!, game_id),
        removeGameFromSchedule(gameData.black_player_id!, game_id),
        // Remove from live:games so the watch list stops showing this game.
        redisClient.zRem("live:games", game_id),
      );

      // Rematch context is only meaningful for casual (non-tournament) games.
      if (!gameData.tournament_id) {
        const [smallerId, largerId] = gameData.player1_id! < gameData.player2_id! ? [gameData.player1_id, gameData.player2_id] : [gameData.player2_id, gameData.player1_id];
        const key = `game:rematch:${smallerId}:${largerId}`;
        redisOperations.push(
          redisClient.hSet(key, {
            player1_id: gameData.player1_id!,
            player1_rating: gameData.player1_rating!,
            player1_profile_image_url: gameData.player1_profile_image_url || "",
            player1_username: gameData.player1_username!,
            player2_id: gameData.player2_id!,
            player2_rating: gameData.player2_rating!,
            player2_profile_image_url: gameData.player2_profile_image_url || "",
            player2_username: gameData.player2_username!,
            white_player_id: gameData.white_player_id!,
            black_player_id: gameData.black_player_id!,
            increment: gameData.increment!,
            time_slot: gameData.time_slot!,
            is_rated: gameData.is_rated!,
          }),
          redisClient.expire(key, 30),
        );
      }

      // Eager scheduling cleanup for tournament games.
      // The sync-worker will also clean these up after processing match:process:results,
      // but that has a stream-consumer delay.  Removing here immediately lets
      // join_arena find the next scheduled game (e.g. game 2 of an RR pair) without
      // waiting.  All ZREM / HDEL calls are idempotent (return 0 when already absent).
      if (gameData.tournament_id) {
        for (const uid of [gameData.white_player_id, gameData.black_player_id]) {
          if (!uid) continue;
          redisOperations.push(
            redisClient.zRem(`game:schedule:${uid}`, game_id),
            redisClient.hDel(`game:schedule:info:${uid}`, game_id),
            redisClient.zRem(`user:active:games:${uid}`, game_id),
          );
        }
      }
    }
    // Use allSettled so a single failing op (e.g. xAdd) doesn't abort the
    // live:games removal and matchmaking pointer cleanup.
    const settled = await Promise.allSettled(redisOperations);
    for (const r of settled) {
      if (r.status === "rejected") {
        console.error("[gRPC ProcessMove] Redis op failed:", r.reason);
      }
    }

    // Guarantee live:games removal even if the batch partially failed.
    if (finalState !== "IN_PROGRESS") {
      try {
        await redisClient.zRem("live:games", game_id);
      } catch (e) {
        console.error("[gRPC ProcessMove] Failed to remove from live:games:", e);
      }
    }

    try {
      const movePayload = JSON.stringify({
        gameId: game_id,
        userId: user_id,
        move: { from, to, promotion },
        newFen,
        gameStatus: finalState,
        blackPlayerLeftTime: black_player_left_time,
        whitePlayerLeftTime: white_player_left_time,
        increment,
        turn: chess.turn(),
        timeTakenMs: Math.round(timeElapsed * 1000),
      });

      await PubSub.publish(`game:move:processed:${game_id}`, movePayload);

      if (watchedGames.has(game_id)) {
        await redisClient.hSet(`game:spectate:state:${game_id}`, {
          current_fen: newFen,
          game_state: finalState,
          white_player_left_time: String(white_player_left_time),
          black_player_left_time: String(black_player_left_time),
          last_move_time: String(currentTime),
        });
        await PubSub.publish(`game:spectate:move:${game_id}`, movePayload);
      }
    } catch (e) {
      console.error("[gRPC ProcessMove] Failed to publish move result:", e);
    }
    console.log(
      `[gRPC] Processed move ${from}→${to} for game ${game_id} (${finalState})`,
    );

    callback(null, {
      valid: true,
      new_fen: newFen,
      game_status: finalState,
      turn,
      is_game_over: isGameOver,
      black_player_left_time:black_player_left_time,
      white_player_left_time:white_player_left_time,
      error_reason: "",
      game_id,
      user_id,
      move_from: from,
      move_to: to,
      move_promotion: promotion,
      game_mode: gameData.gameMode || "standard",
    });
  } catch (err) {
    console.error(`[gRPC ProcessMove] Unexpected error for game ${game_id}:`, err);
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
};


const registerSpectatedGame = async (
  call: grpc.ServerUnaryCall<SpectateRequest, SpectateResponse>,
  callback: grpc.sendUnaryData<SpectateResponse>,
): Promise<void> => {
  const { game_id } = call.request;
  watchedGames.add(game_id);

  // Copy current game state into the secondary spectate hash so spectators
  // who join mid-game get an accurate snapshot.
  try {
    const src = `game:state:${game_id}`;
    const dst = `game:spectate:state:${game_id}`;
    const exists = await redisClient.exists(dst);
    if (!exists) {
      await redisClient.copy(src, dst);
    }
  } catch (err) {
    console.error(`[gRPC RegisterSpectatedGame] copy failed for ${game_id}:`, err);
  }

  console.log(`[gRPC] Spectate registered for game ${game_id}`);
  callback(null, { success: true });
};

export async function startGrpcServer(
  port: number = parseInt(process.env.GRPC_PORT! ?? "50051", 10),
): Promise<grpc.Server> {
  // Ensure the shared Redis client is connected before accepting RPCs.
  await connectRedisClient();

  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    
       // field names match proto snake_case
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = grpc.loadPackageDefinition(packageDef) as any;
  const ChessMoveService = proto.chess.ChessMoveService as {
    service: grpc.ServiceDefinition;
  };

  const server = new grpc.Server();
  server.addService(ChessMoveService.service, {
    ProcessMove: processMove,
    RegisterSpectatedGame: registerSpectatedGame,
  });

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),


      (err) => {
        if (err) { reject(err); return; }
        resolve();
      },
    );
  });

  console.log(`[gRPC] ChessMoveService listening on 0.0.0.0:${port}`);
  return server;
}
