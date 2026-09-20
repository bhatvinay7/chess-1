use uuid::Uuid;
use crate::types::{MoveHistoryEntry, GameStateHash};

pub async fn check_game_finalized(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
) -> Result<Option<bool>, sqlx::Error> {
    sqlx::query_scalar::<_, bool>(
        r#"SELECT "endedAt" IS NOT NULL FROM "Game" WHERE id = $1 FOR UPDATE"#,
    )
    .bind(game_id)
    .fetch_optional(&mut **tx)
    .await
}

pub async fn insert_initial_game(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    w_id: Uuid,
    b_id: Uuid,
    state: &GameStateHash,
) -> Result<(), sqlx::Error> {
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
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn batch_insert_moves(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    moves: &[MoveHistoryEntry],
) -> Result<(), Box<dyn std::error::Error>> {
    for mv in moves {
        let player_id = Uuid::parse_str(&mv.user_id)?;
        let uci = format!("{}{}", mv.move_data.from, mv.move_data.to);
        let san = &mv.move_data.san;
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
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

pub async fn update_game_final_state(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    state: &GameStateHash,
    status: &str,
    pgn: &str,
    winner_uuid: Option<Uuid>,
    white_rating: Option<i32>,
    black_rating: Option<i32>,
    white_after: Option<i32>,
    black_after: Option<i32>,
    white_delta: Option<i32>,
    black_delta: Option<i32>,
) -> Result<(), sqlx::Error> {
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
    .bind(pgn)
    .bind(status)
    .bind(winner_uuid)
    .bind(state.is_rated)
    .bind(white_rating)
    .bind(black_rating)
    .bind(white_after)
    .bind(black_after)
    .bind(white_delta)
    .bind(black_delta)
    .bind(game_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn upsert_game_state(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    state: &GameStateHash,
    status: &str,
    winner_uuid: Option<Uuid>,
) -> Result<(), sqlx::Error> {
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
    .bind(status)
    .bind(&state.game_mode)
    .bind(winner_uuid)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn upsert_game_analysis(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    overall: &str,
    white_win_rate: f64,
    black_win_rate: f64,
) -> Result<(), sqlx::Error> {
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
    .execute(&mut **tx)
    .await?;
    Ok(())
}

pub async fn mark_match_completed(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    match_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"UPDATE "Match"
           SET "isProcessed" = true, "completedAt" = NOW()
           WHERE id = $1"#,
    )
    .bind(match_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}
