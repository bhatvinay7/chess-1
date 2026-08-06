pub mod chess960;
/// Tournament initializer — sets up rounds, groups, pairings, DB rows, and Redis state.
///
/// Two public entry points:
///   `run_tournament_init` — first round; transitions tournament NOT_INITIALIZED → IN_PROGRESS.
///   `run_next_round`      — subsequent rounds; triggered by the scheduler after a round completes.
///
/// Internal module layout:
///   types        — MatchPlayer, TournamentCtx, shared constants
///   context      — fetch_context, fetch_context_in_progress
///   participants — fetch_participants, fetch_promoted_ids
///   grouping     — split_groups_swiss, split_groups_round_robin
///   round        — run_swiss, run_round_robin (pairing + DB + Redis pipeline)
///   db           — insert_game, insert_round, insert_group, insert_match, insert_bye
///   redis        — write_game_state, write_match_state, index_round, index_group
mod context;
mod db;
mod grouping;
mod participants;
mod redis;
mod round;
mod types;

// Re-export the public domain type so callers (e.g. test mocks) can reference it.
pub use types::MatchPlayer;

use crate::stream_jobs::RedisPool;
use sqlx::PgPool;
use std::sync::Arc;

use crate::handlers::standings::finalize_standings;
use context::{fetch_context, fetch_context_in_progress};
use grouping::{split_groups_round_robin, split_groups_swiss};
use participants::{fetch_participants, fetch_promoted_ids};
use round::{run_round_robin, run_swiss};
use types::{BoxError, BASE_SWISS_GROUP_SIZE};

// ── First round ───────────────────────────────────────────────────────────────

/// Initialise the first round for a NOT_INITIALIZED tournament.
/// Transitions the tournament status to IN_PROGRESS on success.
pub async fn run_tournament_init(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    tournament_id: &str,
) -> Result<(), BoxError> {
    let ctx = match fetch_context(db, tournament_id).await? {
        Some(c) => c,
        None => {
            eprintln!("[tournament_init] id={tournament_id} not found or not NOT_INITIALIZED");
            return Ok(());
        }
    };

    if ctx.tournament_type.contains("ARENA") {
        println!("[tournament_init] id={tournament_id} is Arena — skipping init");
        return Ok(());
    }

    let players = fetch_participants(db, tournament_id).await?;
    if players.len() < 2 {
        eprintln!("[tournament_init] id={tournament_id} has <2 participants — marking CANCELLED");
        sqlx::query(
            r#"UPDATE "Tournament"
               SET status = 'CANCELLED'::"TournamentStatus", "updatedAt" = NOW()
               WHERE id = $1"#,
        )
        .bind(tournament_id)
        .execute(&**db)
        .await?;
        return Ok(());
    }

    let round_number = next_round_number(db, tournament_id).await?;
    dispatch_pairings(db, redis, rabbitmq, &ctx, players, round_number).await?;

    sqlx::query(
        r#"UPDATE "Tournament"
           SET status = 'IN_PROGRESS'::"TournamentStatus", "updatedAt" = NOW()
           WHERE id = $1 AND status = 'NOT_INITIALIZED'"#,
    )
    .bind(tournament_id)
    .execute(&**db)
    .await?;

    println!("[tournament_init] id={tournament_id} round={round_number} → IN_PROGRESS");
    Ok(())
}

// ── Subsequent rounds ─────────────────────────────────────────────────────────

