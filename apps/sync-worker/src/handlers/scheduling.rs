use crate::stream_jobs::RedisPool;
use redis::AsyncCommands;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// 15-minute buffer appended to every occupied slot.
pub const SCHEDULE_BUFFER_SEC: u64 = 15 * 60;

// ── Pure helpers

/// Snap `after_ms` up to the next 30-minute boundary (the granularity of
/// `VALID_TOURNAMENT_SLOTS`).  If `after_ms` is already on a boundary it is
/// returned unchanged.  Used to align each round's start time to the grid.
pub fn next_valid_slot_ms(after_ms: u64) -> u64 {
    const SLOT_MS: u64 = 30 * 60 * 1_000;
    let rem = after_ms % SLOT_MS;
    if rem == 0 {
        after_ms
    } else {
        after_ms + (SLOT_MS - rem)
    }
}

/// Returns the internal estimated end time used **only** for scheduling.
///
/// - `n_games = 1`  → Swiss / single game  : 2 × clock + 15 min
/// - `n_games = 2`  → RR double-header pair: 4 × clock + 15 min
pub fn estimate_end_ms(start_ms: u64, initial_time_sec: u64, n_games: u64) -> u64 {
    let duration_ms = (initial_time_sec * 2 * n_games + SCHEDULE_BUFFER_SEC) * 1_000;
    start_ms + duration_ms
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

/// Remove ghost entries from `game:schedule:info` and `user:active:games` for
/// one player before slot search.
///
/// A ghost is any entry whose game no longer has a live `game:state` key in
/// Redis (deleted when the game ends).  Ghosts arise when the normal
/// `remove_from_schedule` path is skipped (crash, timeout race, etc.).
///
/// - `game:schedule:info:{uid}` — drop entries where `endTime < now_ms`
///   (no extra round-trip needed; end time is already in the JSON).
/// - `user:active:games:{uid}`  — for entries with score ≤ now_ms, verify
///   `game:state:{gameId}` exists; drop those that don't.
pub async fn purge_ghost_entries(redis: &RedisPool, user_id: &str) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return,
    };
    let now = now_ms();

    let info_key = format!("game:schedule:info:{user_id}");
    let active_key = format!("user:active:games:{user_id}");

    // ── 1. Collect candidates from both keys ─────────────────────────────────
    // game:schedule:info: pre-filter by endTime < now (future games can't be ghosts).
    let raw: HashMap<String, String> = redis::cmd("HGETALL")
        .arg(&info_key)
        .query_async(&mut *conn)
        .await
        .unwrap_or_default();

    let mut candidates: Vec<String> = raw
        .iter()
        .filter_map(|(game_id, json)| {
            let v: serde_json::Value = serde_json::from_str(json).ok()?;
            let end = v["endTime"].as_u64()?;
            if end < now {
                Some(game_id.clone())
            } else {
                None
            }
        })
        .collect();

    // user:active:games: pre-filter by score ≤ now (start time in the past).
    let active_candidates: Vec<String> = conn
        .zrangebyscore(&active_key, 0.0, now as f64)
        .await
        .unwrap_or_default();

    // Merge without duplicates — one EXISTS check per game_id.
    for gid in active_candidates {
        if !candidates.contains(&gid) {
            candidates.push(gid);
        }
    }

    if candidates.is_empty() {
        return;
    }

    // ── 2. Batch-check game:state existence in one pipeline ───────────────────
    // game:state:{id} is deleted when a game ends — absence confirms a ghost.
    // A game exceeding its estimated end_ms still has game:state present,
    // so it is NOT purged even though endTime < now.
    let mut pipe = redis::pipe();
    for gid in &candidates {
        pipe.exists(format!("game:state:{gid}"));
    }
    let exists_results: Vec<bool> = pipe
        .query_async(&mut *conn)
        .await
        .unwrap_or_else(|_| vec![false; candidates.len()]);

    let ghosts: Vec<String> = candidates
        .into_iter()
        .zip(exists_results)
        .filter_map(|(gid, exists)| if !exists { Some(gid) } else { None })
        .collect();

    if ghosts.is_empty() {
        return;
    }

    // ── 3. Remove confirmed ghosts from both keys ─────────────────────────────
    eprintln!(
        "[scheduling] purging {} ghost(s) for {user_id}",
        ghosts.len()
    );
    let _: () = conn.hdel(&info_key, &ghosts).await.unwrap_or(());
    let _: () = conn.zrem(&active_key, &ghosts).await.unwrap_or(());
}

/// Merge a sorted list of intervals into non-overlapping blocks.
///
/// Both players' schedules are combined before this call, so intervals from
/// different players can overlap each other.  Merging collapses them into a
/// single timeline so the gap scan below needs only one pass.
fn merge_intervals(sorted: Vec<(u64, u64)>) -> Vec<(u64, u64)> {
    let mut merged: Vec<(u64, u64)> = Vec::new();
    for (start, end) in sorted {
        match merged.last_mut() {
            Some(last) if start <= last.1 => last.1 = last.1.max(end),
            _ => merged.push((start, end)),
        }
    }
    merged
}

