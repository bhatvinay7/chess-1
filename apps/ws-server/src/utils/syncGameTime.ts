import { redisClient } from "@repo/redis-client";
import { removeGameFromSchedule } from "../shared/game-state.js";

export async function syncGameTime(game_id: string) {
  const fields = [
    "initial_fen",
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
    "increment",
    "gameMode",
    // Tournament-specific fields — empty string / null for regular games
    "tournament_id",
    "tournament_type",
    "round_id",
    "group_id",
    "match_id",
    "left_game_start_time",
  ];

  const [
    initialFen,
    currentFen,
    last_move_time,
    black_player_left_time,
    white_player_left_time,
    black_player_id,
    white_player_id,
    player1_profile_image_url,
    player2_profile_image_url,
    player1_rating_str,
    player2_rating_str,
    player1_username,
    player2_username,
    player1_id,
    player2_id,
    game_state,
    winner_id,
    time_slot,
    is_rated,
    increment,
    gameMode,
    tournament_id,
    tournament_type,
    round_id,
    group_id,
    match_id,
    left_game_start_time,
  ] = await redisClient.hmGet(`game:state:${game_id}`, fields);

  if (!currentFen) {
    return { current_fen: null, game_state: null };
  }

  const initial_fen = initialFen || "startpos";

  const turn = currentFen.split(" ")[1] as "w" | "b";
  const lastMoveTime = parseInt(last_move_time!) || 0;
  const currentTime = Math.floor(Date.now() / 1000);
  const elapsed = lastMoveTime > 0 ? currentTime - lastMoveTime : 0;

  let whiteLeftTime = parseInt(white_player_left_time!) || 0;
  let blackLeftTime = parseInt(black_player_left_time!) || 0;

  // Subtract elapsed time only from the player whose clock is currently ticking.
  if (turn === "w") {
    whiteLeftTime = Math.max(0, whiteLeftTime - elapsed);
  } else {
    blackLeftTime = Math.max(0, blackLeftTime - elapsed);
  }

  // Shared tournament fields — undefined for regular games so buildGameStatePayload
  // keeps them out of the payload instead of sending empty strings to the client.
  const tournamentFields = {
    tournament_id: tournament_id || undefined,
    tournament_type: tournament_type || undefined,
    round_id: round_id || undefined,
    group_id: group_id || undefined,
    match_id: match_id || undefined,
    left_game_start_time: left_game_start_time || undefined,
  };

  // Tournament game not started yet — return stored times unchanged so the
  // clock display shows the full initial time, not an inflated value from the
  // negative elapsed calculation (currentTime - future_start < 0).
  if (left_game_start_time) {
    const startMs = Number(left_game_start_time);
    if (Date.now() < startMs) {
      return {
        initial_fen: initial_fen,
        current_fen: currentFen!,
        game_state: game_state ?? "INITIALIZED",
        turn: turn === "w" ? "WHITE_TO_MOVE" : "BLACK_TO_MOVE",
        white_player_left_time: white_player_left_time!,
        black_player_left_time: black_player_left_time!,
        white_player_id,
        black_player_id,
        player1_profile_image_url,
        player2_profile_image_url,
        player1_rating: player1_rating_str,
        player2_rating: player2_rating_str,
        player1_username: player1_username!,
        player2_username: player2_username!,
        player1_id,
        player2_id,
        winner_id,
        time_slot,
        is_rated,
        gameMode,
        ...tournamentFields,
      };
    }
  }

  // If the game is already over, return stored state without writing anything.
  if (
    game_state &&
    game_state !== "IN_PROGRESS" &&
    game_state !== "INITIALIZED"
  ) {
    return {
      initial_fen: initial_fen,
      current_fen: currentFen!,
      game_state,
      turn: turn === "w" ? "WHITE_TO_MOVE" : "BLACK_TO_MOVE",
      white_player_left_time: String(whiteLeftTime),
      black_player_left_time: String(blackLeftTime),
      white_player_id,
      black_player_id,
      player1_profile_image_url,
      player2_profile_image_url,
      player1_rating: player1_rating_str,
      player2_rating: player2_rating_str,
      player1_username: player1_username!,
      player2_username: player2_username!,
      player1_id,
      player2_id,
      winner_id,
      time_slot,
      is_rated,
      gameMode,
      ...tournamentFields,
    };
  }

  // Timeout: active player ran out of time before checkmate — opponent wins.
  const timedOut =
    (turn === "w" && whiteLeftTime === 0) ||
    (turn === "b" && blackLeftTime === 0);
  if (timedOut) {
    // Guard: verify game:state still exists before writing GAME_OVER.
    // For tournament games the sync-worker may have already processed and deleted
    // the key, in which case we must not create a ghost hash that would trigger
    // a second (broken) result message.
    const stateExists = await redisClient.exists(`game:state:${game_id}`);
    if (!stateExists) {
      console.warn(
        `[syncGameTime] game:state:${game_id} already deleted — skipping timeout write`,
      );
      return { current_fen: null, game_state: null };
    }

    // The winner is the opponent — the player who still had time remaining.
    const timeoutWinnerId = turn === "w" ? black_player_id : white_player_id;
    const timeoutStatus = turn === "w" ? "BLACK_WIN" : "WHITE_WIN";

    // Mark game over in Redis FIRST so that any concurrent syncGameTime call
    // sees the terminal state and skips re-publishing to the result stream.
    await redisClient.hSet(`game:state:${game_id}`, {
      game_state: "GAME_OVER",
      winner_id: timeoutWinnerId ?? "",
      white_player_left_time: String(whiteLeftTime),
      black_player_left_time: String(blackLeftTime),
    });

    // Publish result to sync-worker stream and clean up matchmaking pointers.
    // Rematch context is only meaningful for casual (non-tournament) games.
    const postTimeoutOps: Promise<unknown>[] = [
      // Trigger full DB sync: moves, Game update, rating, tournament stats,
      // and scheduling cleanup (game:schedule / user:active:games).
      redisClient.xAdd("match:process:results", "*", {
        payload: JSON.stringify({
          gameId: game_id,
          winnerId: timeoutWinnerId ?? null,
          status: timeoutStatus,
        }),
      }),
      // Remove the matchmaking game-ID pointer so arena join sees no active game.
      // No-op (returns 0) for tournament games where this key is not set.
      removeGameFromSchedule(player1_id!, game_id),
      removeGameFromSchedule(player2_id!, game_id),
      redisClient.zRem("live:games", game_id),
    ];

    // Eager scheduling cleanup for tournament games (timeout path).
    // The game is NOT from the matchmaking queue (no matchmaking:gameId pointer),
    // so game:schedule and user:active:games must be updated here immediately.
    // The sync-worker will repeat this cleanup idempotently after processing
    // match:process:results; ZREM / HDEL return 0 when the entry is already gone.
    if (tournament_id && white_player_id && black_player_id) {
      for (const uid of [white_player_id, black_player_id]) {
        postTimeoutOps.push(
          redisClient.hDel(`game:schedule:info:${uid}`, game_id),
          redisClient.zRem(`user:active:games:${uid}`, game_id),
        );
      }
    }

    if (!tournament_id) {
      const [smallerId, largerId] =
        player1_id! < player2_id!
          ? [player1_id, player2_id]
          : [player2_id, player1_id];
      const rematchKey = `game:rematch:${smallerId}:${largerId}`;
      const INITIAL_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const timeSlotBase = parseInt(time_slot?.split("+")?.[0] ?? "5", 10);
      const initialTimeSec = String(timeSlotBase * 60);
      postTimeoutOps.push(
        redisClient
          .multi()
          .hSet(rematchKey, {
            player1_id: player1_id!,
            player1_rating: player1_rating_str!,
            player1_profile_image_url: player1_profile_image_url || "",
            player1_username: player1_username!,
            player2_id: player2_id!,
            player2_rating: player2_rating_str!,
            player2_profile_image_url: player2_profile_image_url || "",
            player2_username: player2_username!,
            white_player_id: white_player_id!,
            black_player_id: black_player_id!,
            white_player_left_time: initialTimeSec,
            black_player_left_time: initialTimeSec,
            current_fen: INITIAL_FEN,
            is_rated: is_rated!,
            time_slot: time_slot!,
            increment: increment || "0",
            last_move_time: "0",
            winner_id: "",
            game_state: "INITIALIZED",
          })
          .expire(rematchKey, 30)
          .exec(),
      );
    }

    const timeoutSettled = await Promise.allSettled(postTimeoutOps);
    for (const r of timeoutSettled) {
      if (r.status === "rejected") {
        console.error(
          `[syncGameTime] Post-timeout op failed for game ${game_id}:`,
          r.reason,
        );
      }
    }

    // Guarantee live:games removal even if the batch partially failed.
    try {
      await redisClient.zRem("live:games", game_id);
    } catch (e) {
      console.error(
        `[syncGameTime] Failed to remove game ${game_id} from live:games:`,
        e,
      );
    }

    return {
      initial_fen: initial_fen,
      current_fen: currentFen!,
      game_state: "GAME_OVER",
      turn: turn === "w" ? "WHITE_TO_MOVE" : "BLACK_TO_MOVE",
      white_player_left_time: String(whiteLeftTime),
      black_player_left_time: String(blackLeftTime),
      white_player_id,
      black_player_id,
      player1_profile_image_url,
      player2_profile_image_url,
      player1_rating: player1_rating_str,
      player2_rating: player2_rating_str,
      player1_username: player1_username!,
      player2_username: player2_username!,
      player1_id,
      player2_id,
      winner_id: timeoutWinnerId,
      time_slot,
      is_rated,
      gameMode,
      ...tournamentFields,
    };
  }

  return {
    initial_fen: initial_fen,
    current_fen: currentFen!,
    game_state: game_state ?? "IN_PROGRESS",
    turn: turn === "w" ? "WHITE_TO_MOVE" : "BLACK_TO_MOVE",
    white_player_left_time: String(whiteLeftTime),
    black_player_left_time: String(blackLeftTime),
    white_player_id,
    black_player_id,
    player1_profile_image_url,
    player2_profile_image_url,
    player1_rating: player1_rating_str,
    player2_rating: player2_rating_str,
    player1_username: player1_username!,
    player2_username: player2_username!,
    player1_id,
    player2_id,
    winner_id,
    time_slot,
    is_rated,
    gameMode,
    ...tournamentFields,
  };
}
