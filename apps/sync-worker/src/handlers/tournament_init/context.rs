use sqlx::PgPool;
use std::sync::Arc;

use super::redis::now_ms;
use super::types::{BoxError, TournamentCtx, DEFAULT_RR_GROUP_SIZE};

// ── Shared time-control resolver ──────────────────────────────────────────────

/// Resolve (time_slot, initial_time_sec, increment_sec) from an optional TimeControl id.
async fn resolve_time_control(
    db: &Arc<PgPool>,
    tc_id: Option<String>,
) -> Result<(String, i64, i64), BoxError> {
    let Some(tcid) = tc_id else {
        return Ok(("10+0".to_string(), 600, 0));
    };

    let row = sqlx::query_as::<_, (Option<i32>, Option<i32>)>(
        r#"SELECT "initialTimeSec", "incrementSec" FROM "TimeControl" WHERE id = $1"#,
    )
    .bind(&tcid)
    .fetch_optional(&**db)
    .await?;

    let Some((init_opt, inc_opt)) = row else {
        return Ok(("10+0".to_string(), 600, 0));
    };

    // initialTimeSec and incrementSec are stored in seconds (field name is literal).
    let init_sec = init_opt.unwrap_or(600) as i64;
    let inc_sec = inc_opt.unwrap_or(0) as i64;
    let slot = format!("{}+{}", init_sec / 60, inc_sec);

    Ok((slot, init_sec, inc_sec))
}

// ── Context fetchers ──────────────────────────────────────────────────────────

/// Fetch tournament context for the initial round.
/// Requires status = NOT_INITIALIZED; uses the TournamentTimeManagement.startTime.
pub(super) async fn fetch_context(
    db: &Arc<PgPool>,
    tournament_id: &str,
) -> Result<Option<TournamentCtx>, BoxError> {
    let row = sqlx::query_as::<
        _,
        (
            String,
            bool,
            String,
            Option<String>,
            Option<i32>,
            Option<i64>,
            Option<i32>,
            Option<i32>,
        ),
    >(
        r#"
        SELECT
            t."tournamentType"::text,
            t."isRated",
            t."gameType"::text,
            t."timeControlId",
            ds."groupSize",
            EXTRACT(EPOCH FROM tm."startTime")::bigint * 1000,
            ds."advancePerGroup",
            ss."totalRounds"
        FROM "Tournament" t
        LEFT JOIN "DailySettings"            ds ON ds."tournamentId" = t.id
        LEFT JOIN "TournamentTimeManagement" tm ON tm."tournamentId" = t.id
        LEFT JOIN "SwissSettings"            ss ON ss."tournamentId" = t.id
        WHERE t.id = $1
          AND t.status = 'NOT_INITIALIZED'::"TournamentStatus"
        "#,
    )
    .bind(tournament_id)
    .fetch_optional(&**db)
    .await?;

    let Some((tt, is_rated, game_type, tc_id, rr_grp, start_ms_opt, rr_adv, swiss_total_rounds)) =
        row
    else {
        return Ok(None);
    };

    let Some(start_ms_raw) = start_ms_opt else {
        eprintln!(
            "[tournament_init] id={tournament_id} has no TournamentTimeManagement row — skipping"
        );
        return Ok(None);
    };

    let (time_slot, initial_time_sec, increment_sec) = resolve_time_control(db, tc_id).await?;

    // Swiss: honour configured totalRounds.  RR: max rounds derived from player count at runtime.
    let max_rounds = if tt.contains("SWISS") {
        swiss_total_rounds.map(|r| r as usize)
    } else {
        None
    };

    Ok(Some(TournamentCtx {
        tournament_id: tournament_id.to_string(),
        tournament_type: tt,
        is_rated,
        game_type: game_type.to_lowercase(),
        time_slot,
        initial_time_sec,
        increment_sec,
        rr_group_size: rr_grp.map(|g| g as usize).unwrap_or(DEFAULT_RR_GROUP_SIZE),
        rr_advance_per_group: rr_adv.map(|a| a as usize).unwrap_or(3),
        start_time_ms: start_ms_raw as u64,
        max_rounds,
    }))
}

/// Fetch tournament context for subsequent rounds.
/// Requires status = IN_PROGRESS; uses now() as the scheduling start time.
pub(super) async fn fetch_context_in_progress(
    db: &Arc<PgPool>,
    tournament_id: &str,
) -> Result<Option<TournamentCtx>, BoxError> {
    let row = sqlx::query_as::<
        _,
        (
            String,
            bool,
            String,
            Option<String>,
            Option<i32>,
            Option<i32>,
            Option<i32>,
        ),
    >(
        r#"
        SELECT
            t."tournamentType"::text,
            t."isRated",
            t."gameType"::text,
            t."timeControlId",
            ds."groupSize",
            ds."advancePerGroup",
            ss."totalRounds"
        FROM "Tournament" t
        LEFT JOIN "DailySettings" ds ON ds."tournamentId" = t.id
        LEFT JOIN "SwissSettings" ss ON ss."tournamentId" = t.id
        WHERE t.id = $1
          AND t.status = 'IN_PROGRESS'::"TournamentStatus"
        "#,
    )
    .bind(tournament_id)
    .fetch_optional(&**db)
    .await?;

    let Some((tt, is_rated, game_type, tc_id, rr_grp, rr_adv, swiss_total_rounds)) = row else {
        return Ok(None);
    };

    let (time_slot, initial_time_sec, increment_sec) = resolve_time_control(db, tc_id).await?;

    let max_rounds = if tt.contains("SWISS") {
        swiss_total_rounds.map(|r| r as usize)
    } else {
        None
    };

    Ok(Some(TournamentCtx {
        tournament_id: tournament_id.to_string(),
        tournament_type: tt,
        is_rated,
        game_type: game_type.to_lowercase(),
        time_slot,
        initial_time_sec,
        increment_sec,
        rr_group_size: rr_grp.map(|g| g as usize).unwrap_or(DEFAULT_RR_GROUP_SIZE),
        rr_advance_per_group: rr_adv.map(|a| a as usize).unwrap_or(3),
        start_time_ms: now_ms(),
        max_rounds,
    }))
}
