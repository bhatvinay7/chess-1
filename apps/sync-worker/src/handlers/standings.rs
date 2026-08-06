//! Tournament standings — group-level and round-level ordered sets + state hashes.
//!
//! Called by game_result after every tournament game completion.
//!
//! # Redis layout
//!
//! ```text
//! tournament:group:{groupId}:standings   ZSET  score = wins + draws×0.5  member = playerId
//! tournament:group:{groupId}:state       HASH  field = playerId  value = JSON
//!   JSON = { playerId, username, score, wins, draws, losses, byes,
//!             games: [{ gameId, opponentId, opponentUsername, result, color, gameState }] }
//!
//! tournament:round:{roundId}:standings   ZSET  score = groupScore  member = playerId
//! tournament:round:{roundId}:state       HASH  field = playerId    value = JSON
//!   JSON = { playerId, username, groupId, groupRank, groupScore }
//!   ↑ written after EVERY game (live) and refreshed on group completion
//! ```
//!
//! # Scoring
//! score = wins × 1.0 + draws × 0.5  (standard chess)
//!
//! # Update cadence
//! After every game:
//!   1. refresh_group          → group:standings ZSET + group:state HASH (this group only)
//!   2. refresh_round_from_group → round:standings ZSET + round:state HASH (all players in group)
//!   3. If all group games done → advance_top_n_to_round (lock in promotion entries)

use std::sync::Arc;

use redis::AsyncCommands;
use sqlx::PgPool;
use uuid::Uuid;

use crate::stream_jobs::RedisPool;
use crate::tournament_keys::JOB_PREFIX;
use crate::tournament_keys::PENDING_ZSET;

type BoxError = Box<dyn std::error::Error + Send + Sync>;

/// Number of players per group that advance to round standings.
const TOP_N: i64 = 3;

// ── Public entry point ────────────────────────────────────────────────────────

/// Call once per tournament game completion (after DB commit).
///
/// 1. Refreshes group:standings ZSET + group:state HASH from current DB state.
/// 2. Refreshes round:standings ZSET + round:state HASH with live scores for all
///    players in this group (so round standings are always current, not just at group end).
/// 3. If all games in the group are now finished, advances the top-`TOP_N` players
///    to round:standings ZSET (locks in final promotion entries).
/// 4. If all games in the entire round are now finished, marks Round.status = COMPLETED.
///    This is the authoritative DB state transition — do not update Round.status anywhere else.
/// 5. On round completion, clears all live ZSETs/HASHes and API cache keys for that
///    round and its groups so subsequent reads fall back to DB-backed API cache.
pub async fn on_game_complete(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    group_id: &str,
    round_id: &str,
    tournament_id: &str,
) -> Result<(), BoxError> {
    refresh_group(db, redis, group_id, tournament_id).await?;
    refresh_round_from_group(db, redis, group_id, round_id, tournament_id).await?;

    if all_group_games_done(db, group_id).await? {
        advance_top_n_to_round(db, redis, group_id, round_id).await?;

        // Only check the round once a group completes — avoids an extra DB query
        // on every single game completion.
        if all_round_games_done(db, round_id).await? {
            complete_round(db, round_id).await?;
            // Clear live keys + API caches so completed data is served from DB.
            if let Err(e) = clear_live_round_cache(db, redis, round_id, tournament_id).await {
                eprintln!("[standings] cache clear failed for round={round_id}: {e}");
            }
            // Schedule the next round — all group games are done, advance top players.
            enqueue_next_round_job(redis, tournament_id).await;
        }
    }

    Ok(())
}

