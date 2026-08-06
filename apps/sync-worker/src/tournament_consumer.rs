/// Tournament schedule consumer — two-phase atomic delivery with mpsc back-pressure.
///
/// Data flow:
///   CDC worker     →  tournament:schedule:pending  (ZSET, score = fire_time_ms)
///   [Lua scheduler]→  tournament:schedule:processing  (ZSET, score = visibility_timeout)
///                  →  tournament:schedule:stream        (Redis Stream)
///   [XREADGROUP]   →  mpsc channel  (bounded — provides back-pressure)
///   [Processor]    ←  tournament_schedule::spawn_processor
///                  →  Postgres JOIN, business logic, XACK + ZREM
///   [Watchdog]     →  scans tournament:schedule:processing for expired jobs → re-queues
///
/// Multi-worker safety:
///   Scheduler — only one worker holds lock:tournament:scheduler at a time (SET NX PX).
///               Lua script is also atomic so a concurrent tick from another worker
///               that races past the lock is still safe (ZREM returns 0).
///   Consumer  — XREADGROUP delivers each stream message to exactly one consumer;
///               each worker uses its own unique consumer name (worker_id).
///   Watchdog  — only one worker holds lock:tournament:watchdog at a time; ZREM
///               inside tick_watchdog is atomic so a concurrent watchdog tick is
///               also safe but wasteful without the lock.
use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;
use tokio::sync::mpsc;

use crate::handlers::tournament_schedule::{spawn_processor, TournamentTriggerJob};
use crate::stream_jobs::RedisPool;

type BoxError = Box<dyn std::error::Error + Send + Sync>;

use crate::tournament_keys::{
    JOB_PREFIX, PENDING_ZSET, PROCESSING_ZSET, SCHEDULE_STREAM, STREAM_GROUP,
};

// Distributed lock keys — prevent redundant work when multiple workers are running.
const SCHED_LOCK_KEY: &str = "lock:tournament:scheduler";
const WATCHDOG_LOCK_KEY: &str = "lock:tournament:watchdog";

const VISIBILITY_TIMEOUT_MS: u64 = 30_000; // 30 s visibility window
const SCHEDULER_INTERVAL_MS: u64 = 2_000; // poll pending every 2 s
                                          // Safety TTL: if the process crashes mid-tick the lock auto-expires.
                                          // Intentionally much longer than the tick duration so a live worker always
                                          // deletes it explicitly before the TTL fires.
const SCHED_LOCK_SAFETY_TTL_MS: u64 = 60_000;
const WATCHDOG_INTERVAL_SECS: u64 = 15; // check stalled every 15 s
const WATCHDOG_LOCK_TTL_MS: u64 = 20_000; // watchdog lock TTL
const MAX_BATCH: usize = 10;

// ── Lua: atomic pending → processing + stream ─────────────────────────────────
// KEYS[1] = pending ZSET     ARGV[1] = now_ms
// KEYS[2] = processing ZSET  ARGV[2] = visibility_timeout_ms
// KEYS[3] = stream name      ARGV[3] = max_batch
// Returns: count of jobs moved
const ATOMIC_HANDOVER_LUA: &str = r#"
local now     = tonumber(ARGV[1])
local timeout = tonumber(ARGV[2])
local batch   = tonumber(ARGV[3])
local due     = redis.call('ZRANGEBYSCORE', KEYS[1], 0, now, 'LIMIT', 0, batch)
local count   = 0
for _, jid in ipairs(due) do
    if redis.call('ZREM', KEYS[1], jid) == 1 then
        redis.call('ZADD', KEYS[2], now + timeout, jid)
        redis.call('XADD', KEYS[3], '*', 'jid', jid)
        count = count + 1
    end
end
return count
"#;

// ── Entry point ───────────────────────────────────────────────────────────────