/// Advance an IN_PROGRESS tournament to its next round.
/// Selects the top-3 players from each group of the last completed round.
pub async fn run_next_round(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    tournament_id: &str,
) -> Result<(), BoxError> {
    let ctx = match fetch_context_in_progress(db, tournament_id).await? {
        Some(c) => c,
        None => {
            eprintln!("[tournament_init] run_next_round: id={tournament_id} not IN_PROGRESS");
            return Ok(());
        }
    };

    if ctx.tournament_type.contains("ARENA") {
        return Ok(());
    }

    let (promoted_ids, round_number) =
        match fetch_promoted_ids(db, tournament_id, ctx.rr_advance_per_group).await? {
            Some(r) => r,
            None => {
                println!(
                    "[tournament_init] run_next_round: no completed round for id={tournament_id}"
                );
                return Ok(());
            }
        };

    // ── Max-round guard ───────────────────────────────────────────────────────
    //
    // Swiss: SwissSettings.totalRounds caps the number of rounds.
    // Round Robin: each group of N players needs exactly (N_even − 1) rounds,
    //   where N_even = N if N is even, else N + 1 (bye-padded).
    //
    // If the proposed round_number exceeds the limit, mark the tournament
    // COMPLETED and return instead of creating another round.
    let is_round_robin = ctx.tournament_type.contains("ROUND_ROBIN");
    let is_swiss = ctx.tournament_type.contains("SWISS");

    let exceeded_max = if is_swiss {
        // Swiss: check against the configured totalRounds.
        ctx.max_rounds
            .map(|max| round_number > max)
            .unwrap_or(false)
    } else if is_round_robin {
        // Multi-phase Round Robin calculation
        let mut total_rounds = 0;
        // fetch_participants returns all participants originally registered
        let all_participants = fetch_participants(db, tournament_id).await?;
        let mut current_players = all_participants.len();

        loop {
            let groups = current_players.div_ceil(ctx.rr_group_size);
            let n_in_group = if groups <= 1 {
                current_players
            } else {
                ctx.rr_group_size
            };
            let n_even = if n_in_group % 2 == 0 {
                n_in_group
            } else {
                n_in_group + 1
            };
            total_rounds += n_even.saturating_sub(1).max(1);
            if groups <= 1 {
                break;
            }
            current_players = groups * ctx.rr_advance_per_group;
        }

        let effective_max = ctx
            .max_rounds
            .map(|m| m.min(total_rounds))
            .unwrap_or(total_rounds);

        round_number > effective_max
    } else {
        false
    };

    if exceeded_max {
        println!(
            "[tournament_init] run_next_round: round {round_number} exceeds max for \
             id={tournament_id} (type={}) — marking COMPLETED",
            ctx.tournament_type
        );
        sqlx::query(
            r#"UPDATE "Tournament"
               SET status = 'COMPLETED'::"TournamentStatus", "updatedAt" = NOW()
               WHERE id = $1 AND status = 'IN_PROGRESS'"#,
        )
        .bind(tournament_id)
        .execute(&**db)
        .await?;
        finalize_standings(db, redis, tournament_id).await;
        return Ok(());
    }

    if promoted_ids.len() < 2 {
        println!("[tournament_init] run_next_round: <2 promoted players for id={tournament_id} — marking COMPLETED");
        sqlx::query(
            r#"UPDATE "Tournament"
               SET status = 'COMPLETED'::"TournamentStatus", "updatedAt" = NOW()
               WHERE id = $1 AND status = 'IN_PROGRESS'"#,
        )
        .bind(tournament_id)
        .execute(&**db)
        .await?;
        finalize_standings(db, redis, tournament_id).await;
        return Ok(());
    }

    let players: Vec<MatchPlayer> = fetch_participants(db, tournament_id)
        .await?
        .into_iter()
        .filter(|p| promoted_ids.contains(&p.player_id))
        .collect();

    if players.len() < 2 {
        println!(
            "[tournament_init] run_next_round: promoted set < 2 after filter — tournament over"
        );
        return Ok(());
    }

    dispatch_pairings(db, redis, rabbitmq, &ctx, players, round_number).await?;
    println!("[tournament_init] run_next_round id={tournament_id} round={round_number} created");
    Ok(())
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/// Route players into Swiss or Round-Robin groups and kick off the round runner.
async fn dispatch_pairings(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    ctx: &types::TournamentCtx,
    players: Vec<MatchPlayer>,
    round_number: usize,
) -> Result<(), BoxError> {
    if ctx.tournament_type.contains("ROUND_ROBIN") {
        let groups = split_groups_round_robin(players, ctx.rr_group_size);
        run_round_robin(db, redis, rabbitmq, ctx, groups, round_number).await
    } else {
        let n_groups = players.len().div_ceil(BASE_SWISS_GROUP_SIZE).max(1);
        let groups = split_groups_swiss(players, n_groups);
        run_swiss(db, redis, rabbitmq, ctx, groups, round_number).await
    }
}

/// MAX(roundNumber) across all rounds for this tournament, defaulting to 0.
async fn next_round_number(db: &Arc<PgPool>, tournament_id: &str) -> Result<usize, BoxError> {
    let last: i32 = sqlx::query_scalar(
        r#"SELECT COALESCE(MAX("roundNumber"), 0) FROM "Round" WHERE "tournamentId" = $1"#,
    )
    .bind(tournament_id)
    .fetch_one(&**db)
    .await?;
    Ok((last + 1) as usize)
}