/// After a round is fully committed to DB, delete:
///   • live ZSETs + state HASHes for the round and all its groups
///   • API-layer cache keys so the next HTTP request re-populates from DB
async fn clear_live_round_cache(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    round_id: &str,
    tournament_id: &str,
) -> Result<(), BoxError> {
    let mut conn = redis.get().await.map_err(|e| Box::new(e) as BoxError)?;

    let group_ids: Vec<String> = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT DISTINCT "groupId" FROM "Match" WHERE "roundId" = $1 AND "groupId" IS NOT NULL"#,
    )
    .bind(round_id)
    .fetch_all(&**db)
    .await
    .unwrap_or_default()
    .into_iter()
    .flatten()
    .collect();

    let mut keys: Vec<String> = vec![
        format!("tournament:round:{round_id}:standings"),
        format!("tournament:round:{round_id}:state"),
        format!("cache:tournament:{tournament_id}:rounds"),
        format!("cache:tournament:{tournament_id}:round:{round_id}:leaderboard"),
    ];

    for gid in &group_ids {
        keys.push(format!("tournament:group:{gid}:standings"));
        keys.push(format!("tournament:group:{gid}:state"));
        keys.push(format!(
            "cache:tournament:{tournament_id}:group:{gid}:standings"
        ));
    }

    if !keys.is_empty() {
        let _: () = conn.del(keys).await.unwrap_or(());
    }
    println!(
        "[standings] round={round_id} live+api cache cleared ({} groups)",
        group_ids.len()
    );
    Ok(())
}

// ── Group layer ───────────────────────────────────────────────────────────────

/// Recompute group standings and state from DB, then write to Redis.
async fn refresh_group(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    group_id: &str,
    tournament_id: &str,
) -> Result<(), BoxError> {
    let players = query_group_players(db, group_id, tournament_id).await?;
    let games = query_group_games(db, group_id).await?;
    let mut conn = redis.get().await.map_err(|e| Box::new(e) as BoxError)?;

    let zset_key = format!("tournament:group:{group_id}:standings");
    let state_key = format!("tournament:group:{group_id}:state");

    for p in &players {
        let score = p.wins as f64 * 0.5 + p.draws as f64 * 0.5;
        let pid = p.player_id.to_string();

        // ZADD GT — only raise the score, never lower it (score is monotonically increasing)
        let _: () = redis::cmd("ZADD")
            .arg(&zset_key)
            .arg("GT")
            .arg(score)
            .arg(&pid)
            .query_async(&mut *conn)
            .await
            .unwrap_or(());

        // Build per-game entries for this player
        let game_jsons: Vec<String> = games.iter().filter_map(|g| {
            let (is_white, opp_id, opp_name) = if g.white_id == p.player_id {
                (true, g.black_id, g.black_name.clone().unwrap_or_default())
            } else if g.black_id == Some(p.player_id) {
                (false, Some(g.white_id), g.white_name.clone())
            } else {
                return None;
            };

            let result = result_label(is_white, &g.status);
            let opp_id_json = opp_id
                .map(|id| format!(r#""{id}""#))
                .unwrap_or_else(|| "null".to_string());

            Some(format!(
                r#"{{"gameId":"{gid}","opponentId":{opp},"opponentUsername":"{oname}","result":"{res}","color":"{col}","gameState":"{gs}"}}"#,
                gid  = g.game_id,
                opp  = opp_id_json,
                oname = escape_json(&opp_name),
                res  = result,
                col  = if is_white { "WHITE" } else { "BLACK" },
                gs   = g.status,
            ))
        }).collect();

        let state_json = format!(
            r#"{{"playerId":"{pid}","username":"{u}","score":{score},"wins":{w},"draws":{d},"losses":{l},"byes":{b},"games":[{games}]}}"#,
            pid = pid,
            u = escape_json(&p.username),
            score = score,
            w = p.wins,
            d = p.draws,
            l = p.losses,
            b = p.byes,
            games = game_jsons.join(","),
        );

        let _: () = conn.hset(&state_key, &pid, &state_json).await.unwrap_or(());
    }

    Ok(())
}

fn result_label(is_white: bool, status: &str) -> &'static str {
    match (status, is_white) {
        ("WHITE_WIN", true) => "WIN",
        ("WHITE_WIN", false) => "LOSS",
        ("BLACK_WIN", false) => "WIN",
        ("BLACK_WIN", true) => "LOSS",
        ("DRAW", _) => "DRAW",
        ("ABANDONED", _) => "ABANDONED",
        _ => "PENDING",
    }
}

/// True when every game in the group has reached a terminal status.
async fn all_group_games_done(db: &Arc<PgPool>, group_id: &str) -> Result<bool, BoxError> {
    let pending: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM "Game" g
        JOIN "Match" m ON m."gameId"::uuid = g.id
        WHERE m."groupId" = $1
          AND g.status NOT IN ('WHITE_WIN','BLACK_WIN','DRAW','ABANDONED')
        "#,
    )
    .bind(group_id)
    .fetch_one(&**db)
    .await?;
    Ok(pending == 0)
}

