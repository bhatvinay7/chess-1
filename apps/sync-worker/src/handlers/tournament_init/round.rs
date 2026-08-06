use std::collections::HashMap;
use std::sync::Arc;

use sqlx::PgPool;
use uuid::Uuid;

use crate::handlers::scheduling;
use crate::r#match::{
    allocate_colors as swiss_allocate_colors, generate_pairings as swiss_generate_pairings,
    Color as SwissColor, Player as SwissPlayer,
};
use crate::stream_jobs::RedisPool;

use super::db::{insert_bye, insert_game, insert_group, insert_match, insert_round};
use super::redis::{index_group, index_round, now_ms, write_game_state, write_match_state};
use super::types::{BoxError, MatchPlayer, TournamentCtx};

// ── Pairing result ────────────────────────────────────────────────────────────

enum Pairing<'a> {
    Game {
        white: &'a MatchPlayer,
        black: &'a MatchPlayer,
    },
    Bye {
        player: &'a MatchPlayer,
    },
}

// ── Swiss round ───────────────────────────────────────────────────────────────

pub(super) async fn run_swiss(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    ctx: &TournamentCtx,
    groups: Vec<Vec<MatchPlayer>>,
    round_number: usize,
) -> Result<(), BoxError> {
    let mut tx = db.begin().await?;
    let round_id = Uuid::new_v4().to_string();

    insert_round(&mut tx, &round_id, &ctx.tournament_id, round_number as i32).await?;

    // Collect (group_id, group_number) so we can index them after tx.commit().
    let mut group_meta: Vec<(String, i32)> = Vec::new();
    let mut notifications = Vec::new();

    for (g_idx, group) in groups.iter().enumerate() {
        let group_number = (g_idx + 1) as i32;
        let group_id = Uuid::new_v4().to_string();

        insert_group(
            &mut tx,
            &group_id,
            &ctx.tournament_id,
            round_number as i32,
            group_number,
        )
        .await?;
        group_meta.push((group_id.clone(), group_number));

        for pairing in swiss_pairings(group) {
            match pairing {
                Pairing::Bye { player } => {
                    insert_bye(
                        &mut tx,
                        &ctx.tournament_id,
                        player.player_id,
                        round_number as i32,
                    )
                    .await?;
                }
                Pairing::Game { white, black } => {
                    let starting_fen = if ctx.game_type == "chess960" {
                        crate::handlers::tournament_init::chess960::random_fen()
                    } else {
                        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string()
                    };

                    let game_id = Uuid::new_v4();
                    let match_id = schedule_game(
                        &mut tx,
                        redis,
                        ctx,
                        &round_id,
                        &group_id,
                        white,
                        black,
                        ctx.start_time_ms,
                        1u64,
                        game_id,
                        &starting_fen,
                    )
                    .await?;

                    notifications.push(rabbitmq_rustclient::types::MatchNotificationEvent {
                        match_id,
                        game_id: game_id.to_string(),
                        tournament_id: ctx.tournament_id.clone(),
                        white_player_id: white.player_id.to_string(),
                        black_player_id: black.player_id.to_string(),
                    });
                }
            }
        }
    }

    tx.commit().await?;

    // Redis index writes happen AFTER commit so that a rollback never leaves
    // orphan entries in the round/group ZSETs.
    index_round(redis, &ctx.tournament_id, &round_id, round_number).await;
    for (group_id, group_number) in &group_meta {
        index_group(
            redis,
            &ctx.tournament_id,
            &round_id,
            group_id,
            *group_number,
        )
        .await;
    }

    for evt in notifications {
        if let Err(e) = rabbitmq.publish_match_created(&evt).await {
            eprintln!("[tournament_init/swiss] Failed to publish match notification: {e}");
        }
    }

    Ok(())
}

// ── Round-Robin round ─────────────────────────────────────────────────────────

