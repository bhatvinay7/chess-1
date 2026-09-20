use crate::models::pg_timestamp_to_unix;
use pgwire_replication::Lsn;
use redis_rustclient::{RedisClient, redis};
use std::collections::HashMap;

// ── Key constants — must match the sync-worker consumer ──────────────────────
const SCHEDULE_PENDING: &str = "tournament:schedule:pending";
const JOB_PREFIX: &str = "tournament:job";
const TIMING_INDEX: &str = "cdc:timing-index";

// Tracks WAL LSN for every job the CDC has written but the sync-worker has
// not yet consumed.  Field = jid, value = LSN string.
// Sync-worker must HDEL its jid from this hash after processing the job.
pub const PENDING_LSNS: &str = "cdc:pending_lsns";

const TRIGGER_INIT: &str = "init";
const INIT_OFFSET_MS: i64 = -15 * 60 * 1_000; // fire 20 min before startTime

const ALL_TRIGGER_NAMES: &[&str] = &["init"];

type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub fn job_id(tournament_id: &str, trigger: &str) -> String {
    format!("t:{tournament_id}:{trigger}")
}

fn job_key(jid: &str) -> String {
    format!("{JOB_PREFIX}:{jid}")
}

// ── INSERT ────────────────────────────────────────────────────────────────────