/// True when every game across ALL groups in the round has finished.
/// Called only after a group completes, so the extra query is infrequent.
async fn all_round_games_done(db: &Arc<PgPool>, round_id: &str) -> Result<bool, BoxError> {
    let pending: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM "Game" g
        JOIN "Match" m ON m."gameId"::uuid = g.id
        WHERE m."roundId" = $1
          AND g.status NOT IN ('WHITE_WIN','BLACK_WIN','DRAW','ABANDONED')
        "#,
    )
    .bind(round_id)
    .fetch_one(&**db)
    .await?;
    Ok(pending == 0)
}

/// Mark the round as COMPLETED in the DB.
/// Uses ON CONFLICT / status guard so concurrent calls from different group completions
/// are idempotent — only the first succeeds; subsequent calls are no-ops.
async fn complete_round(db: &Arc<PgPool>, round_id: &str) -> Result<(), BoxError> {
    sqlx::query(
        r#"
        UPDATE "Round"
        SET    status    = 'COMPLETED'::"RoundStatus",
               "endTime" = NOW()
        WHERE  id = $1
          AND  status   != 'COMPLETED'::"RoundStatus"
        "#,
    )
    .bind(round_id)
    .execute(&**db)
    .await?;
    println!("[standings] round={round_id} → COMPLETED");
    Ok(())
}

// ── Live round layer (per-game) ───────────────────────────────────────────────

/// Update round:standings ZSET and round:state HASH after every game.
///
/// Uses ZADD GT so a player's score in the round ZSET can only go up — never
/// back down if this function is called concurrently for the same round.
/// All players in the group get entries (not just the eventual top-N), so the
/// round ZSET reflects the full live ranking across all groups in the round.
async fn refresh_round_from_group(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    group_id: &str,
    round_id: &str,
    tournament_id: &str,
) -> Result<(), BoxError> {
    let players = query_group_players(db, group_id, tournament_id).await?;
    let mut conn = redis.get().await.map_err(|e| Box::new(e) as BoxError)?;

    let round_zset = format!("tournament:round:{round_id}:standings");
    let round_state = format!("tournament:round:{round_id}:state");

    // Sort by score descending to compute current in-group rank.
    let mut ranked: Vec<(&PlayerRow, f64)> = players
        .iter()
        .map(|p| (p, p.wins as f64 * 0.5 + p.draws as f64 * 0.5))
        .collect();
    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    for (rank, (player, score)) in ranked.iter().enumerate() {
        let pid = player.player_id.to_string();

        // GT: only raise the score in the ZSET, never lower it.
        let _: () = redis::cmd("ZADD")
            .arg(&round_zset)
            .arg("GT")
            .arg(*score)
            .arg(&pid)
            .query_async(&mut *conn)
            .await
            .unwrap_or(());

        let state_json = format!(
            r#"{{"playerId":"{pid}","username":"{u}","groupId":"{group_id}","groupRank":{rank},"groupScore":{score}}}"#,
            u = escape_json(&player.username),
            rank = rank + 1,
            score = score,
        );
        let _: () = conn
            .hset(&round_state, &pid, &state_json)
            .await
            .unwrap_or(());
    }

    Ok(())
}

// ── Round layer (on group completion) ────────────────────────────────────────