pub(super) async fn run_round_robin(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    ctx: &TournamentCtx,
    groups: Vec<Vec<MatchPlayer>>,
    round_number: usize,
) -> Result<(), BoxError> {
    let mut tx = db.begin().await?;
    let round_id = Uuid::new_v4().to_string();

    insert_round(&mut tx, &round_id, &ctx.tournament_id, round_number as i32).await?;

    // Collect group metadata so Redis index writes can happen after tx.commit().
    let mut group_meta: Vec<(String, i32)> = Vec::new();
    let mut notifications = Vec::new();

    for (g_idx, group) in groups.iter().enumerate() {
        let group_number = (g_idx + 1) as i32;
        let group_id = Uuid::new_v4().to_string();

        insert_group(
            &mut tx,
            &group_id,
            &ctx.tournament_id,
            round_number as i32,
            group_number,
        )
        .await?;
        group_meta.push((group_id.clone(), group_number));

        let bye_seat = group.len();
        for (seat_a, seat_b) in crate::round_robin::round_pairings(group.len(), round_number - 1) {
            if seat_a == bye_seat || seat_b == bye_seat {
                let real = &group[if seat_a == bye_seat { seat_b } else { seat_a }];
                insert_bye(
                    &mut tx,
                    &ctx.tournament_id,
                    real.player_id,
                    round_number as i32,
                )
                .await?;
                continue;
            }

            // Double-header: pre-allocate both game IDs so they can cross-reference
            // each other via paired_game_id in game:state.
            let mp_a = &group[seat_a];
            let mp_b = &group[seat_b];
            let a_str = mp_a.player_id.to_string();
            let b_str = mp_b.player_id.to_string();
            let game1_id = Uuid::new_v4();
            let game2_id = Uuid::new_v4();

            // n_games=2 covers the full double-header duration for conflict detection.
            let from_ms = ctx.start_time_ms.max(now_ms());
            let g1_start = scheduling::find_free_slot_for(
                redis,
                &[&a_str, &b_str],
                from_ms,
                ctx.initial_time_sec as u64,
                2u64,
            )
            .await;

            // game 1 directly from game 1's state when game 1 finishes.
            let starting_fen = if ctx.game_type == "chess960" {
                crate::handlers::tournament_init::chess960::random_fen()
            } else {
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1".to_string()
            };

            let (match1_id, g1_end) = schedule_game_at(
                &mut tx,
                redis,
                ctx,
                &round_id,
                &group_id,
                mp_a,
                mp_b,
                game1_id,
                &game2_id.to_string(),
                g1_start,
                ctx.initial_time_sec as u64,
                false, // add_buffer — end_ms = pure playing time (no gap before game 2)
                true,  // set_player_ptrs — matchmaking:gameId written for game 1
                &starting_fen,
            )
            .await?;

            notifications.push(rabbitmq_rustclient::types::MatchNotificationEvent {
                match_id: match1_id,
                game_id: game1_id.to_string(),
                tournament_id: ctx.tournament_id.clone(),
                white_player_id: mp_a.player_id.to_string(),
                black_player_id: mp_b.player_id.to_string(),
            });

            // Game 2: colours swapped, starts immediately after game 1 (g1_end = g2_start).
            // paired_game_id = game1 for symmetry and cross-lookup.
            // set_player_ptrs=false: matchmaking:gameId is NOT written yet; it is set
            // by release_rr_paired_game when game 1 finishes.
            // user:active:games IS written now (score = g1_end); join_arena filters
            // by score ≤ now_ms so game 2 is invisible while game 1 is running.
            let (match2_id, _g2_end) = schedule_game_at(
                &mut tx,
                redis,
                ctx,
                &round_id,
                &group_id,
                mp_b,
                mp_a,
                game2_id,
                &game1_id.to_string(),
                g1_end,
                ctx.initial_time_sec as u64,
                true,  // add_buffer — end_ms used for conflict detection only
                false, // set_player_ptrs — deferred to release_rr_paired_game
                &starting_fen,
            )
            .await?;

            notifications.push(rabbitmq_rustclient::types::MatchNotificationEvent {
                match_id: match2_id,
                game_id: game2_id.to_string(),
                tournament_id: ctx.tournament_id.clone(),
                white_player_id: mp_b.player_id.to_string(),
                black_player_id: mp_a.player_id.to_string(),
            });
        }
    }

    tx.commit().await?;

    // Redis index writes happen AFTER commit so a rollback never leaves orphan
    // entries in the round/group navigation ZSETs.
    index_round(redis, &ctx.tournament_id, &round_id, round_number).await;
    for (group_id, group_number) in &group_meta {
        index_group(
            redis,
            &ctx.tournament_id,
            &round_id,
            group_id,
            *group_number,
        )
        .await;
    }

    for evt in notifications {
        if let Err(e) = rabbitmq.publish_match_created(&evt).await {
            eprintln!("[tournament_init/rr] Failed to publish match notification: {e}");
        }
    }

    Ok(())
}

// ── Shared game scheduling ────────────────────────────────────────────────────

/// Find a free slot and persist one game + match row, game:state, and schedule entries.
/// Used by Swiss (single game per pair — no pairing link needed).
async fn schedule_game<'t>(
    tx: &mut sqlx::Transaction<'t, sqlx::Postgres>,
    redis: &RedisPool,
    ctx: &TournamentCtx,
    round_id: &str,
    group_id: &str,
    white: &MatchPlayer,
    black: &MatchPlayer,
    base_ms: u64,
    n_games: u64,
    game_id: Uuid,
    starting_fen: &str,
) -> Result<String, BoxError> {
    let white_str = white.player_id.to_string();
    let black_str = black.player_id.to_string();
    let from_ms = base_ms.max(now_ms());
    let game_slot = scheduling::find_free_slot_for(
        redis,
        &[&white_str, &black_str],
        from_ms,
        ctx.initial_time_sec as u64,
        n_games,
    )
    .await;
    let est_end = scheduling::estimate_end_ms(game_slot, ctx.initial_time_sec as u64, n_games);

    persist_game(
        tx,
        redis,
        ctx,
        round_id,
        group_id,
        white,
        black,
        game_id,
        "",
        game_slot,
        est_end,
        true,
        starting_fen,
    )
    .await
}