#[tracing::instrument(skip_all, fields(otel.kind = "producer"), err)]
pub async fn schedule_tournament(
    redis: &mut RedisClient,
    timing_id: &str,
    tournament_id: &str,
    start_time: &str,
    lsn: &str,
) -> Result<()> {
    let start_ms = match pg_timestamp_to_unix(start_time) {
        Some(s) => s * 1_000,
        None => {
            eprintln!("[CDC] cannot parse startTime '{start_time}', skipping schedule");
            return Ok(());
        }
    };

    let now = now_ms();
    let run_at = start_ms + INIT_OFFSET_MS;

    if run_at <= now {
        let overdue_min = (now - run_at) / (60 * 1_000);
        eprintln!(
            "[CDC] init trigger already past for tournamentId={tournament_id} \
             (startTime='{start_time}', overdue by ~{overdue_min}min) — \
             skipping ZSET write; tournament may have already started or is too close"
        );
        return Ok(());
    }

    redis::cmd("HSET")
        .arg(TIMING_INDEX)
        .arg(timing_id)
        .arg(tournament_id)
        .query_async::<()>(redis.conn())
        .await?;

    let jid = job_id(tournament_id, TRIGGER_INIT);
    let jkey = job_key(&jid);

    let data_json = serde_json::json!({
        "tournamentId": tournament_id,
        "trigger":      TRIGGER_INIT,
        "_trace_context": chess_telemetry::current_carrier(),
        "startTime":    start_time,
    })
    .to_string();

    redis::cmd("HSET")
        .arg(&jkey)
        .arg("data")
        .arg(&data_json)
        .arg("attemptsMade")
        .arg("0")
        .query_async::<()>(redis.conn())
        .await?;

    redis::cmd("ZADD")
        .arg(SCHEDULE_PENDING)
        .arg("NX")
        .arg(run_at as f64)
        .arg(&jid)
        .query_async::<()>(redis.conn())
        .await?;

    // Record the WAL LSN so CDC restart knows the earliest unprocessed event.
    // Sync-worker removes this entry (HDEL cdc:pending_lsns <jid>) after firing.
    // Re-delivery is safe: sync-worker checks DB before creating a round.
    redis::cmd("HSET")
        .arg(PENDING_LSNS)
        .arg(&jid)
        .arg(lsn)
        .query_async::<()>(redis.conn())
        .await?;

    let fire_in_min = (run_at - now) / (60 * 1_000);
    eprintln!("[CDC] scheduled '{jid}' fires in ~{fire_in_min}min (lsn={lsn})");
    Ok(())
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

#[tracing::instrument(skip_all, fields(otel.kind = "producer"), err)]
pub async fn reschedule_tournament(
    redis: &mut RedisClient,
    tournament_id: &str,
    new_start_time: &str,
    lsn: &str,
) -> Result<()> {
    let start_ms = match pg_timestamp_to_unix(new_start_time) {
        Some(s) => s * 1_000,
        None => {
            eprintln!("[CDC] reschedule: cannot parse startTime '{new_start_time}'");
            return Ok(());
        }
    };
    let now = now_ms();

    // Remove old pending LSN entries and job data for all triggers.
    for name in ALL_TRIGGER_NAMES {
        let jid = job_id(tournament_id, name);
        let jkey = job_key(&jid);
        redis::cmd("ZREM")
            .arg(SCHEDULE_PENDING)
            .arg(&jid)
            .query_async::<()>(redis.conn())
            .await?;
        redis::cmd("DEL")
            .arg(&jkey)
            .query_async::<()>(redis.conn())
            .await?;
        redis::cmd("HDEL")
            .arg(PENDING_LSNS)
            .arg(&jid)
            .query_async::<()>(redis.conn())
            .await?;
    }

    let run_at = start_ms + INIT_OFFSET_MS;
    if run_at <= now {
        eprintln!(
            "[CDC] reschedule: new trigger already past for tournamentId={tournament_id}, skipping"
        );
        return Ok(());
    }

    let jid = job_id(tournament_id, TRIGGER_INIT);
    let jkey = job_key(&jid);

    let data_json = serde_json::json!({
        "tournamentId": tournament_id,
        "trigger":      TRIGGER_INIT,
        "_trace_context": chess_telemetry::current_carrier(),
        "startTime":    new_start_time,
    })
    .to_string();

    redis::cmd("HSET")
        .arg(&jkey)
        .arg("data")
        .arg(&data_json)
        .arg("attemptsMade")
        .arg("0")
        .query_async::<()>(redis.conn())
        .await?;

    redis::cmd("ZADD")
        .arg(SCHEDULE_PENDING)
        .arg(run_at as f64)
        .arg(&jid)
        .query_async::<()>(redis.conn())
        .await?;

    redis::cmd("HSET")
        .arg(PENDING_LSNS)
        .arg(&jid)
        .arg(lsn)
        .query_async::<()>(redis.conn())
        .await?;

    eprintln!("[CDC] rescheduled '{jid}' to {run_at}ms (lsn={lsn})");
    Ok(())
}

// ── DELETE ────────────────────────────────────────────────────────────────────

#[tracing::instrument(skip_all, fields(otel.kind = "producer"), err)]
pub async fn cancel_tournament(redis: &mut RedisClient, timing_id: &str) -> Result<()> {
    let tournament_id: Option<String> = redis::cmd("HGET")
        .arg(TIMING_INDEX)
        .arg(timing_id)
        .query_async(redis.conn())
        .await?;

    let tournament_id = match tournament_id {
        Some(id) => id,
        None => {
            eprintln!("[CDC] cancel: no index entry for timing_id={timing_id}, skipping");
            return Ok(());
        }
    };

    for trigger in ALL_TRIGGER_NAMES {
        let jid = job_id(&tournament_id, trigger);
        let jkey = job_key(&jid);
        redis::cmd("ZREM")
            .arg(SCHEDULE_PENDING)
            .arg(&jid)
            .query_async::<()>(redis.conn())
            .await?;
        redis::cmd("DEL")
            .arg(&jkey)
            .query_async::<()>(redis.conn())
            .await?;
        // Job is cancelled — no longer needs a pending LSN entry.
        redis::cmd("HDEL")
            .arg(PENDING_LSNS)
            .arg(&jid)
            .query_async::<()>(redis.conn())
            .await?;
    }

    redis::cmd("HDEL")
        .arg(TIMING_INDEX)
        .arg(timing_id)
        .query_async::<()>(redis.conn())
        .await?;

    eprintln!("[CDC] cancelled jobs for tournamentId={tournament_id}");
    Ok(())
}

// ── Initial snapshot ─────────────────────────────────────────────────────────
//
// Called once at startup to seed Redis from rows that already existed in
// TournamentTimeManagement when the replication slot was created.  The WAL
// stream only captures *future* changes, so without this any row inserted
// before the slot was first used would never reach the ZSET.
//
// The snapshot is idempotent: ZADD NX means we never overwrite a job that
// was already scheduled from a prior run or from the live WAL stream.

#[tracing::instrument(skip_all, fields(otel.kind = "producer"), err)]
pub async fn init_snapshot<C>(
    redis: &mut RedisClient,
    client: &C,
) -> std::result::Result<usize, Box<dyn std::error::Error + Send + Sync>>
where
    C: tokio_postgres::GenericClient,
{
    let rows = client
        .query(
            r#"SELECT id, "tournamentId", "startTime"::text, "registrationCloseAt"::text
               FROM "TournamentTimeManagement""#,
            &[],
        )
        .await?;

    let now = now_ms();
    let mut seeded = 0usize;

    for row in &rows {
        let timing_id: String = row.get(0);
        let tournament_id: String = row.get(1);
        let start_time: String = row.get(2);

        // Index: timing_id → tournament_id (needed for DELETE events).
        redis::cmd("HSET")
            .arg(TIMING_INDEX)
            .arg(&timing_id)
            .arg(&tournament_id)
            .query_async::<()>(redis.conn())
            .await?;

        let start_ms = match crate::models::pg_timestamp_to_unix(&start_time) {
            Some(s) => s * 1_000,
            None => {
                eprintln!(
                    "[CDC] snapshot: cannot parse startTime '{start_time}' for tournamentId={tournament_id}"
                );
                continue;
            }
        };
        let run_at = start_ms + INIT_OFFSET_MS;
        if run_at <= now {
            let overdue_min = (now - run_at) / (60 * 1_000);
            eprintln!(
                "[CDC] snapshot: init trigger past for tournamentId={tournament_id} \
                 (overdue ~{overdue_min}min) — skipping"
            );
            continue;
        }

        let jid = job_id(&tournament_id, TRIGGER_INIT);
        let jkey = job_key(&jid);

        let data_json = serde_json::json!({
            "tournamentId": tournament_id,
            "trigger":      TRIGGER_INIT,
        "_trace_context": chess_telemetry::current_carrier(),
            "startTime":    start_time,
        })
        .to_string();

        redis::cmd("HSET")
            .arg(&jkey)
            .arg("data")
            .arg(&data_json)
            .arg("attemptsMade")
            .arg("0")
            .query_async::<()>(redis.conn())
            .await?;

        // NX: don't overwrite if a live WAL event already scheduled this job.
        let added: i64 = redis::cmd("ZADD")
            .arg(SCHEDULE_PENDING)
            .arg("NX")
            .arg(run_at as f64)
            .arg(&jid)
            .query_async(redis.conn())
            .await?;

        if added > 0 {
            let fire_in_min = (run_at - now) / (60 * 1_000);
            eprintln!("[CDC] snapshot: seeded '{jid}' fires in ~{fire_in_min}min");
            seeded += 1;
        }
    }

    eprintln!(
        "[CDC] snapshot: scanned {} rows, seeded {} new jobs",
        rows.len(),
        seeded
    );
    Ok(seeded)
}

// ── Startup: find earliest unprocessed LSN ────────────────────────────────────
//
// On restart, replay WAL from the minimum LSN still in cdc:pending_lsns.
// These are jobs the CDC wrote to the ZSET but the sync-worker has not yet
// consumed (it removes its jid entry when done).  Starting here ensures every
// pending job is re-delivered.  Re-delivery is safe: the sync-worker checks
// the DB before creating a round, so duplicate messages are no-ops.

pub async fn get_earliest_pending_lsn(redis: &mut RedisClient) -> Option<Lsn> {
    let map: HashMap<String, String> = redis::cmd("HGETALL")
        .arg(PENDING_LSNS)
        .query_async(redis.conn())
        .await
        .ok()?;

    if map.is_empty() {
        return None;
    }

    map.values().filter_map(|s| Lsn::parse(s).ok()).min()
}