async fn advance_top_n_to_round(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    group_id: &str,
    round_id: &str,
) -> Result<(), BoxError> {
    let mut conn = redis.get().await.map_err(|e| Box::new(e) as BoxError)?;

    let group_zset = format!("tournament:group:{group_id}:standings");
    let round_zset = format!("tournament:round:{round_id}:standings");
    let round_state = format!("tournament:round:{round_id}:state");

    // Read top-N from group standings (highest score first)
    let raw: Vec<redis::Value> = redis::cmd("ZREVRANGE")
        .arg(&group_zset)
        .arg(0i64)
        .arg(TOP_N - 1)
        .arg("WITHSCORES")
        .query_async(&mut *conn)
        .await
        .unwrap_or_default();

    let top = parse_zset_with_scores(raw);

    for (rank, (player_id, score)) in top.iter().enumerate() {
        // NX: don't overwrite if the player is already in round standings from
        // a previous group (shouldn't happen, but safe to guard)
        let _: () = redis::cmd("ZADD")
            .arg(&round_zset)
            .arg("NX")
            .arg(*score)
            .arg(player_id)
            .query_async(&mut *conn)
            .await
            .unwrap_or(());

        let username: String = sqlx::query_scalar(r#"SELECT username FROM "User" WHERE id = $1"#)
            .bind(Uuid::parse_str(player_id).unwrap_or_default())
            .fetch_optional(&**db)
            .await?
            .unwrap_or_default();

        let state_json = format!(
            r#"{{"playerId":"{player_id}","username":"{u}","groupId":"{group_id}","groupRank":{rank},"groupScore":{score}}}"#,
            player_id = player_id,
            u = escape_json(&username),
            group_id = group_id,
            rank = rank + 1, // 1-indexed
            score = score,
        );

        let _: () = conn
            .hset(&round_state, player_id, &state_json)
            .await
            .unwrap_or(());
    }

    println!(
        "[standings] group={group_id} complete → advanced top-{} to round={round_id}",
        top.len()
    );
    Ok(())
}

// ── DB helpers ────────────────────────────────────────────────────────────────

struct PlayerRow {
    player_id: Uuid,
    username: String,
    wins: i32,
    draws: i32,
    losses: i32,
    byes: i64, // COUNT(*) returns INT8
}

struct GameRow {
    game_id: String,
    white_id: Uuid,
    black_id: Option<Uuid>,
    status: String,
    white_name: String,
    black_name: Option<String>,
}

async fn query_group_players(
    db: &Arc<PgPool>,
    group_id: &str,
    tournament_id: &str,
) -> Result<Vec<PlayerRow>, BoxError> {
    // wins/draws/losses are INT4 (Prisma Int) → i32. byes is COUNT(*) → INT8 → i64.
    let rows = sqlx::query_as::<_, (Uuid, String, i32, i32, i32, i64)>(
        r#"
        SELECT DISTINCT ON (tp."playerId")
            tp."playerId",
            u.username,
            COALESCE(ps.wins,   0),
            COALESCE(ps.draws,  0),
            COALESCE(ps.losses, 0),
            (SELECT COUNT(*) FROM "TournamentBye" b
             WHERE b."tournamentId" = $2 AND b."playerId" = tp."playerId")
        FROM "Match" m
        JOIN "Game" g  ON g.id = m."gameId"::uuid
        JOIN "TournamentParticipant" tp
            ON  tp."tournamentId" = $2
            AND (tp."playerId" = g."whitePlayerId" OR tp."playerId" = g."blackPlayerId")
        JOIN "User" u  ON u.id  = tp."playerId"
        LEFT JOIN "TournamentPlayerStats" ps ON ps."tournamentParticipantId" = tp.id
        WHERE m."groupId" = $1
          AND g."blackPlayerId" IS NOT NULL
        "#,
    )
    .bind(group_id)
    .bind(tournament_id)
    .fetch_all(&**db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(pid, uname, w, d, l, b)| PlayerRow {
            player_id: pid,
            username: uname,
            wins: w,
            draws: d,
            losses: l,
            byes: b,
        })
        .collect())
}

async fn query_group_games(db: &Arc<PgPool>, group_id: &str) -> Result<Vec<GameRow>, BoxError> {
    let rows = sqlx::query_as::<_, (Uuid, Uuid, Option<Uuid>, String, String, Option<String>)>(
        r#"
        SELECT g.id, g."whitePlayerId", g."blackPlayerId",
               g.status::text, wu.username, bu.username
        FROM "Match" m
        JOIN "Game" g     ON g.id  = m."gameId"::uuid
        JOIN "User" wu    ON wu.id = g."whitePlayerId"
        LEFT JOIN "User" bu ON bu.id = g."blackPlayerId"
        WHERE m."groupId" = $1
        ORDER BY g."createdAt"
        "#,
    )
    .bind(group_id)
    .fetch_all(&**db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(gid, wid, bid, status, wn, bn)| GameRow {
            game_id: gid.to_string(),
            white_id: wid,
            black_id: bid,
            status,
            white_name: wn,
            black_name: bn,
        })
        .collect())
}