pub async fn run(
    pool: RedisPool,
    db: Arc<PgPool>,
    rabbitmq: Arc<rabbitmq_rustclient::RabbitClient>,
    worker_id: String,
) {
    eprintln!("[tournament] consumer starting worker_id={worker_id}");

    if let Err(e) = init_stream_group(&pool).await {
        eprintln!("[tournament] stream group init failed: {e}");
    }

    let tx: mpsc::Sender<TournamentTriggerJob> = spawn_processor(db, pool.clone(), rabbitmq);

    let (pool_sched, pool_watch, pool_consume) = (pool.clone(), pool.clone(), pool.clone());
    let (wid_sched, wid_watch, wid_consume) =
        (worker_id.clone(), worker_id.clone(), worker_id.clone());
    let tx_drain = tx.clone();
    let tx_live = tx.clone();

    // Task A: Lua scheduler — distributed lock ensures only one worker fires per tick
    let t_sched = tokio::spawn(async move {
        run_scheduler(pool_sched, wid_sched).await;
    });

    // Task B: XREADGROUP reader — unique consumer name per worker
    let t_consume = tokio::spawn(async move {
        run_stream_consumer(pool_consume, wid_consume, tx_drain, tx_live).await;
    });

    // Task C: Watchdog — distributed lock ensures only one worker re-queues per tick
    let t_watch = tokio::spawn(async move {
        run_watchdog(pool_watch, wid_watch).await;
    });

    eprintln!("[tournament] scheduler + consumer + watchdog running");
    let _ = tokio::join!(t_sched, t_consume, t_watch);
}

// ── Stream group init ─────────────────────────────────────────────────────────

async fn init_stream_group(pool: &RedisPool) -> Result<(), BoxError> {
    let mut conn = pool.get().await?;
    let result: redis::RedisResult<()> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(SCHEDULE_STREAM)
        .arg(STREAM_GROUP)
        .arg("$")
        .arg("MKSTREAM")
        .query_async(&mut *conn)
        .await;
    match result {
        Ok(()) | Err(_) => {} // BUSYGROUP = already exists, safe to ignore
    }
    Ok(())
}

// ── Task A: Scheduler ─────────────────────────────────────────────────────────

async fn run_scheduler(pool: RedisPool, worker_id: String) {
    let script = redis::Script::new(ATOMIC_HANDOVER_LUA);
    loop {
        if let Err(e) = tick_scheduler(&pool, &script, &worker_id).await {
            eprintln!("[tournament/scheduler] {e}");
        }
        tokio::time::sleep(Duration::from_millis(SCHEDULER_INTERVAL_MS)).await;
    }
}

async fn tick_scheduler(
    pool: &RedisPool,
    script: &redis::Script,
    worker_id: &str,
) -> Result<(), BoxError> {
    let mut conn = pool.get().await?;

    // Acquire lock with a large safety TTL so another worker can take over if
    // this process crashes mid-tick. The lock is always deleted explicitly once
    // the tick completes, so the TTL is only a crash-recovery backstop.
    // This ensures the next tick (2 s later) can always re-acquire immediately.
    let acquired: Option<String> = redis::cmd("SET")
        .arg(SCHED_LOCK_KEY)
        .arg(worker_id)
        .arg("NX")
        .arg("PX")
        .arg(SCHED_LOCK_SAFETY_TTL_MS)
        .query_async(&mut *conn)
        .await?;
    if acquired.is_none() {
        return Ok(());
    }

    let now = now_ms();
    let moved: i64 = script
        .key(PENDING_ZSET)
        .key(PROCESSING_ZSET)
        .key(SCHEDULE_STREAM)
        .arg(now.to_string())
        .arg(VISIBILITY_TIMEOUT_MS.to_string())
        .arg(MAX_BATCH.to_string())
        .invoke_async(&mut *conn)
        .await?;

    // Release the lock immediately so the next tick (2 s away) can acquire it.
    let _: () = redis::cmd("DEL")
        .arg(SCHED_LOCK_KEY)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());

    if moved > 0 {
        println!("[tournament/scheduler] {moved} job(s) → stream");
    }
    Ok(())
}

// ── Task B: XREADGROUP reader ─────────────────────────────────────────────────

