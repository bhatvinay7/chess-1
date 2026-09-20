pub mod db;
pub mod pgn;
pub mod rating;
pub mod tournament;

use redis::{self, AsyncCommands, Value};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::handlers::{scheduling, standings};
use crate::stream_jobs::RedisPool;
use crate::types::{GameResultEntry, GameStateHash, MoveData, MoveHistoryEntry};

use self::db::*;
use self::pgn::build_pgn;
use self::rating::*;
use self::tournament::*;

pub async fn handle_game_result(
    db: Arc<PgPool>,
    redis: Arc<RedisPool>,
    entry: GameResultEntry,
) -> Result<(), Box<dyn std::error::Error>> {
    let game_id = Uuid::parse_str(&entry.game_id)?;
    let mut conn = redis.get().await?;

    let state_key = format!("game:state:{}", entry.game_id);
    let raw_pairs: Vec<(String, String)> = conn.hgetall(&state_key).await?;

    if raw_pairs.is_empty() {
        let db_status: Option<bool> =
            sqlx::query_scalar(r#"SELECT "endedAt" IS NOT NULL FROM "Game" WHERE id = $1"#)
                .bind(game_id)
                .fetch_optional(&*db)
                .await
                .unwrap_or(None);

        match db_status {
            Some(true) => {
                eprintln!(
                    "[game_result] game:state:{} missing — game already finalized in DB, skipping",
                    entry.game_id
                );
                return Ok(());
            }
            Some(false) => {
                return Err(format!(
                    "game:state:{} missing in Redis but game not yet finalized in DB",
                    entry.game_id
                )
                .into());
            }
            None => {
                eprintln!(
                    "[game_result] game:state:{} missing and game not in DB — ACKing stale",
                    entry.game_id
                );
                return Ok(());
            }
        }
    }
    let state = GameStateHash::from_pairs(raw_pairs);

    let history_key = format!("game:moveshistory:{}", entry.game_id);
    let move_entries: Value = redis::cmd("XRANGE")
        .arg(&history_key)
        .arg("0")
        .arg("+")
        .query_async(&mut *conn)
        .await?;

    let mut moves: Vec<MoveHistoryEntry> = Vec::new();
    if let Value::Array(entries) = move_entries {
        for entry_val in entries {
            if let Value::Array(parts) = entry_val {
                if let Some(Value::Array(fields)) = parts.into_iter().nth(1) {
                    let mut user_id_bytes: Option<Vec<u8>> = None;
                    let mut move_bytes: Option<Vec<u8>> = None;
                    let mut field_iter = fields.into_iter();
                    while let (Some(k), Some(v)) = (field_iter.next(), field_iter.next()) {
                        if let (Value::BulkString(key), Value::BulkString(val)) = (k, v) {
                            match key.as_slice() {
                                b"userId" => user_id_bytes = Some(val),
                                b"move" => move_bytes = Some(val),
                                _ => {}
                            }
                        }
                    }
                    match (user_id_bytes, move_bytes) {
                        (Some(uid), Some(mv)) => {
                            let user_id = String::from_utf8_lossy(&uid).into_owned();
                            match serde_json::from_slice::<MoveData>(&mv) {
                                Ok(move_data) => {
                                    moves.push(MoveHistoryEntry { user_id, move_data })
                                }
                                Err(e) => eprintln!("[game_result] bad move entry: {e}"),
                            }
                        }
                        _ => eprintln!("[game_result] move entry missing userId or move field"),
                    }
                }
            }
        }
    }

    println!(
        "[game_result] gameId={} | moves={} | status={}",
        entry.game_id,
        moves.len(),
        entry.status
    );

    let mut tx = db.begin().await?;

    let game_row = check_game_finalized(&mut tx, game_id).await?;

    let was_finalized = match game_row {
        Some(finalized) => finalized,
        None => {
            let white_player_id = Uuid::parse_str(&state.white_player_id).ok();
            let black_player_id = Uuid::parse_str(&state.black_player_id).ok();

            if let (Some(w_id), Some(b_id)) = (white_player_id, black_player_id) {
                insert_initial_game(&mut tx, game_id, w_id, b_id, &state).await?;
                false
            } else {
                eprintln!(
                    "[game_result] Game {game_id} not found in DB, and missing player IDs in Redis. ACKing stale message."
                );
                return Ok(());
            }
        }
    };

    batch_insert_moves(&mut tx, game_id, &moves).await?;

    let winner_uuid: Option<Uuid> = entry
        .winner_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .and_then(|s| Uuid::parse_str(s).ok());

    let pgn = build_pgn(&moves);
    let rating_update = if state.is_rated && entry.status != "ABORTED" {
        Some(calculate_elo_update(
            state.white_player_rating,
            state.black_player_rating,
            score_for_white(&entry.status),
        ))
    } else {
        None
    };

    let (white_rating, black_rating, white_after, black_after, white_delta, black_delta) =
        match rating_update {
            Some(r) => (
                Some(r.white_rating_before),
                Some(r.black_rating_before),
                Some(r.white_rating_after),
                Some(r.black_rating_after),
                Some(r.white_delta),
                Some(r.black_delta),
            ),
            None => (None, None, None, None, None, None),
        };

    update_game_final_state(
        &mut tx,
        game_id,
        &state,
        &entry.status,
        &pgn,
        winner_uuid,
        white_rating,
        black_rating,
        white_after,
        black_after,
        white_delta,
        black_delta,
    )
    .await?;

    println!("[game_result] Game {} → {}", entry.game_id, entry.status);

    upsert_game_state(&mut tx, game_id, &state, &entry.status, winner_uuid).await?;

    let analysis_summary_val = match entry.status.as_str() {
        "WHITE_WIN" => (100.0, 0.0, "White converted the game"),
        "BLACK_WIN" => (0.0, 100.0, "Black converted the game"),
        "DRAW" => (50.0, 50.0, "Balanced draw"),
        _ => (50.0, 50.0, "Game ended without a rated result"),
    };
    let (white_win_rate, black_win_rate, overall) = analysis_summary_val;
    upsert_game_analysis(&mut tx, game_id, overall, white_win_rate, black_win_rate).await?;

    if state.is_rated
        && !was_finalized
        && !state.white_player_id.is_empty()
        && !state.black_player_id.is_empty()
    {
        let white_id = Uuid::parse_str(&state.white_player_id)?;
        let black_id = Uuid::parse_str(&state.black_player_id)?;

        let tc_category = time_control_category(&state.time_slot);

        if let Some(update) = rating_update {
            set_user_rating(&mut tx, white_id, update.white_rating_after).await?;
            set_user_rating(&mut tx, black_id, update.black_rating_after).await?;

            if let Some(cat) = tc_category {
                let (white_result, black_result) = match entry.status.as_str() {
                    "WHITE_WIN" => ("WIN", "LOSS"),
                    "BLACK_WIN" => ("LOSS", "WIN"),
                    "DRAW" => ("DRAW", "DRAW"),
                    _ => ("", ""),
                };
                upsert_user_rating(
                    &mut tx,
                    white_id,
                    cat,
                    update.white_rating_after,
                    white_result,
                )
                .await?;
                upsert_user_rating(
                    &mut tx,
                    black_id,
                    cat,
                    update.black_rating_after,
                    black_result,
                )
                .await?;
            }
        }

        match entry.status.as_str() {
            "WHITE_WIN" => {
                increment_stat(&mut tx, white_id, "wins").await?;
                increment_stat(&mut tx, black_id, "losses").await?;
            }
            "BLACK_WIN" => {
                increment_stat(&mut tx, white_id, "losses").await?;
                increment_stat(&mut tx, black_id, "wins").await?;
            }
            "DRAW" => {
                increment_stat(&mut tx, white_id, "draws").await?;
                increment_stat(&mut tx, black_id, "draws").await?;
            }
            _ => {} // ABANDONED — no stat change
        }
    }

    let tournament_id_opt: Option<String> = if state.tournament_id.is_empty() {
        None
    } else {
        Some(state.tournament_id.clone())
    };

    if let Some(ref tid) = tournament_id_opt {
        if !was_finalized {
            update_tournament_stats(&mut tx, tid, &state, &entry.status).await?;
        }
    }

    if !state.match_id.is_empty() && !was_finalized {
        mark_match_completed(&mut tx, &state.match_id).await?;
    }

    tx.commit().await?;
    println!("[game_result] DB committed for game {}", entry.game_id);

    if !state.tournament_id.is_empty() && !state.group_id.is_empty() && !state.round_id.is_empty() {
        if let Err(e) = standings::on_game_complete(
            &db,
            &redis,
            &state.group_id,
            &state.round_id,
            &state.tournament_id,
        )
        .await
        {
            eprintln!(
                "[game_result] standings update failed for game {}: {e}",
                entry.game_id
            );
        }
    }

    if let Err(e) = conn.del::<_, ()>(&history_key).await {
        eprintln!("[game_result] Redis cleanup failed for {history_key}: {e}");
    }
    if let Err(e) = conn.del::<_, ()>(&state_key).await {
        eprintln!("[game_result] Redis cleanup failed for {state_key}: {e}");
    }

    let white_uid = &state.white_player_id;
    let black_uid = &state.black_player_id;
    let gid = &entry.game_id;

    for uid in [white_uid.as_str(), black_uid.as_str()] {
        if uid.is_empty() {
            continue;
        }
        let mm_key = format!("matchmaking:gameId:{uid}");
        let members: Vec<String> = conn.zrange(&mm_key, 0, -1).await.unwrap_or_default();
        for member in members {
            if member == *gid || member.starts_with(&format!("{gid}:")) {
                let _: () = conn.zrem(&mm_key, member).await.unwrap_or(());
            }
        }
        let cache_key = format!("cache:user:{uid}:games");
        if let Err(e) = conn.del::<_, ()>(&cache_key).await {
            eprintln!("[game_result] history cache invalidation failed for {uid}: {e}");
        }
    }

    if !state.tournament_id.is_empty() {
        for uid in [white_uid.as_str(), black_uid.as_str()] {
            if uid.is_empty() {
                continue;
            }
            scheduling::remove_from_schedule(&redis, uid, gid).await;
        }
    }

    if !state.paired_game_id.is_empty() && !white_uid.is_empty() && !black_uid.is_empty() {
        release_rr_paired_game(&redis, white_uid, black_uid, &state.paired_game_id).await;
    }

    if let Some(ref tid) = tournament_id_opt {
        if !tid.is_empty() {
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as f64;
            let _: () = conn
                .zadd("tournament:completed:games", format!("{gid}:{tid}"), now_ms)
                .await
                .unwrap_or(());
        }
    }

    println!(
        "[game_result] Redis keys cleaned for game {}",
        entry.game_id
    );
    Ok(())
}
