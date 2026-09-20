use crate::stream_jobs::RedisPool;
use redis::AsyncCommands;
use uuid::Uuid;

pub async fn update_tournament_stats(
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

pub async fn release_rr_paired_game(redis: &RedisPool, white_uid: &str, black_uid: &str, g2_id: &str) {
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
