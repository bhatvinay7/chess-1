import { redisClient } from "@repo/redis-client";

// Returns the active game ID for a user, checking matchmaking:gameId first (normal
// games) and falling back to user:active:games ZSET (tournament games where
// matchmaking:gameId may have been overwritten by a later scheduled game or deleted
// after a previous game completed).
export async function getActiveGameId(userId: string): Promise<string | null> {
  const nowMs = Date.now();
  let activeOnlineGame: string | null = null;
  let activeTournamentGame: string | null = null;

  const futureEntries = await redisClient.zRange(
    `matchmaking:gameId:${userId}`,
    nowMs,
    "+inf",
    { BY: "SCORE" },
  );

  for (const entry of futureEntries) {
    const [gid] = entry.split(":");
    // For online matchmaking, any game whose endMs > nowMs is active.
    // There are no future-scheduled online games, so no startMs check is needed.
    // This also avoids bugs caused by ms-level clock skew between Rust matchmaker and Node server.
    activeOnlineGame = gid || entry || null;
    break;
  }

  // For RR double-headers both games are in user:active:games upfront.
  // Game 2 has a future start_ms score; filter to score ≤ now so it stays
  // invisible until release_rr_paired_game updates its score to now_ms.
  const active = await redisClient.zRange(
    `user:active:games:${userId}`,
    nowMs, // max (upper bound when REV=true)
    0, // min
    { BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 1 } },
  );
  if (active.length > 0) {
    activeTournamentGame = active[0] ?? null;
  }

  return activeTournamentGame || activeOnlineGame;
}

export async function removeGameFromSchedule(
  userId: string,
  gameId?: string,
): Promise<void> {
  if (!gameId) return;

  try {
    const members = await redisClient.zRange(
      `matchmaking:gameId:${userId}`,
      0,
      -1,
    );
    const target = members.find(
      (m) => m.startsWith(gameId + ":") || m === gameId,
    );
    if (target) {
      await redisClient.zRem(`matchmaking:gameId:${userId}`, target);
    }
  } catch (err) {
    console.error(`[removeGameFromSchedule] Error for ${userId}:`, err);
  }
}

export function buildGameStatePayload(
  gameId: string,
  gameData: Record<string, string | boolean | undefined | null>,
) {
  return {
    gameId,
    initialFen: gameData.initial_fen,
    currentFen: gameData.current_fen,
    gameState: gameData.game_state,
    whitePlayerId: gameData.white_player_id,
    blackPlayerId: gameData.black_player_id,
    player1Id: gameData.player1_id,
    player1Rating: gameData.player1_rating,
    player1ProfileImageUrl: gameData.player1_profile_image_url,
    player2Id: gameData.player2_id,
    player2Rating: gameData.player2_rating,
    player2ProfileImageUrl: gameData.player2_profile_image_url,
    winnerId: gameData.winner_id ?? null,
    blackPlayerLeftTime: gameData.black_player_left_time,
    whitePlayerLeftTime: gameData.white_player_left_time,
    time_slot: gameData.time_slot,
    isRated: gameData.is_rated === "true",
    tournamentId: gameData.tournament_id ?? undefined,
    tournamentType: gameData.tournament_type ?? undefined,
    roundId: gameData.round_id ?? undefined,
    groupId: gameData.group_id ?? undefined,
    matchId: gameData.match_id ?? undefined,
    leftGameStartTime: gameData.left_game_start_time
      ? Number(gameData.left_game_start_time)
      : undefined,
    pairedGameId: gameData.paired_game_id || undefined,
    gameMode: (gameData.gameMode as string) ?? "standard",
  };
}