async fn schedule_game_at<'t>(
    tx: &mut sqlx::Transaction<'t, sqlx::Postgres>,
    redis: &RedisPool,
    ctx: &TournamentCtx,
    round_id: &str,
    group_id: &str,
    white: &MatchPlayer,
    black: &MatchPlayer,
    game_id: Uuid,
    paired_game_id: &str,
    start_ms: u64,
    clock_sec: u64,
    add_buffer: bool,
    set_player_ptrs: bool,
    starting_fen: &str,
) -> Result<(String, u64), BoxError> {
    let end_ms = if add_buffer {
        scheduling::estimate_end_ms(start_ms, clock_sec, 1)
    } else {
        start_ms + clock_sec * 2 * 1_000
    };

    let match_id = persist_game(
        tx,
        redis,
        ctx,
        round_id,
        group_id,
        white,
        black,
        game_id,
        paired_game_id,
        start_ms,
        end_ms,
        set_player_ptrs,
        starting_fen,
    )
    .await?;
    Ok((match_id, end_ms))
}

async fn persist_game<'t>(
    tx: &mut sqlx::Transaction<'t, sqlx::Postgres>,
    redis: &RedisPool,
    ctx: &TournamentCtx,
    round_id: &str,
    group_id: &str,
    white: &MatchPlayer,
    black: &MatchPlayer,
    game_id: Uuid,
    paired_game_id: &str,
    start_ms: u64,
    end_ms: u64,
    set_player_ptrs: bool,
    starting_fen: &str,
) -> Result<String, BoxError> {
    let match_id = Uuid::new_v4().to_string();
    let game_id_str = game_id.to_string();
    let white_str = white.player_id.to_string();
    let black_str = black.player_id.to_string();

    insert_game(tx, game_id, white, black, ctx, starting_fen).await?;
    insert_match(
        tx,
        &match_id,
        &ctx.tournament_id,
        round_id,
        group_id,
        game_id,
    )
    .await?;

    write_game_state(
        redis,
        &game_id_str,
        white,
        black,
        ctx,
        round_id,
        group_id,
        &match_id,
        start_ms,
        set_player_ptrs,
        paired_game_id,
        starting_fen,
    )
    .await;
    write_match_state(
        redis,
        &match_id,
        &game_id_str,
        group_id,
        round_id,
        &white_str,
        &black_str,
        start_ms,
    )
    .await;
    // Scheduling conflict detection — always written for both games in the pair.
    scheduling::add_to_schedule(redis, &white_str, &game_id_str, start_ms, end_ms).await;
    scheduling::add_to_schedule(redis, &black_str, &game_id_str, start_ms, end_ms).await;
    // Both games are added to user:active:games immediately (game 2 with score =
    // its future start_ms).  join_arena does ZRANGEBYSCORE ≤ now_ms so game 2
    // stays invisible while game 1 is running.  release_rr_paired_game updates
    // game 2's score to now_ms when game 1 ends (early or on time).
    scheduling::add_to_active_games(redis, &white_str, &game_id_str, start_ms).await;
    scheduling::add_to_active_games(redis, &black_str, &game_id_str, start_ms).await;

    Ok(match_id)
}

// ── Swiss pairing helper ──────────────────────────────────────────────────────

fn swiss_pairings(group: &[MatchPlayer]) -> Vec<Pairing<'_>> {
    let idx_map: HashMap<Uuid, usize> = group
        .iter()
        .enumerate()
        .map(|(i, p)| (p.player_id, i))
        .collect();

    let swiss_players: Vec<SwissPlayer> = group
        .iter()
        .enumerate()
        .map(|(i, mp)| SwissPlayer {
            id: i,
            name: mp.username.clone(),
            rating: mp.rating,
            score: mp.score as f32,
            history: mp
                .opponent_ids
                .iter()
                .filter_map(|uid| idx_map.get(uid).copied())
                .collect(),
            color_history: mp
                .colors_played
                .iter()
                .map(|c| {
                    if c == "WHITE" {
                        SwissColor::White
                    } else {
                        SwissColor::Black
                    }
                })
                .collect(),
            received_bye: mp.bye_received,
            is_dummy: false,
        })
        .collect();

    let dummy = group.len();
    swiss_generate_pairings(swiss_players.clone())
        .into_iter()
        .map(|(id_a, id_b)| {
            // One of the indices is the dummy — whichever is real gets a bye.
            if id_a == dummy || id_b == dummy {
                let real_idx = if id_a == dummy { id_b } else { id_a };
                return Pairing::Bye {
                    player: &group[real_idx],
                };
            }
            let (col_a, _) = swiss_allocate_colors(&swiss_players[id_a], &swiss_players[id_b]);
            if col_a == SwissColor::White {
                Pairing::Game {
                    white: &group[id_a],
                    black: &group[id_b],
                }
            } else {
                Pairing::Game {
                    white: &group[id_b],
                    black: &group[id_a],
                }
            }
        })
        .collect()
}
