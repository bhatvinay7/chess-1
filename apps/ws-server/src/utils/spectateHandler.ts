import { Chess } from "chess.js";
import { redisClient } from "@repo/redis-client";
import type { Server as IOServer, Socket } from "socket.io";
import type { ChessMoveServiceClient } from "@repo/grpc-connection";
import { registerSpectatedGameGrpc } from "@repo/grpc-connection";

// ── Types ────────────────────────────────────────────────────────────────────

export type SpectatorGameMap = Map<string, Set<string>>; // gameId → Set<socketId>
export type SocketSpectateMap = Map<string, string>; // socketId → gameId

export interface SpectateState {
  current_fen: string | null;
  game_state: string | null;
  white_player_left_time: string;
  black_player_left_time: string;
  white_player_id?: string | null;
  black_player_id?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  player1_rating?: string | null;
  player2_rating?: string | null;
  player1_profile_image_url?: string | null;
  player2_profile_image_url?: string | null;
  player1_username?: string | null;
  player2_username?: string | null;
  winner_id?: string | null;
  time_slot?: string | null;
  is_rated?: string | null;
}

const SPECTATORS_HASH = "spectators:active";
const SPECTATE_PREFIX = "game:spectate:state:";

// ── syncSpectateTime ─────────────────────────────────────────────────────────
// Reads from the secondary spectate copy (not the primary player state) and
// applies the same elapsed-time correction as syncGameTime does.

const SPECTATE_FIELDS = [
  "current_fen",
  "last_move_time",
  "black_player_left_time",
  "white_player_left_time",
  "black_player_id",
  "white_player_id",
  "player1_profile_image_url",
  "player2_profile_image_url",
  "player1_rating",
  "player2_rating",
  "player1_username",
  "player2_username",
  "player1_id",
  "player2_id",
  "game_state",
  "winner_id",
  "time_slot",
  "is_rated",
] as const;

export async function syncSpectateTime(gameId: string): Promise<SpectateState> {
  let values = await redisClient.hmGet(`${SPECTATE_PREFIX}${gameId}`, [
    ...SPECTATE_FIELDS,
  ]);

  // Spectate copy missing (gRPC failed or last spectator just left) —
  // fall back to the live game state which has the same field layout.
  if (!values[0]) {
    values = await redisClient.hmGet(`game:state:${gameId}`, [
      ...SPECTATE_FIELDS,
    ]);
  }

  const [
    currentFen,
    lastMoveTime,
    black_left,
    white_left,
    black_player_id,
    white_player_id,
    p1Pic,
    p2Pic,
    p1Rating,
    p2Rating,
    p1Username,
    p2Username,
    player1_id,
    player2_id,
    game_state,
    winner_id,
    time_slot,
    is_rated,
  ] = values;

  if (!currentFen)
    return {
      current_fen: null,
      game_state: null,
      white_player_left_time: "0",
      black_player_left_time: "0",
    };

  const turn = currentFen.split(" ")[1] as "w" | "b";
  const lastMoveSec = parseInt(lastMoveTime ?? "0") || 0;
  const elapsed =
    lastMoveSec > 0 ? Math.floor(Date.now() / 1000) - lastMoveSec : 0;

  let whiteLeft = parseInt(white_left ?? "0") || 0;
  let blackLeft = parseInt(black_left ?? "0") || 0;

  // Apply elapsed-time correction only for live games
  if (!game_state || game_state === "IN_PROGRESS") {
    if (turn === "w") whiteLeft = Math.max(0, whiteLeft - elapsed);
    else blackLeft = Math.max(0, blackLeft - elapsed);
  }

  return {
    current_fen: currentFen,
    game_state: game_state ?? "IN_PROGRESS",
    white_player_left_time: String(whiteLeft),
    black_player_left_time: String(blackLeft),
    white_player_id,
    black_player_id,
    player1_id,
    player2_id,
    player1_rating: p1Rating,
    player2_rating: p2Rating,
    player1_profile_image_url: p1Pic,
    player2_profile_image_url: p2Pic,
    player1_username: p1Username,
    player2_username: p2Username,
    winner_id,
    time_slot,
    is_rated,
  };
}

// ── buildSpectatePayload ─────────────────────────────────────────────────────
// Converts raw SpectateState into the shape emitted to the client as
// "spectate_game_state" (same wire format as "game_state" for consistency).