async fn run_stream_consumer(
    pool: RedisPool,
    worker_id: String,
    tx_drain: mpsc::Sender<TournamentTriggerJob>,
    tx_live: mpsc::Sender<TournamentTriggerJob>,
) {
    // Re-deliver un-ACKed messages left by this worker in a previous run.
    if let Err(e) = drain_pending(&pool, &worker_id, &tx_drain).await {
        eprintln!("[tournament/consumer] drain error: {e}");
    }

    loop {
        match read_live(&pool, &worker_id, &tx_live).await {
            Ok(()) => {}
            Err(e) => eprintln!("[tournament/consumer] read error: {e}"),
        }
        // No sleep needed: XREADGROUP BLOCK 2000 already yields
    }
}

async fn drain_pending(
    pool: &RedisPool,
    worker_id: &str,
    tx: &mpsc::Sender<TournamentTriggerJob>,
) -> Result<(), BoxError> {
    let mut conn = pool.get().await?;
    loop {
        let reply: redis::Value = redis::cmd("XREADGROUP")
            .arg("GROUP")
            .arg(STREAM_GROUP)
            .arg(worker_id)
            .arg("COUNT")
            .arg(MAX_BATCH)
            .arg("STREAMS")
            .arg(SCHEDULE_STREAM)
            .arg("0") // "0" = own PEL
            .query_async(&mut *conn)
            .await?;

        let entries = parse_stream_entries(reply);
        if entries.is_empty() {
            break;
        }

        for (msg_id, jid) in entries {
            fetch_and_enqueue(pool, msg_id, jid, tx).await;
        }
    }
    Ok(())
}

async fn read_live(
    pool: &RedisPool,
    worker_id: &str,
    tx: &mpsc::Sender<TournamentTriggerJob>,
) -> Result<(), BoxError> {
    let mut conn = pool.get().await?;
    let reply: redis::Value = redis::cmd("XREADGROUP")
        .arg("GROUP")
        .arg(STREAM_GROUP)
        .arg(worker_id)
        .arg("COUNT")
        .arg(MAX_BATCH)
        .arg("BLOCK")
        .arg(2_000u64)
        .arg("STREAMS")
        .arg(SCHEDULE_STREAM)
        .arg(">")
        .query_async(&mut *conn)
        .await?;

    let entries = parse_stream_entries(reply);
    for (msg_id, jid) in entries {
        fetch_and_enqueue(pool, msg_id, jid, tx).await;
    }
    Ok(())
}

async fn fetch_and_enqueue(
    pool: &RedisPool,
    msg_id: String,
    jid: String,
    tx: &mpsc::Sender<TournamentTriggerJob>,
) {
    let payload = match fetch_job_payload(pool, &jid).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("[tournament/consumer] bad payload jid={jid}: {e}");
            poison_ack(pool, &msg_id, &jid).await;
            return;
        }
    };

    let job = TournamentTriggerJob {
        msg_id,
        jid,
        tournament_id: payload.0,
        trigger: payload.1,
        attempts_made: payload.2,
    };

    if tx.send(job).await.is_err() {
        eprintln!("[tournament/consumer] processor channel closed — stopping enqueue");
    }
}

// ── Task C: Watchdog ──────────────────────────────────────────────────────────

async fn run_watchdog(pool: RedisPool, worker_id: String) {
    loop {
        tokio::time::sleep(Duration::from_secs(WATCHDOG_INTERVAL_SECS)).await;
        if let Err(e) = tick_watchdog(&pool, &worker_id).await {
            eprintln!("[tournament/watchdog] {e}");
        }
    }
}