// ── Utility ───────────────────────────────────────────────────────────────────

/// Parse flat ZREVRANGE … WITHSCORES response into `(member, score)` pairs.
fn parse_zset_with_scores(raw: Vec<redis::Value>) -> Vec<(String, f64)> {
    let mut out = vec![];
    let mut it = raw.into_iter();
    while let (Some(m), Some(s)) = (it.next(), it.next()) {
        let member = match m {
            redis::Value::BulkString(b) => String::from_utf8_lossy(&b).into_owned(),
            _ => continue,
        };
        let score = match s {
            redis::Value::BulkString(b) => {
                String::from_utf8_lossy(&b).parse::<f64>().unwrap_or(0.0)
            }
            _ => 0.0,
        };
        out.push((member, score));
    }
    out
}

/// Push a "next_round" trigger into the tournament scheduler ZSET so the
/// tournament_consumer picks it up and advances the tournament to the next round.
/// Uses NX so concurrent calls from multiple group completions are idempotent.
async fn enqueue_next_round_job(redis: &RedisPool, tournament_id: &str) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[standings] Redis pool error: {e}");
            return;
        }
    };
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let jid = format!("t:{tournament_id}:next_round");
    let data_json = format!(r#"{{"tournamentId":"{tournament_id}","trigger":"next_round"}}"#);
    let _: () = redis::cmd("HSET")
        .arg(format!("{JOB_PREFIX}:{jid}"))
        .arg("data")
        .arg(&data_json)
        .arg("attemptsMade")
        .arg("0")
        .query_async(&mut *conn)
        .await
        .unwrap_or(());

    // NX: if a job for this tournament is already pending, don't overwrite it
    let added: i64 = redis::cmd("ZADD")
        .arg(PENDING_ZSET)
        .arg("NX")
        .arg(now_ms as f64)
        .arg(&jid)
        .query_async(&mut *conn)
        .await
        .unwrap_or(0);

    if added > 0 {
        println!("[standings] enqueued next_round job for tournament={tournament_id}");
    }
}