/// Find the earliest free slot for all `user_ids` starting at or after `from_ms`.
///
/// `initial_time_sec` and `n_games` define the game duration:
///   duration = (initial_time_sec × 2 × n_games + 15 min buffer) × 1000 ms
///
/// Both players' intervals are merged into one timeline before scanning so
/// overlapping schedules from different players are handled in a single pass.
///
/// - Case 1 (free from the start): schedule is empty or `from_ms` is before
///   all intervals → `from_ms` returned as-is.
/// - Case 2 (all overlapping): every merged block pushes the candidate
///   forward; returns next_valid_slot_ms past the last block's end.
/// - Case 3 (gap between blocks): exits as soon as a gap wide enough for the
///   game is found between two consecutive merged blocks.
pub async fn find_free_slot_for(
    redis: &RedisPool,
    user_ids: &[&str],
    from_ms: u64,
    initial_time_sec: u64,
    n_games: u64,
) -> u64 {
    for uid in user_ids {
        purge_ghost_entries(redis, uid).await;
    }

    let mut intervals: Vec<(u64, u64)> = Vec::new();
    for uid in user_ids {
        intervals.extend(get_schedule_intervals(redis, uid).await);
    }
    intervals.sort_unstable_by_key(|&(s, _)| s);
    let merged = merge_intervals(intervals);

    // Fixed game window in milliseconds.
    let duration_ms = (initial_time_sec * 2 * n_games + SCHEDULE_BUFFER_SEC) * 1_000;

    // Start at from_ms directly — no upfront 30-min snap.
    // If the schedule is empty or from_ms falls before all intervals,
    // the loop exits immediately and from_ms is returned as-is (Case 1).
    // The 30-min snap only applies when we are forced past a blocked interval.
    let mut candidate = from_ms;

    for (iv_start, iv_end) in &merged {
        // Start-bound: game starts at or after this interval's end — no conflict.
        if candidate >= *iv_end {
            continue;
        }
        // End-bound: game ends at or before this interval's start — free slot.
        if candidate + duration_ms <= *iv_start {
            break;
        }
        // Game overlaps this interval — push past it and snap to 30-min grid.
        candidate = next_valid_slot_ms(*iv_end);
    }

    candidate
}

/// Fetch every `(startTime, endTime)` pair stored in `game:schedule:info:{user_id}`.
async fn get_schedule_intervals(redis: &RedisPool, user_id: &str) -> Vec<(u64, u64)> {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let key = format!("game:schedule:info:{user_id}");

    let raw: HashMap<String, String> = redis::cmd("HGETALL")
        .arg(&key)
        .query_async(&mut *conn)
        .await
        .unwrap_or_default();

    raw.values()
        .filter_map(|json| {
            let v: serde_json::Value = serde_json::from_str(json).ok()?;
            let start = v["startTime"].as_u64()?;
            let end = v["endTime"].as_u64()?;
            Some((start, end))
        })
        .collect()
}

pub async fn add_to_schedule(
    redis: &RedisPool,
    user_id: &str,
    game_id: &str,
    start_ms: u64, // actual tournament start → shown to the user
    end_ms: u64,   // internal estimated end  → conflict detection only
) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return,
    };

    let info_key = format!("game:schedule:info:{user_id}");
    let info_json =
        format!(r#"{{"gameId":"{game_id}","startTime":{start_ms},"endTime":{end_ms}}}"#);

    let mut pipe = redis::pipe();
    pipe.atomic();
    pipe.hset(&info_key, game_id, &info_json);
    pipe.zadd("game:fallback:queue", game_id, end_ms);

    let _: () = pipe.query_async(&mut *conn).await.unwrap_or(());
}

/// Add a game to `user:active:games:{userId}`.
/// Score = actual `start_ms` so `ZREVRANGE 0 0` returns the most recent game.
pub async fn add_to_active_games(redis: &RedisPool, user_id: &str, game_id: &str, start_ms: u64) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return,
    };
    let key = format!("user:active:games:{user_id}");
    let _: () = conn
        .zadd(&key, game_id, start_ms as f64)
        .await
        .unwrap_or(());
}

// ── Redis cleanup (called by game_result on game completion)

/// Remove a completed game from both scheduling structures for one user.
///
/// Safe to call for both white and black player.  All ops are idempotent: Redis
/// returns 0 (not an error) when the member is already absent.
pub async fn remove_from_schedule(redis: &RedisPool, user_id: &str, game_id: &str) {
    let mut conn = match redis.get().await {
        Ok(c) => c,
        Err(_) => return,
    };

    let _: () = conn
        .hdel(format!("game:schedule:info:{user_id}"), game_id)
        .await
        .unwrap_or(());

    let active_removed: i64 = conn
        .zrem(format!("user:active:games:{user_id}"), game_id)
        .await
        .unwrap_or(0);
    if active_removed == 0 {
        eprintln!("[scheduling] game {game_id} already absent from user:active:games:{user_id}");
    }
}