export function buildSpectatePayload(gameId: string, s: SpectateState) {
  return {
    gameId,
    currentFen: s.current_fen,
    gameState: s.game_state,
    whitePlayerId: s.white_player_id,
    blackPlayerId: s.black_player_id,
    player1Id: s.player1_id,
    player1Username: s.player1_username,
    player1Rating: s.player1_rating,
    player1ProfileImageUrl: s.player1_profile_image_url,
    player2Id: s.player2_id,
    player2Username: s.player2_username,
    player2Rating: s.player2_rating,
    player2ProfileImageUrl: s.player2_profile_image_url,
    winnerId: s.winner_id ?? null,
    blackPlayerLeftTime: s.black_player_left_time,
    whitePlayerLeftTime: s.white_player_left_time,
    time_slot: s.time_slot,
    isRated: s.is_rated === "true",
  };
}

// ── handleWatchGame ───────────────────────────────────────────────────────────
// Called when a socket emits "watch_game".
//
// First-watcher path:
//   1. Increment spectators:active counter
//   2. Await RegisterSpectatedGame gRPC call (which atomically creates the
//      spectate state copy on the game-server before returning)
//   3. Read from game:spectate:state and emit to the new spectator
//
// Subsequent-watcher path:
//   1. Increment counter
//   2. Read from the existing game:spectate:state copy
//   3. Emit to the new spectator

export async function handleWatchGame(
  socket: Socket,
  gameId: string,
  spectatorGameMap: SpectatorGameMap,
  socketSpectateMap: SocketSpectateMap,
  grpcClient: ChessMoveServiceClient,
): Promise<void> {
  // De-duplicate: leave previous spectated game before switching
  const prev = socketSpectateMap.get(socket.id);
  if (prev && prev !== gameId) {
    await handleLeaveSpectate(
      socket.id,
      prev,
      spectatorGameMap,
      socketSpectateMap,
    );
  }
  if (socketSpectateMap.get(socket.id) === gameId) return; // already watching

  // Join the room immediately — before the gRPC registration — so no move
  // published by the Rust server (which starts after RegisterSpectatedGame
  // returns) can arrive between the gRPC call and the room join.
  await socket.join(`spectate:${gameId}`);

  if (!spectatorGameMap.has(gameId)) {
    spectatorGameMap.set(gameId, new Set());
  }
  const watchers = spectatorGameMap.get(gameId)!;
  const isFirstWatcher = watchers.size === 0;

  watchers.add(socket.id);
  socketSpectateMap.set(socket.id, gameId);

  if (isFirstWatcher) {
    // Create the spectate-state copy BEFORE incrementing spectators:active.
    // Incrementing first opens a race: another socket calling get_live_games
    // would see the gameId in spectators:active but syncSpectateTime would
    // find no copy yet and return null — dropping the game from the watch list.
    try {
      await registerSpectatedGameGrpc(grpcClient, gameId);
    } catch (err) {
      console.error(
        `[watch_game] RegisterSpectatedGame failed for ${gameId}:`,
        err,
      );
    }
  }

  // Copy is guaranteed to exist now (created above for first watcher,
  // or already present for subsequent watchers).
  await redisClient.hIncrBy(SPECTATORS_HASH, gameId, 1);

  // Deliver current game state from the secondary copy.
  const state = await syncSpectateTime(gameId);
  if (state.current_fen && state.game_state) {
    socket.emit("spectate_game_state", buildSpectatePayload(gameId, state));
  }
}

// ── handleLeaveSpectate ───────────────────────────────────────────────────────
// Called when a socket emits "leave_spectate" or disconnects.
//
// When the last spectator leaves the room:
//   - Deletes spectators:active field
//   - Deletes game:spectate:state:{gameId} (secondary copy no longer needed)
//
// Otherwise, decrements the counter only.

export async function handleLeaveSpectate(
  socketId: string,
  gameId: string,
  spectatorGameMap: SpectatorGameMap,
  socketSpectateMap: SocketSpectateMap,
): Promise<void> {
  const watchers = spectatorGameMap.get(gameId);
  if (!watchers) return;

  watchers.delete(socketId);
  socketSpectateMap.delete(socketId);

  if (watchers.size === 0) {
    spectatorGameMap.delete(gameId);
    await Promise.all([
      redisClient.hDel(SPECTATORS_HASH, gameId),
      redisClient.del(`${SPECTATE_PREFIX}${gameId}`),
    ]).catch((err: unknown) =>
      console.error(`[leave_spectate] cleanup failed for ${gameId}:`, err),
    );
  } else {
    await redisClient
      .hIncrBy(SPECTATORS_HASH, gameId, -1)
      .catch((err: unknown) =>
        console.error(`[leave_spectate] hIncrBy failed for ${gameId}:`, err),
      );
  }
}
