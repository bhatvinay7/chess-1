use std::time::{SystemTime, UNIX_EPOCH};

use super::types::{MatchPlayer, TournamentCtx};
use crate::stream_jobs::RedisPool;

pub(super) fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ── game:state hash ───────────────────────────────────────────────────────────

/// Write the full game:state hash (standard + tournament-specific fields).
///
/// `set_player_ptrs` — when `true`, also writes the per-player
/// `matchmaking:gameId` pointers so `join_arena` / draw / resign handlers
/// can resolve the game from a userId lookup.
///
/// For RR double-headers this flag must be `false` for the **second** game:
/// if both games write the pointer, game-2's write overwrites game-1's, and
/// both players get pointed at a future game that has not yet started.  The
/// pointer for game-2 is set later by `release_rr_paired_game` (in
/// `game_result`) when game-1 actually finishes.
pub(super) async fn write_game_state(
    redis: &RedisPool,
    game_id: &str,
    white: &MatchPlayer,
    black: &MatchPlayer,
    ctx: &TournamentCtx,
    round_id: &str,
    group_id: &str,
    match_id: &str,
    start_ms: u64,
    _set_player_ptrs: bool,
    paired_game_id: &str,
    starting_fen: &str,
) {
    let Ok(mut conn) = redis.get().await else {
        eprintln!("[tournament_init] Redis pool error in write_game_state");
        return;
    };

    let time_sec = ctx.initial_time_sec as u64;
    let start_secs = (start_ms / 1000) as f64;
    let white_str = white.player_id.to_string();
    let black_str = black.player_id.to_string();

    let fields: Vec<(&str, String)> = vec![
        ("white_player_id", white_str.clone()),
        ("black_player_id", black_str.clone()),
        ("player1_id", white_str.clone()),
        ("player2_id", black_str.clone()),
        ("player1_rating", white.rating.to_string()),
        ("player2_rating", black.rating.to_string()),
        ("player1_username", white.username.clone()),
        ("player2_username", black.username.clone()),
        ("player1_profile_image_url", white.profile_image.clone()),
        ("player2_profile_image_url", black.profile_image.clone()),
        ("current_fen", starting_fen.to_string()),
        ("gameMode", ctx.game_type.clone()),
        ("game_state", "INITIALIZED".to_string()),
        ("white_player_left_time", time_sec.to_string()),
        ("black_player_left_time", time_sec.to_string()),
        ("increment", ctx.increment_sec.to_string()),
        ("time_slot", ctx.time_slot.clone()),
        ("is_rated", ctx.is_rated.to_string()),
        ("winner_id", String::new()),
        ("last_move_time", format!("{start_secs:.3}")),
        ("tournament_id", ctx.tournament_id.clone()),
        ("tournament_type", ctx.tournament_type.clone()),
        ("round_id", round_id.to_string()),
        ("group_id", group_id.to_string()),
        ("match_id", match_id.to_string()),
        ("left_game_start_time", start_ms.to_string()),
        ("paired_game_id", paired_game_id.to_string()),
    ];

    let _: () = redis::cmd("HSET")
        .arg(format!("game:state:{game_id}"))
        .arg(
            fields
                .iter()
                .flat_map(|(k, v)| [k.to_string(), v.clone()])
                .collect::<Vec<_>>(),
        )
        .query_async(&mut *conn)
        .await
        .unwrap_or(());

    // Note: matchmaking:gameId is no longer populated for tournament games.
    // They are tracked exclusively via user:active:games (written by scheduling.rs).
}

// ── tournament:match hash + group matchIds set ───────────────────────────────

pub(super) async fn write_match_state(
    redis: &RedisPool,
    match_id: &str,
    game_id: &str,
    group_id: &str,
    round_id: &str,
    white_player_id: &str,
    black_player_id: &str,
    start_ms: u64,
) {
    let Ok(mut conn) = redis.get().await else {
        return;
    };

    let _: () = redis::cmd("HSET")
        .arg(format!("tournament:match:{match_id}"))
        .arg("gameId")
        .arg(game_id)
        .arg("groupId")
        .arg(group_id)
        .arg("roundId")
        .arg(round_id)
        .arg("whitePlayerId")
        .arg(white_player_id)
        .arg("blackPlayerId")
        .arg(black_player_id)
        .arg("scheduledStartMs")
        .arg(start_ms.to_string())
        .arg("status")
        .arg("WAITING")
        .query_async(&mut *conn)
        .await
        .unwrap_or(());

    let _: () = redis::cmd("SADD")
        .arg(format!("tournament:group:{group_id}:matchIds"))
        .arg(match_id)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

// ── Navigation indices ────────────────────────────────────────────────────────

/// ZADD NX — tournament:${tournamentId}:rounds
pub(super) async fn index_round(
    redis: &RedisPool,
    tournament_id: &str,
    round_id: &str,
    round_number: usize,
) {
    let Ok(mut conn) = redis.get().await else {
        return;
    };
    let _: () = redis::cmd("ZADD")
        .arg(format!("tournament:{tournament_id}:rounds"))
        .arg("NX")
        .arg(round_number as f64)
        .arg(round_id)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

/// ZADD NX — tournament:${tournamentId}:round:${roundId}:groups
pub(super) async fn index_group(
    redis: &RedisPool,
    tournament_id: &str,
    round_id: &str,
    group_id: &str,
    group_number: i32,
) {
    let Ok(mut conn) = redis.get().await else {
        return;
    };
    let _: () = redis::cmd("ZADD")
        .arg(format!(
            "tournament:{tournament_id}:round:{round_id}:groups"
        ))
        .arg("NX")
        .arg(group_number as f64)
        .arg(group_id)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}
