import { withTracePayload } from "@repo/telemetry-node";
/**
 * Shared game-termination logic for resign and draw.
 *
 * Both normal and tournament games go through `terminateGame`, which:
 *  - updates Redis game state
 *  - pushes to match:process:results (sync-worker → DB + ratings)
 *  - cleans up matchmaking pointers (no-op for tournament games, safe regardless)
 *  - for tournaments: eagerly removes schedule/active-game entries so the next
 *    scheduled game is immediately visible without waiting for the sync-worker
 *  - for normal games: writes a rematch context key for the GameOverModal
 */

import { redisClient } from "@repo/redis-client";
import { removeGameFromSchedule } from "../shared/game-state.js";

// ── Field list ────────────────────────────────────────────────────────────────

export const GAME_TERMINATION_FIELDS = [
  "current_fen",
  "game_state",
  "last_move_time",
  "white_player_id",
  "black_player_id",
  "player1_id",
  "player2_id",
  "player1_rating",
  "player2_rating",
  "player1_profile_image_url",
  "player2_profile_image_url",
  "player1_username",
  "player2_username",
  "white_player_left_time",
  "black_player_left_time",
  "time_slot",
  "is_rated",
  "increment",
  "tournament_id",
  "tournament_type",
  "round_id",
  "group_id",
  "match_id",
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FullGameState {
  currentFen: string | null;
  gameState: string | null;
  lastMoveTime: string | null;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  player1Id: string | null;
  player2Id: string | null;
  player1Rating: string | null;
  player2Rating: string | null;
  player1ProfileImageUrl: string | null;
  player2ProfileImageUrl: string | null;
  player1Username: string | null;
  player2Username: string | null;
  whiteLeftTime: string | null;
  blackLeftTime: string | null;
  timeSlot: string | null;
  isRated: string | null;
  increment: string | null;
  tournamentId: string | null;
  tournamentType: string | null;
  roundId: string | null;
  groupId: string | null;
  matchId: string | null;
}

export type GameEndStatus = "WHITE_WIN" | "BLACK_WIN" | "DRAW" | "ABORTED";
export type GameEndState = "RESIGN" | "DRAW" | "ABORTED";

export interface TerminateOpts {
  newGameState: GameEndState;
  winnerId: string | null;
  status: GameEndStatus;
  /** Extra Redis keys to delete atomically with the termination (e.g. draw offer keys). */
  extraCleanupKeys?: string[];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchGameTerminationState(
  gameId: string,
): Promise<FullGameState> {
  const vals = await redisClient.hmGet(`game:state:${gameId}`, [
    ...GAME_TERMINATION_FIELDS,
  ]);
  const [
    currentFen,
    gameState,
    lastMoveTime,
    whitePlayerId,
    blackPlayerId,
    player1Id,
    player2Id,
    player1Rating,
    player2Rating,
    player1ProfileImageUrl,
    player2ProfileImageUrl,
    player1Username,
    player2Username,
    whiteLeftTime,
    blackLeftTime,
    timeSlot,
    isRated,
    increment,
    tournamentId,
    tournamentType,
    roundId,
    groupId,
    matchId,
  ] = vals;

  return {
    currentFen: currentFen ?? null,
    gameState: gameState ?? null,
    lastMoveTime: lastMoveTime ?? null,
    whitePlayerId: whitePlayerId ?? null,
    blackPlayerId: blackPlayerId ?? null,
    player1Id: player1Id ?? null,
    player2Id: player2Id ?? null,
    player1Rating: player1Rating ?? null,
    player2Rating: player2Rating ?? null,
    player1ProfileImageUrl: player1ProfileImageUrl ?? null,
    player2ProfileImageUrl: player2ProfileImageUrl ?? null,
    player1Username: player1Username ?? null,
    player2Username: player2Username ?? null,
    whiteLeftTime: whiteLeftTime ?? null,
    blackLeftTime: blackLeftTime ?? null,
    timeSlot: timeSlot ?? null,
    isRated: isRated ?? null,
    increment: increment ?? null,
    tournamentId: tournamentId ?? null,
    tournamentType: tournamentType ?? null,
    roundId: roundId ?? null,
    groupId: groupId ?? null,
    matchId: matchId ?? null,
  };
}

// ── Core termination ──────────────────────────────────────────────────────────

export async function terminateGame(
  gameId: string,
  state: FullGameState,
  opts: TerminateOpts,
): Promise<void> {
  const { newGameState, winnerId, status, extraCleanupKeys = [] } = opts;
  const {
    player1Id,
    player2Id,
    whitePlayerId,
    blackPlayerId,
    player1Rating,
    player2Rating,
    player1ProfileImageUrl,
    player2ProfileImageUrl,
    player1Username,
    player2Username,
    whiteLeftTime,
    blackLeftTime,
    timeSlot,
    isRated,
    increment,
    tournamentId,
  } = state;

  const isTournament = !!tournamentId;
  const ops: Promise<unknown>[] = [];

  // 1. Persist new terminal state
  ops.push(
    redisClient.hSet(`game:state:${gameId}`, {
      game_state: newGameState,
      winner_id: winnerId ?? "",
    }),
  );

  // 2. Enqueue for sync-worker (DB write + rating update + tournament stats)
  ops.push(
    redisClient.xAdd("match:process:results", "*", {
      payload: JSON.stringify(
        withTracePayload({ gameId, winnerId: winnerId ?? null, status }),
      ),
    }),
  );

  // 3. Remove matchmaking pointers (safe no-op for tournament games)
  if (player1Id) ops.push(removeGameFromSchedule(player1Id, gameId));
  if (player2Id) ops.push(removeGameFromSchedule(player2Id, gameId));
  ops.push(redisClient.zRem("live:games", gameId));

  // 4. Delete any extra keys supplied by the caller (e.g. draw offer, stream IDs)
  if (extraCleanupKeys.length > 0) {
    ops.push(redisClient.unlink(extraCleanupKeys));
  }

  if (isTournament) {
    // 5a. Tournament: eagerly remove schedule entries so the next game is
    //     visible before the sync-worker finishes processing the result stream.
    for (const uid of [whitePlayerId, blackPlayerId]) {
      if (!uid) continue;
      ops.push(
        redisClient.hDel(`game:schedule:info:${uid}`, gameId),
        redisClient.zRem(`user:active:games:${uid}`, gameId),
      );
    }
  } else {
    // 5b. Normal game: store a short-lived rematch context for the GameOverModal.
    if (player1Id && player2Id) {
      const [smallerId, largerId] =
        player1Id < player2Id ? [player1Id, player2Id] : [player2Id, player1Id];
      const rematchKey = `game:rematch:${smallerId}:${largerId}`;

      let p1Str =
        player1Rating && player1Rating.trim() !== "" ? player1Rating : "1200";
      let p2Str =
        player2Rating && player2Rating.trim() !== "" ? player2Rating : "1200";
      let p1Rating = parseInt(p1Str, 10);
      let p2Rating = parseInt(p2Str, 10);
      if (isNaN(p1Rating)) p1Rating = 1200;
      if (isNaN(p2Rating)) p2Rating = 1200;

      ops.push(
        redisClient.hSet(rematchKey, {
          player1_id: player1Id,
          player1_rating: p1Rating.toString(),
          player1_profile_image_url: player1ProfileImageUrl ?? "",
          player1_username: player1Username ?? "",
          player2_id: player2Id,
          player2_rating: p2Rating.toString(),
          player2_profile_image_url: player2ProfileImageUrl ?? "",
          player2_username: player2Username ?? "",
          white_player_id: whitePlayerId ?? "",
          black_player_id: blackPlayerId ?? "",
          white_player_left_time: whiteLeftTime ?? "",
          black_player_left_time: blackLeftTime ?? "",
          increment: increment ?? "0",
          time_slot: timeSlot ?? "",
          is_rated: isRated ?? "false",
        }),
        redisClient.expire(rematchKey, 30),
      );
    }
  }

  await Promise.allSettled(ops);
}

// ── Payload helper ────────────────────────────────────────────────────────────

/**
 * Returns snake_case fields compatible with `buildGameStatePayload` in index.ts.
 */
export function buildTerminationData(
  state: FullGameState,
  newGameState: GameEndState,
  winnerId: string | null,
): Record<string, string | boolean | undefined | null> {
  return {
    current_fen: state.currentFen,
    game_state: newGameState,
    white_player_id: state.whitePlayerId,
    black_player_id: state.blackPlayerId,
    player1_id: state.player1Id,
    player2_id: state.player2Id,
    player1_rating: state.player1Rating,
    player2_rating: state.player2Rating,
    player1_profile_image_url: state.player1ProfileImageUrl,
    player2_profile_image_url: state.player2ProfileImageUrl,
    player1_username: state.player1Username,
    player2_username: state.player2Username,
    winner_id: winnerId,
    white_player_left_time: state.whiteLeftTime,
    black_player_left_time: state.blackLeftTime,
    time_slot: state.timeSlot,
    is_rated: state.isRated,
    tournament_id: state.tournamentId ?? undefined,
    tournament_type: state.tournamentType ?? undefined,
    round_id: state.roundId ?? undefined,
    group_id: state.groupId ?? undefined,
    match_id: state.matchId ?? undefined,
  };
}