async fn tick_watchdog(pool: &RedisPool, worker_id: &str) -> Result<(), BoxError> {
    let mut conn = pool.get().await?;

    // Only one worker scans processing ZSET per watchdog cycle.
    let acquired: Option<String> = redis::cmd("SET")
        .arg(WATCHDOG_LOCK_KEY)
        .arg(worker_id)
        .arg("NX")
        .arg("PX")
        .arg(WATCHDOG_LOCK_TTL_MS)
        .query_async(&mut *conn)
        .await?;
    if acquired.is_none() {
        return Ok(());
    }

    let now = now_ms();
    let stalled: Vec<String> = redis::cmd("ZRANGEBYSCORE")
        .arg(PROCESSING_ZSET)
        .arg(0u64)
        .arg(now)
        .arg("LIMIT")
        .arg(0i64)
        .arg(MAX_BATCH as i64)
        .query_async(&mut *conn)
        .await?;

    if stalled.is_empty() {
        return Ok(());
    }

    let mut recovered = 0usize;
    for jid in &stalled {
        let removed: i64 = redis::cmd("ZREM")
            .arg(PROCESSING_ZSET)
            .arg(jid)
            .query_async(&mut *conn)
            .await?;
        if removed == 0 {
            continue;
        }

        let _: () = redis::cmd("ZADD")
            .arg(PENDING_ZSET)
            .arg(now as f64)
            .arg(jid)
            .query_async(&mut *conn)
            .await
            .unwrap_or(());

        eprintln!("[tournament/watchdog] re-queued stalled job '{jid}'");
        recovered += 1;
    }

    if recovered > 0 {
        println!(
            "[tournament/watchdog] recovered {recovered}/{} stalled job(s)",
            stalled.len()
        );
    }
    Ok(())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Fetch `(tournament_id, trigger, attempts_made)` from the job hash.
async fn fetch_job_payload(pool: &RedisPool, jid: &str) -> Result<(String, String, u32), BoxError> {
    let mut conn = pool.get().await?;
    let key = format!("{JOB_PREFIX}:{jid}");

    let data_str: Option<String> = redis::cmd("HGET")
        .arg(&key)
        .arg("data")
        .query_async(&mut *conn)
        .await?;

    let data_str = data_str.ok_or("job has no data field")?;
    let v: serde_json::Value = serde_json::from_str(&data_str)?;

    let tournament_id = v["tournamentId"]
        .as_str()
        .ok_or("missing tournamentId")?
        .to_string();
    let trigger = v["trigger"].as_str().ok_or("missing trigger")?.to_string();

    let attempts: u32 = redis::cmd("HGET")
        .arg(&key)
        .arg("attemptsMade")
        .query_async::<Option<String>>(&mut *conn)
        .await
        .ok()
        .flatten()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    Ok((tournament_id, trigger, attempts))
}

async fn poison_ack(pool: &RedisPool, msg_id: &str, jid: &str) {
    let mut conn = match pool.get().await {
        Ok(c) => c,
        Err(_) => return,
    };
    let _: () = redis::cmd("XACK")
        .arg(SCHEDULE_STREAM)
        .arg(STREAM_GROUP)
        .arg(msg_id)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
    let _: () = redis::cmd("ZREM")
        .arg(PROCESSING_ZSET)
        .arg(jid)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

fn parse_stream_entries(reply: redis::Value) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let streams = match reply {
        redis::Value::Array(v) => v,
        _ => return out,
    };
    for entry in streams {
        let parts = match entry {
            redis::Value::Array(v) => v,
            _ => continue,
        };
        if parts.len() < 2 {
            continue;
        }
        let messages = match &parts[1] {
            redis::Value::Array(v) => v,
            _ => continue,
        };
        for msg in messages {
            let mp = match msg {
                redis::Value::Array(v) => v,
                _ => continue,
            };
            if mp.len() < 2 {
                continue;
            }
            let msg_id = bstr(&mp[0]);
            let fields = match &mp[1] {
                redis::Value::Array(v) => v,
                _ => continue,
            };
            let mut jid = String::new();
            let mut i = 0;
            while i + 1 < fields.len() {
                if bstr(&fields[i]) == "jid" {
                    jid = bstr(&fields[i + 1]);
                }
                i += 2;
            }
            if !msg_id.is_empty() && !jid.is_empty() {
                out.push((msg_id, jid));
            }
        }
    }
    out
}

fn bstr(v: &redis::Value) -> String {
    match v {
        redis::Value::BulkString(b) => String::from_utf8_lossy(b).into_owned(),
        redis::Value::SimpleString(s) => s.clone(),
        _ => String::new(),
    }
}

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