fn escape_json(s: &str) -> String {
    s.replace('\\', r"\\").replace('"', r#"\""#)
}

// ── Final standings (called when tournament is COMPLETED) ─────────────────────

/// Compute and persist the final tournament standings once all rounds are done.
///
/// Steps:
///   1. Query every participant's cumulative stats (score, wins, draws, losses, Buchholz).
///   2. Rank them: score DESC → buchholz DESC → wins DESC.
///   3. Write `currentRank` into each `TournamentPlayerStats` row.
///   4. Publish a Redis ZSET `tournament:{id}:final:standings` (score = rank score)
///      and a HASH `tournament:{id}:final:state` for the API layer.
///   5. Invalidate the tournament-level API cache so the next HTTP request returns
///      fresh final data.
pub async fn finalize_standings(db: &Arc<PgPool>, redis: &RedisPool, tournament_id: &str) {
    if let Err(e) = finalize_standings_inner(db, redis, tournament_id).await {
        eprintln!("[standings] finalize failed for tournament={tournament_id}: {e}");
    }
}

async fn finalize_standings_inner(
    db: &Arc<PgPool>,
    redis: &RedisPool,
    tournament_id: &str,
) -> Result<(), BoxError> {
    // ── 1. Fetch all participants with cumulative stats ────────────────────────
    let rows = sqlx::query_as::<_, (String, String, f64, i32, i32, i32, f64)>(
        r#"
        SELECT
            tp."playerId"::text,
            u.username,
            COALESCE(ps.score,     0.0),
            COALESCE(ps.wins,      0),
            COALESCE(ps.draws,     0),
            COALESCE(ps.losses,    0),
            COALESCE(ps.buchholz,  0.0)
        FROM "TournamentParticipant" tp
        JOIN "User" u ON u.id = tp."playerId"
        LEFT JOIN "TournamentPlayerStats" ps ON ps."tournamentParticipantId" = tp.id
        WHERE tp."tournamentId" = $1
        ORDER BY
            COALESCE(ps.score,    0.0) DESC,
            COALESCE(ps.buchholz, 0.0) DESC,
            COALESCE(ps.wins,     0)   DESC
        "#,
    )
    .bind(tournament_id)
    .fetch_all(&**db)
    .await?;

    if rows.is_empty() {
        println!("[standings] finalize: no participants for tournament={tournament_id}");
        return Ok(());
    }

    // ── 2. Assign ranks (shared rank for tied scores) ─────────────────────────
    let mut ranked: Vec<(String, String, f64, i32, i32, i32, f64, i32)> = Vec::new();
    let mut current_rank = 1i32;
    for (i, (pid, uname, score, wins, draws, losses, buchholz)) in rows.iter().enumerate() {
        if i > 0 {
            let (_, _, prev_score, prev_wins, _, _, prev_buch, _) = &ranked[i - 1];
            if score == prev_score && wins == prev_wins && buchholz == prev_buch {
                // tied — share rank with previous
            } else {
                current_rank = (i + 1) as i32;
            }
        }
        ranked.push((
            pid.clone(),
            uname.clone(),
            *score,
            *wins,
            *draws,
            *losses,
            *buchholz,
            current_rank,
        ));
    }

    // ── 3. Persist currentRank in TournamentPlayerStats ───────────────────────
    let mut tx = db.begin().await?;
    for (pid, _, _, _, _, _, _, rank) in &ranked {
        sqlx::query(
            r#"
            UPDATE "TournamentPlayerStats" ps
            SET    "currentRank" = $1
            FROM   "TournamentParticipant" tp
            WHERE  ps."tournamentParticipantId" = tp.id
              AND  tp."tournamentId"            = $2
              AND  tp."playerId"::text          = $3
            "#,
        )
        .bind(rank)
        .bind(tournament_id)
        .bind(pid)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;
    println!(
        "[standings] finalize: wrote final ranks for {} players in tournament={}",
        ranked.len(),
        tournament_id
    );

    // ── 4. Publish final standings to Redis ───────────────────────────────────
    let mut conn = redis.get().await.map_err(|e| Box::new(e) as BoxError)?;
    let zset_key = format!("tournament:{tournament_id}:final:standings");
    let state_key = format!("tournament:{tournament_id}:final:state");

    for (pid, uname, score, wins, draws, losses, buchholz, rank) in &ranked {
        // Score in ZSET = negated rank so ZRANGE 0 0 returns rank-1 player.
        let zset_score = -(*rank as f64);
        let _: () = redis::cmd("ZADD")
            .arg(&zset_key)
            .arg(zset_score)
            .arg(pid)
            .query_async(&mut *conn)
            .await
            .unwrap_or(());

        let state_json = format!(
            r#"{{"playerId":"{pid}","username":"{u}","rank":{rank},"score":{score},"wins":{wins},"draws":{draws},"losses":{losses},"buchholz":{buchholz:.2}}}"#,
            u = escape_json(uname),
            rank = rank,
            score = score,
            wins = wins,
            draws = draws,
            losses = losses,
            buchholz = buchholz,
        );
        let _: () = conn.hset(&state_key, pid, &state_json).await.unwrap_or(());
    }

    // TTL: keep final standings for 30 days
    let _: () = conn.expire(&zset_key, 30 * 24 * 3600).await.unwrap_or(());
    let _: () = conn.expire(&state_key, 30 * 24 * 3600).await.unwrap_or(());

    // ── 5. Invalidate the tournament-level API cache ───────────────────────────
    let cache_keys = vec![
        format!("cache:tournament:{tournament_id}:rounds"),
        format!("cache:tournament:{tournament_id}:standings"),
        format!("cache:tournament:{tournament_id}:leaderboard"),
    ];
    let _: () = conn.del(cache_keys).await.unwrap_or(());

    println!(
        "[standings] finalize: Redis final:standings + cache bust for tournament={tournament_id}"
    );
    Ok(())
}
