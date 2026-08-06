use super::types::{BoxError, MatchPlayer, TournamentCtx};
use uuid::Uuid;

/// Insert a single Game row inside an open transaction.
/// ON CONFLICT DO NOTHING makes duplicate-trigger restarts safe.
pub(super) async fn insert_game(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    game_id: Uuid,
    white: &MatchPlayer,
    black: &MatchPlayer,
    ctx: &TournamentCtx,
    starting_fen: &str,
) -> Result<(), BoxError> {
    sqlx::query(
        r#"
        INSERT INTO "Game"
            (id, "whitePlayerId", "blackPlayerId", "initialFen", "currentFen",
             pgn, status, "timeControl", "gameMode", "isRated", "whiteRating", "blackRating",
             "tournamentId", "createdAt", "updatedAt")
        VALUES
            ($1, $2, $3, $4, $4, '', 'WAITING'::"GameStatus", $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        "#,
    )
    .bind(game_id)
    .bind(white.player_id)
    .bind(black.player_id)
    .bind(starting_fen)
    .bind(&ctx.time_slot)
    .bind(&ctx.game_type)
    .bind(ctx.is_rated)
    .bind(white.rating)
    .bind(black.rating)
    .bind(&ctx.tournament_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Insert a Round row inside an open transaction.
/// ON CONFLICT on the unique (tournamentId, roundNumber) pair: if the round
/// was already created by a previous (committed) attempt, skip silently so
/// a retry of run_next_round does not fail the whole transaction.
pub(super) async fn insert_round(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    round_id: &str,
    tournament_id: &str,
    round_number: i32,
) -> Result<(), BoxError> {
    sqlx::query(
        r#"INSERT INTO "Round"
               (id, "tournamentId", "roundNumber", status, "startTime", "createdAt")
           VALUES ($1, $2, $3, 'IN_PROGRESS'::"RoundStatus", NOW(), NOW())
           ON CONFLICT ("tournamentId", "roundNumber") DO NOTHING"#,
    )
    .bind(round_id)
    .bind(tournament_id)
    .bind(round_number)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Insert a TournamentGroup row inside an open transaction.
/// ON CONFLICT on (tournamentId, roundNumber, groupNumber): idempotent on retry.
pub(super) async fn insert_group(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    group_id: &str,
    tournament_id: &str,
    round_number: i32,
    group_number: i32,
) -> Result<(), BoxError> {
    sqlx::query(
        r#"INSERT INTO "TournamentGroup"
               (id, "tournamentId", "roundNumber", "groupNumber", "createdAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT ("tournamentId", "roundNumber", "groupNumber") DO NOTHING"#,
    )
    .bind(group_id)
    .bind(tournament_id)
    .bind(round_number)
    .bind(group_number)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Insert a Match row inside an open transaction.
pub(super) async fn insert_match(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    match_id: &str,
    tournament_id: &str,
    round_id: &str,
    group_id: &str,
    game_id: Uuid,
) -> Result<(), BoxError> {
    sqlx::query(
        r#"INSERT INTO "Match"
               (id, "tournamentId", "roundId", "groupId", "gameId", "scheduledAt", "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())"#,
    )
    .bind(match_id)
    .bind(tournament_id)
    .bind(round_id)
    .bind(group_id)
    .bind(game_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Insert a TournamentBye row inside an open transaction.
/// ON CONFLICT on (tournamentId, playerId, roundNumber): idempotent on retry.
pub(super) async fn insert_bye(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tournament_id: &str,
    player_id: uuid::Uuid,
    round_number: i32,
) -> Result<(), BoxError> {
    sqlx::query(
        r#"INSERT INTO "TournamentBye"
               (id, "tournamentId", "playerId", "roundNumber", "byeType", "createdAt")
           VALUES ($1, $2, $3, $4, 'ZERO_POINT'::"ByeType", NOW())
           ON CONFLICT ("tournamentId", "playerId", "roundNumber") DO NOTHING"#,
    )
    .bind(Uuid::new_v4().to_string())
    .bind(tournament_id)
    .bind(player_id)
    .bind(round_number)
    .execute(&mut **tx)
    .await?;
    Ok(())
}
