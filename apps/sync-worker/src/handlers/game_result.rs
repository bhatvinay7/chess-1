/// Business-logic handler for the `game:result` stream.
///
/// Full sync pipeline triggered once per completed game:
/// 1. HGETALL game:state:{gameId}     — final Redis state (players, FEN, timings)
/// 2. XRANGE movehistory:{gameId} 0 + — all moves for this game
/// 3. Batch-INSERT Move rows          — idempotent; both players share same rows
/// 4. UPDATE Game                     — final status, FEN, PGN, winnerId, endedAt
/// 5. UPSERT GameState snapshot
/// 6. UPDATE User rating/stats        — ELO + wins/losses/draws for rated games
/// 7. DEL Redis keys                  — cleanup movehistory + game:state
use std::sync::Arc;

use redis::{self, AsyncCommands, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::handlers::{scheduling, standings};
use crate::stream_jobs::RedisPool;
use crate::types::{GameResultEntry, GameStateHash, MoveData, MoveHistoryEntry};

pub async fn handle_game_result(
    db: Arc<PgPool>,
    redis: Arc<RedisPool>,
    entry: GameResultEntry,
) -> Result<(), Box<dyn std::error::Error>> {
    let game_id = Uuid::parse_str(&entry.game_id)?;
    let mut conn = redis.get().await?;

    // ── 1. HGETALL game:state:{gameId} ───────────────────────────────────────
    let state_key = format!("game:state:{}", entry.game_id);
    let raw_pairs: Vec<(String, String)> = conn.hgetall(&state_key).await?;

    if raw_pairs.is_empty() {
        // game:state was already cleaned up (e.g. a duplicate result message arrived
        // after the first delivery fully processed and deleted the key).
        // Check the DB to decide whether to retry or skip.
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
                // game:state vanished but DB not yet written — real problem, retry.
                return Err(format!(
                    "game:state:{} missing in Redis but game not yet finalized in DB",
                    entry.game_id
                )
                .into());
            }
            None => {
                // Game row absent entirely — stale/orphaned message, ACK and discard.
                eprintln!(
                    "[game_result] game:state:{} missing and game not in DB — ACKing stale",
                    entry.game_id
                );
                return Ok(());
            }
        }
    }
    let state = GameStateHash::from_pairs(raw_pairs);

    // ── 2. XRANGE game:moveshistory:{gameId} ─────────────────────────────────
    // Each stream entry has two fields written by the grpc server:
    //   userId  → raw player UUID string
    //   move    → JSON-encoded MoveData object (double-encoded, not a payload blob)
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
                // parts[0] = stream ID, parts[1] = flat field/value array
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

    // SELECT ... FOR UPDATE locks the Game row for the duration of this transaction.
    // This serializes concurrent workers that race to process the same game result
    // (duplicate stream deliveries or matchmaker re-sends): the second worker will
    // block here until the first commits, then read was_finalized = true and exit.
    let game_row = sqlx::query_scalar::<_, bool>(
        r#"SELECT "endedAt" IS NOT NULL FROM "Game" WHERE id = $1 FOR UPDATE"#,
    )
    .bind(game_id)
    .fetch_optional(&mut *tx)
    .await?;

    let was_finalized = match game_row {
        Some(finalized) => finalized,
        None => {
            let white_player_id = Uuid::parse_str(&state.white_player_id).ok();
            let black_player_id = Uuid::parse_str(&state.black_player_id).ok();

            if let (Some(w_id), Some(b_id)) = (white_player_id, black_player_id) {
                sqlx::query(
                    r#"
                    INSERT INTO "Game"
                        (id, "whitePlayerId", "blackPlayerId", "initialFen", "currentFen",
                         pgn, status, "timeControl", "gameMode", "isRated", "whiteRating", "blackRating", "createdAt", "updatedAt")
                    VALUES
                        ($1, $2, $3, $4, $4, '', 'ACTIVE'::"GameStatus", $5, $6, $7, $8, $9, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                    "#,
                )
                .bind(game_id)
                .bind(w_id)
                .bind(b_id)
                .bind(&state.initial_fen)
                .bind(&state.time_slot)
                .bind(&state.game_mode)
                .bind(state.is_rated)
                .bind(state.white_player_rating)
                .bind(state.black_player_rating)
                .execute(&mut *tx)
                .await?;

                false
            } else {
                eprintln!(
                    "[game_result] Game {game_id} not found in DB, and missing player IDs in Redis. ACKing stale message."
                );
                return Ok(());
            }
        }
    };

    // ── 3. Batch-INSERT Move rows ─────────────────────────────────────────────
    // Both players share the same rows via game FK (no per-player copies).
    // ON CONFLICT handles re-delivered stream messages safely.
    for mv in &moves {
        let player_id = Uuid::parse_str(&mv.user_id)?;
        let uci = format!("{}{}", mv.move_data.from, mv.move_data.to);
        let san = &mv.move_data.san;
        // Empty string from the grpc server means no promotion — store as NULL
        let promotion = mv.move_data.promotion.as_deref().filter(|s| !s.is_empty());
        let time_taken_ms: Option<i32> =
            mv.move_data.time_taken.map(|t| (t * 1000.0).round() as i32);

        sqlx::query(
            r#"
            INSERT INTO "Move"
                (id, "gameId", "playerId", san, uci, "fenAfter", "fromSquare", "toSquare", promotion, "moveNumber", "timeTakenMs", "createdAt")
            VALUES
                (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT ("gameId", "moveNumber") DO NOTHING
            "#,
        )
        .bind(game_id)
        .bind(player_id)
        .bind(san)
        .bind(&uci)
        .bind(&mv.move_data.fen_after)
        .bind(&mv.move_data.from)
        .bind(&mv.move_data.to)
        .bind(promotion)
        .bind(mv.move_data.move_number)
        .bind(time_taken_ms)
        .execute(&mut *tx)
        .await?;
    }

    // ── 4. UPDATE Game with final state ──────────────────────────────────────
    let winner_uuid: Option<Uuid> = entry
        .winner_id
        .as_deref()
        .filter(|s| !s.is_empty())
        .and_then(|s| Uuid::parse_str(s).ok());

    let pgn = build_pgn(&moves);
    let rating_update = if state.is_rated {
        Some(calculate_elo_update(
            state.white_player_rating,
            state.black_player_rating,
            score_for_white(&entry.status),
        ))
    } else {
        None
    };

    // For rated games: all six ELO fields are Some(_).
    // For unrated games: all six are None — the DB stores NULL, frontend coerces to 0.
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

    sqlx::query(
        r#"
        UPDATE "Game"
        SET
            "currentFen"       = $1,
            pgn                = $2,
            status             = $3::"GameStatus",
            "winnerId"         = $4,
            "isRated"          = $5,
            "whiteRating"      = $6,
            "blackRating"      = $7,
            "whiteRatingAfter" = $8,
            "blackRatingAfter" = $9,
            "whiteRatingGain"  = $10,
            "blackRatingGain"  = $11,
            "startedAt"        = COALESCE("startedAt", NOW()),
            "endedAt"          = NOW(),
            "updatedAt"        = NOW()
        WHERE id = $12
        "#,
    )
    .bind(&state.current_fen)
    .bind(&pgn)
    .bind(&entry.status)
    .bind(winner_uuid)
    .bind(state.is_rated)
    .bind(white_rating)
    .bind(black_rating)
    .bind(white_after)
    .bind(black_after)
    .bind(white_delta)
    .bind(black_delta)
    .bind(game_id)
    .execute(&mut *tx)
    .await?;

    println!("[game_result] Game {} → {}", entry.game_id, entry.status);

    // ── 5. UPSERT GameState snapshot ─────────────────────────────────────────
    // GameState schema: id, gameId, whitePlayerLeftTime, blackPlayerLeftTime,
    //                   gameState, winnerId, createdAt, updatedAt.
    // increment / timeSlot / isRated live on the Game row, not here.
    sqlx::query(
        r#"
        INSERT INTO "GameState"
            (id, "gameId", "whitePlayerLeftTime", "blackPlayerLeftTime",
             "gameState", "gameMode", "winnerId", "createdAt", "updatedAt")
        VALUES
            (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT ("gameId") DO UPDATE
        SET
            "whitePlayerLeftTime" = EXCLUDED."whitePlayerLeftTime",
            "blackPlayerLeftTime" = EXCLUDED."blackPlayerLeftTime",
            "gameState"           = EXCLUDED."gameState",
            "winnerId"            = EXCLUDED."winnerId",
            "updatedAt"           = NOW()
        "#,
    )
    .bind(game_id)
    .bind(state.white_player_left_time as i32)
    .bind(state.black_player_left_time as i32)
    .bind(&entry.status)
    .bind(&state.game_mode)
    .bind(winner_uuid)
    .execute(&mut *tx)
    .await?;

    // ── 6. UPSERT GameAnalysis baseline ──────────────────────────────────────
    let (white_win_rate, black_win_rate, overall) = analysis_summary(&entry.status);
    sqlx::query(
        r#"
        INSERT INTO "GameAnalysis"
            (id, "gameId", overall, "whiteWinRate", "blackWinRate", "createdAt", "updatedAt")
        VALUES
            (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT ("gameId") DO UPDATE
        SET
            overall        = EXCLUDED.overall,
            "whiteWinRate" = EXCLUDED."whiteWinRate",
            "blackWinRate" = EXCLUDED."blackWinRate",
            "updatedAt"    = NOW()
        "#,
    )
    .bind(game_id)
    .bind(overall)
    .bind(white_win_rate)
    .bind(black_win_rate)
    .execute(&mut *tx)
    .await?;

    // ── 7. UPDATE User stats for rated games ─────────────────────────────────
    if state.is_rated
        && !was_finalized
        && !state.white_player_id.is_empty()
        && !state.black_player_id.is_empty()
    {
        let white_id = Uuid::parse_str(&state.white_player_id)?;
        let black_id = Uuid::parse_str(&state.black_player_id)?;

        let tc_category = time_control_category(&state.time_slot);

        if let Some(update) = rating_update {
            // Update legacy User.rating for backward compat
            set_user_rating(&mut tx, white_id, update.white_rating_after).await?;
            set_user_rating(&mut tx, black_id, update.black_rating_after).await?;

            // Update category-specific UserRating
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

    // ── 7b. Update TournamentPlayerStats if this is a tournament game ───────────
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

    // ── 7c. Mark Match completed — inside the transaction so it rolls back with
    //         the Game update if anything fails. match_id is present in Redis game
    //         state for all tournament games; empty string for non-tournament games.
    if !state.match_id.is_empty() && !was_finalized {
        sqlx::query(
            r#"UPDATE "Match"
               SET "isProcessed" = true, "completedAt" = NOW()
               WHERE id = $1"#,
        )
        .bind(&state.match_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    println!("[game_result] DB committed for game {}", entry.game_id);

    // ── 7c. Update group + round standings (non-fatal, after DB commit) ───────
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

    // ── 8. Cleanup Redis keys ─────────────────────────────────────────────────
    // Cleanup is intentionally non-fatal: XACK is governed by durable DB commit.
    if let Err(e) = conn.del::<_, ()>(&history_key).await {
        eprintln!("[game_result] Redis cleanup failed for {history_key}: {e}");
    }
    if let Err(e) = conn.del::<_, ()>(&state_key).await {
        eprintln!("[game_result] Redis cleanup failed for {state_key}: {e}");
    }

    let white_uid = &state.white_player_id;
    let black_uid = &state.black_player_id;
    let gid = &entry.game_id;

    // ── 9. Cleanup per-player Redis pointers ─────────────────────────────────
    for uid in [white_uid.as_str(), black_uid.as_str()] {
        if uid.is_empty() {
            continue;
        }
        // matchmaking:gameId — set by tournament_init (and matchmaker for online games).
        // Removing it lets join_arena / draw handlers know no active game is present.
        let mm_key = format!("matchmaking:gameId:{uid}");
        let members: Vec<String> = conn.zrange(&mm_key, 0, -1).await.unwrap_or_default();
        for member in members {
            if member == *gid || member.starts_with(&format!("{gid}:")) {
                let _: () = conn.zrem(&mm_key, member).await.unwrap_or(());
            }
        }
        // API game-history cache — invalidated so next HTTP request re-fetches from DB.
        let cache_key = format!("cache:user:{uid}:games");
        if let Err(e) = conn.del::<_, ()>(&cache_key).await {
            eprintln!("[game_result] history cache invalidation failed for {uid}: {e}");
        }
    }

    // Free the scheduling slot for both players.
    // game:schedule / user:active:games are only written for tournament games;
    // skip for regular online games to avoid noisy "already absent" logs.
    if !state.tournament_id.is_empty() {
        for uid in [white_uid.as_str(), black_uid.as_str()] {
            if uid.is_empty() {
                continue;
            }
            scheduling::remove_from_schedule(&redis, uid, gid).await;
        }
    }

    // ── 9b. Release paired game 2 in RR double-headers ──────────────────────
    // paired_game_id is written into game:state at schedule time (non-empty only
    // for RR double-headers).  Using it here avoids any Redis schedule scan.
    if !state.paired_game_id.is_empty() && !white_uid.is_empty() && !black_uid.is_empty() {
        release_rr_paired_game(&redis, white_uid, black_uid, &state.paired_game_id).await;
    }

    // Crash-recovery ZSET — records completed tournament games for reconciliation.
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

// ── Helpers ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy)]
struct EloUpdate {
    white_rating_before: i32,
    black_rating_before: i32,
    white_rating_after: i32,
    black_rating_after: i32,
    white_delta: i32,
    black_delta: i32,
}

fn calculate_elo_update(white_rating: i32, black_rating: i32, white_score: f64) -> EloUpdate {
    let k_factor = 32.0;
    let expected_white = 1.0 / (1.0 + 10_f64.powf((black_rating - white_rating) as f64 / 400.0));
    let expected_black = 1.0 - expected_white;
    let black_score = 1.0 - white_score;

    let white_delta = (k_factor * (white_score - expected_white)).round() as i32;
    let black_delta = (k_factor * (black_score - expected_black)).round() as i32;

    EloUpdate {
        white_rating_before: white_rating,
        black_rating_before: black_rating,
        white_rating_after: (white_rating + white_delta).max(100),
        black_rating_after: (black_rating + black_delta).max(100),
        white_delta,
        black_delta,
    }
}

fn score_for_white(status: &str) -> f64 {
    match status {
        "WHITE_WIN" => 1.0,
        "BLACK_WIN" => 0.0,
        "DRAW" => 0.5,
        _ => 0.5,
    }
}

fn analysis_summary(status: &str) -> (f64, f64, &'static str) {
    match status {
        "WHITE_WIN" => (100.0, 0.0, "White converted the game"),
        "BLACK_WIN" => (0.0, 100.0, "Black converted the game"),
        "DRAW" => (50.0, 50.0, "Balanced draw"),
        _ => (50.0, 50.0, "Game ended without a rated result"),
    }
}

/// Classify a time_slot string ("X+Y" where X=minutes, Y=increment seconds)
/// into a rating category using estimated total time.
fn time_control_category(time_slot: &str) -> Option<&'static str> {
    let mut parts = time_slot.splitn(2, '+');
    let minutes: f64 = parts.next()?.trim().parse().ok()?;
    let increment: f64 = parts
        .next()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0.0);
    let estimated = minutes * 60.0 + increment * 40.0;
    Some(if estimated < 180.0 {
        "BULLET"
    } else if estimated < 600.0 {
        "BLITZ"
    } else {
        "RAPID"
    })
}

/// Upsert the category-specific UserRating row.
async fn upsert_user_rating(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    category: &str,
    rating: i32,
    result: &str, // "WIN" | "LOSS" | "DRAW" | ""
) -> Result<(), Box<dyn std::error::Error>> {
    let (w, l, d): (i32, i32, i32) = match result {
        "WIN" => (1, 0, 0),
        "LOSS" => (0, 1, 0),
        "DRAW" => (0, 0, 1),
        _ => (0, 0, 0),
    };
    sqlx::query(
        r#"
        INSERT INTO "UserRating"
            (id, "userId", category, rating, wins, losses, draws, "createdAt", "updatedAt")
        VALUES
            (gen_random_uuid()::text, $1, $2::"RatingCategory", $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT ("userId", category) DO UPDATE
        SET rating     = EXCLUDED.rating,
            wins       = "UserRating".wins   + EXCLUDED.wins,
            losses     = "UserRating".losses + EXCLUDED.losses,
            draws      = "UserRating".draws  + EXCLUDED.draws,
            "updatedAt" = NOW()
        "#,
    )
    .bind(user_id)
    .bind(category)
    .bind(rating)
    .bind(w)
    .bind(l)
    .bind(d)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

async fn set_user_rating(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    rating: i32,
) -> Result<(), Box<dyn std::error::Error>> {
    sqlx::query(r#"UPDATE "User" SET rating = $1, "updatedAt" = NOW() WHERE id = $2"#)
        .bind(rating)
        .bind(user_id)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

async fn increment_stat(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: Uuid,
    col: &str, // always one of "wins" | "losses" | "draws" — not user input
) -> Result<(), Box<dyn std::error::Error>> {
    let sql =
        format!(r#"UPDATE "User" SET "{col}" = "{col}" + 1, "updatedAt" = NOW() WHERE id = $1"#);
    sqlx::query(&sql).bind(user_id).execute(&mut **tx).await?;
    Ok(())
}

/// Update TournamentPlayerStats for both players after a tournament game finishes.
async fn update_tournament_stats(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tournament_id: &str,
    state: &crate::types::GameStateHash,
    status: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let white_id = match Uuid::parse_str(&state.white_player_id) {
        Ok(u) => u,
        Err(_) => return Ok(()),
    };
    let black_id = match Uuid::parse_str(&state.black_player_id) {
        Ok(u) => u,
        Err(_) => return Ok(()),
    };

    let (white_score, black_score) = match status {
        "WHITE_WIN" => (0.5f64, 0.0f64),
        "BLACK_WIN" => (0.0f64, 0.5f64),
        "DRAW" => (0.5f64, 0.5f64),
        _ => (0.0f64, 0.0f64),
    };

    for (pid, score, is_white, won) in [
        (white_id, white_score, true, status == "WHITE_WIN"),
        (black_id, black_score, false, status == "BLACK_WIN"),
    ] {
        // Find participant → stats row
        let stats_id: Option<String> = sqlx::query_scalar(
            r#"SELECT ps.id FROM "TournamentPlayerStats" ps
               JOIN "TournamentParticipant" tp ON tp.id = ps."tournamentParticipantId"
               WHERE tp."tournamentId" = $1 AND tp."playerId" = $2"#,
        )
        .bind(tournament_id)
        .bind(pid)
        .fetch_optional(&mut **tx)
        .await?;

        let Some(sid) = stats_id else {
            continue;
        };

        let (win_inc, draw_inc, loss_inc) = match status {
            "WHITE_WIN" if is_white => (1i32, 0i32, 0i32),
            "BLACK_WIN" if !is_white => (1i32, 0i32, 0i32),
            "DRAW" => (0i32, 1i32, 0i32),
            _ => (0i32, 0i32, 1i32),
        };
        let _ = won; // used implicitly via win_inc

        let col_white_inc = if is_white { 1i32 } else { 0i32 };
        let col_black_inc = if is_white { 0i32 } else { 1i32 };

        sqlx::query(
            r#"UPDATE "TournamentPlayerStats"
               SET score             = score + $2,
                   wins              = wins  + $3,
                   draws             = draws + $4,
                   losses            = losses + $5,
                   "totalWhiteGames" = "totalWhiteGames" + $6,
                   "totalBlackGames" = "totalBlackGames" + $7,
                   "updatedAt"       = NOW()
               WHERE id = $1"#,
        )
        .bind(&sid)
        .bind(score)
        .bind(win_inc)
        .bind(draw_inc)
        .bind(loss_inc)
        .bind(col_white_inc)
        .bind(col_black_inc)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

/// For RR double-headers: when game 1 finishes, immediately release game 2.
///
/// game 2's ID is read directly from game 1's `paired_game_id` field in
/// game:state — no schedule scan or DB fallback needed.
///
/// Actions:
///   • HSET game:state:game2  left_game_start_time=now_ms  last_move_time=0
///   • HSET tournament:match:game2_match  scheduledStartMs=now_ms
///   • SET  matchmaking:gameId:white/black = game2_id   (deferred pointer)
///   • ZADD user:active:games:white/black  game2_id  now_ms  (update score)
///
/// Idempotent: the matchmaking:gameId guard prevents double-activation on
/// re-delivered result events.
async fn release_rr_paired_game(redis: &RedisPool, white_uid: &str, black_uid: &str, g2_id: &str) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return,
    };

    let state_key = format!("game:state:{g2_id}");

    // Read game 2's white/black IDs and match_id from its own state.
    let g2_fields: Vec<(String, String)> = conn.hgetall(&state_key).await.unwrap_or_default();
    let mut g2_white = String::new();
    let mut g2_black = String::new();
    let mut g2_match = String::new();
    for (k, v) in &g2_fields {
        match k.as_str() {
            "white_player_id" => g2_white = v.clone(),
            "black_player_id" => g2_black = v.clone(),
            "match_id" => g2_match = v.clone(),
            _ => {}
        }
    }
    // Fall back to game 1's player IDs if game 2 state is missing.
    let act_white = if !g2_white.is_empty() {
        g2_white.as_str()
    } else {
        white_uid
    };
    let act_black = if !g2_black.is_empty() {
        g2_black.as_str()
    } else {
        black_uid
    };

    // Idempotency guard: already activated by a previous delivery?
    let current_score: Option<f64> = conn
        .zscore(format!("user:active:games:{act_white}"), g2_id)
        .await
        .unwrap_or(None);
    // user:active:games score is originally initialized to a future start_ms.
    // If it's already updated to a past/current timestamp (i.e. <= now_ms + a small threshold),
    // then it's already been released.
    if let Some(score) = current_score {
        let now_f64 = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as f64;
        // If score is less than or equal to now_f64 + 10_000ms, consider it released
        if score <= now_f64 + 10_000.0 {
            return;
        }
    }

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Update game 2's start gate to now (handles early finish and overtime alike).
    let _: () = redis::cmd("HSET")
        .arg(&state_key)
        .arg("left_game_start_time")
        .arg(now_ms.to_string())
        .arg("last_move_time")
        .arg("0")
        .query_async(&mut *conn)
        .await
        .unwrap_or(());

    if !g2_match.is_empty() {
        let _: () = redis::cmd("HSET")
            .arg(format!("tournament:match:{g2_match}"))
            .arg("scheduledStartMs")
            .arg(now_ms.to_string())
            .query_async(&mut *conn)
            .await
            .unwrap_or(());
    }

    // Update user:active:games score to now_ms.
    for uid in [act_white, act_black] {
        if uid.is_empty() {
            continue;
        }
        let _: () = conn
            .zadd(format!("user:active:games:{uid}"), g2_id, now_ms as f64)
            .await
            .unwrap_or(());
    }

    println!("[game_result] RR double-header: released paired game {g2_id} → now ({now_ms} ms)");
}

/// Build PGN SAN string: "1. e4 e5 2. Nf3 Nc6 ..."
fn build_pgn(moves: &[MoveHistoryEntry]) -> String {
    let mut pgn = String::new();
    for (i, mv) in moves.iter().enumerate() {
        if i % 2 == 0 {
            pgn.push_str(&format!("{}. ", (i / 2) + 1));
        }
        let token = if mv.move_data.san.is_empty() {
            format!("{}{}", mv.move_data.from, mv.move_data.to)
        } else {
            mv.move_data.san.clone()
        };
        pgn.push_str(&token);
        pgn.push(' ');
    }
    pgn.trim_end().to_string()
}
