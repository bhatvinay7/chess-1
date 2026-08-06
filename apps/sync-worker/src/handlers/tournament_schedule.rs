use sqlx::PgPool;
/// Tournament schedule handler with mpsc back-pressure buffer.
///
/// Responsibilities:
///   - Define `TournamentTriggerJob` (the unit of work shared with the consumer)
///   - Spawn the processor task via `spawn_processor(db, pool) -> Sender`
///   - Fetch tournament + timing data from Postgres on each trigger
///   - ACK / retry / drop jobs via Redis after processing
///
/// The mpsc channel between consumer (sender) and processor (receiver) provides
/// automatic back-pressure: when CHANNEL_CAPACITY items are queued and the
/// processor hasn't caught up, `.send().await` on the consumer side blocks —
/// naturally throttling XREADGROUP reads without any explicit rate-limiting code.
/// This also future-proofs the slot for pairing/matching work that will be heavier.
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::handlers::tournament_init;
use crate::stream_jobs::RedisPool;

type BoxError = Box<dyn std::error::Error + Send + Sync>;

use crate::tournament_keys::{
    CDC_PENDING_LSNS, JOB_PREFIX, PENDING_ZSET, PROCESSING_ZSET, SCHEDULE_STREAM, STREAM_GROUP,
};

// ── Channel config ────────────────────────────────────────────────────────────

/// Bounded channel depth.  When full, the XREADGROUP reader blocks here,
/// providing automatic back-pressure.  Increase if bursts exceed 256 events/poll.
pub const CHANNEL_CAPACITY: usize = 256;

const MAX_ATTEMPTS: u32 = 3;

// ── Job type ──────────────────────────────────────────────────────────────────

/// A trigger event sent from the stream consumer into the mpsc processor channel.
#[derive(Debug)]
pub struct TournamentTriggerJob {
    pub msg_id: String, // Redis stream message ID — needed for XACK
    pub jid: String,    // job ID (t:{tournamentId}:{trigger}) — needed for ZREM + hash
    pub tournament_id: String,
    pub trigger: String,
    pub attempts_made: u32,
}

// ── DB row ────────────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
#[allow(dead_code)]
struct ScheduleRow {
    id: String,
    name: String,
    status: String,
    start_time: chrono::NaiveDateTime,
    registration_open_at: chrono::NaiveDateTime,
    registration_close_at: chrono::NaiveDateTime,
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Spawn the processor task and return the sender half of the mpsc channel.
///
/// Call once from `tournament_consumer::run`.  The returned `Sender` is cloned
/// and passed into the drain-pending and read-and-process loops.  Dropping all
/// senders shuts the processor down cleanly.
pub fn spawn_processor(
    db: Arc<PgPool>,
    pool: RedisPool,
    rabbitmq: Arc<rabbitmq_rustclient::RabbitClient>,
) -> mpsc::Sender<TournamentTriggerJob> {
    let (tx, rx) = mpsc::channel(CHANNEL_CAPACITY);
    tokio::spawn(processor_loop(rx, db, pool, rabbitmq));
    tx
}

// ── Processor loop ────────────────────────────────────────────────────────────

async fn processor_loop(
    mut rx: mpsc::Receiver<TournamentTriggerJob>,
    db: Arc<PgPool>,
    pool: RedisPool,
    rabbitmq: Arc<rabbitmq_rustclient::RabbitClient>,
) {
    eprintln!("[tournament/processor] started (channel capacity={CHANNEL_CAPACITY})");
    while let Some(job) = rx.recv().await {
        process_one(&db, &pool, &rabbitmq, job).await;
    }
    eprintln!("[tournament/processor] channel closed, exiting");
}

async fn process_one(
    db: &Arc<PgPool>,
    pool: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    job: TournamentTriggerJob,
) {
    match run_trigger(db, pool, rabbitmq, &job.tournament_id, &job.trigger).await {
        Ok(()) => {
            println!(
                "[tournament/processor] ok  jid={} trigger={}",
                job.jid, job.trigger
            );
            ack_success(pool, &job.msg_id, &job.jid).await;
        }
        Err(e) => {
            let new_attempts = job.attempts_made + 1;
            eprintln!(
                "[tournament/processor] jid={} attempt {new_attempts} failed: {e}",
                job.jid
            );
            bump_attempts(pool, &job.jid, new_attempts).await;

            if new_attempts >= MAX_ATTEMPTS {
                eprintln!(
                    "[tournament/processor] jid={} exhausted {MAX_ATTEMPTS} attempts — dropping to DLQ",
                    job.jid
                );
                // Publish to DLQ
                let dlq_event = rabbitmq_rustclient::types::TournamentMatchingDlqEvent {
                    tournament_id: job.tournament_id.clone(),
                    trigger: job.trigger.clone(),
                    attempts: new_attempts,
                    error_message: e.to_string(),
                };
                if let Err(dlq_err) = rabbitmq.publish_dlq(&dlq_event).await {
                    eprintln!("[tournament/processor] Failed to publish to DLQ: {dlq_err}");
                }

                ack_success(pool, &job.msg_id, &job.jid).await; // poison-ACK: discard from stream
            } else {
                // Exponential back-off: 5 s → 25 s
                let delay_ms = 5_000u64 * 5u64.pow(new_attempts - 1);
                ack_retry(pool, &job.msg_id, &job.jid, delay_ms).await;
                eprintln!(
                    "[tournament/processor] jid={} retry #{new_attempts} in {delay_ms}ms",
                    job.jid
                );
            }
        }
    }
}

// ── Business logic
async fn run_trigger(
    db: &Arc<PgPool>,
    pool: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    tournament_id: &str,
    trigger: &str,
) -> Result<(), BoxError> {
    let row: Option<ScheduleRow> = sqlx::query_as(
        r#"
        SELECT
            t.id,
            t.name,
            t.status::TEXT AS status,
            tm."startTime"            AS start_time,
            tm."registrationOpenAt"   AS registration_open_at,
            tm."registrationCloseAt"  AS registration_close_at
        FROM "Tournament" t
        JOIN "TournamentTimeManagement" tm ON tm."tournamentId" = t.id
        WHERE t.id = $1
        "#,
    )
    .bind(tournament_id)
    .fetch_optional(&**db)
    .await?;

    let row = match row {
        Some(r) => r,
        None => {
            eprintln!(
                "[tournament] id={tournament_id} not found (deleted?), skipping trigger='{trigger}'"
            );
            return Ok(());
        }
    };

    let now = chrono::Utc::now();

    match trigger {
        "init" => {
            println!(
                "[tournament] init trigger id={} name='{}' status={} startTime={} now={}",
                row.id, row.name, row.status, row.start_time, now
            );

            match row.status.as_str() {
                "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "NOT_INITIALIZED" => {
                    // First run: transition to NOT_INITIALIZED then build round 1.
                    sqlx::query(
                        r#"UPDATE "Tournament"
                           SET status = 'NOT_INITIALIZED'::"TournamentStatus", "updatedAt" = NOW()
                           WHERE id = $1
                             AND status IN ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED')"#,
                    )
                    .bind(tournament_id)
                    .execute(&**db)
                    .await?;
                    println!("[tournament] status → NOT_INITIALIZED for id={tournament_id}");

                    let db2 = db.clone();
                    let pool2 = pool.clone();
                    let rabbitmq2 = rabbitmq.clone();
                    let tid = tournament_id.to_string();
                    tokio::spawn(async move {
                        if let Err(e) =
                            tournament_init::run_tournament_init(&db2, &pool2, &rabbitmq2, &tid)
                                .await
                        {
                            eprintln!("[tournament_init] id={tid} failed: {e}");
                        } else {
                            println!("[tournament_init] id={tid} completed successfully");
                        }
                    });
                }

                "IN_PROGRESS" => {
                    // Tournament already started (re-delivery or late trigger).
                    // Check the current round's DB status to decide what to do.
                    match get_latest_round_status(db, tournament_id).await? {
                        Some(ref s) if s == "IN_PROGRESS" => {
                            // A round with groups is still running — nothing to do.
                            println!(
                                "[tournament] init re-delivery: round IN_PROGRESS for id={tournament_id} — skipping"
                            );
                        }
                        Some(ref s) if s == "COMPLETED" => {
                            // Current round finished; advance to the next round + group.
                            println!(
                                "[tournament] init re-delivery: round COMPLETED for id={tournament_id} — advancing"
                            );
                            let db2 = db.clone();
                            let pool2 = pool.clone();
                            let rabbitmq2 = rabbitmq.clone();
                            let tid = tournament_id.to_string();
                            tokio::spawn(async move {
                                if let Err(e) =
                                    tournament_init::run_next_round(&db2, &pool2, &rabbitmq2, &tid)
                                        .await
                                {
                                    eprintln!("[tournament_init] next_round id={tid} failed: {e}");
                                } else {
                                    println!("[tournament_init] next_round id={tid} completed");
                                }
                            });
                        }
                        other => {
                            println!(
                                "[tournament] init re-delivery: id={tournament_id} round status={other:?} — skipping"
                            );
                        }
                    }
                }

                _ => {
                    println!(
                        "[tournament] init trigger skipped — id={} status={}",
                        row.id, row.status
                    );
                }
            }
        }

        "next_round" => {
            println!(
                "[tournament] next_round trigger id={} name='{}' status={}",
                row.id, row.name, row.status
            );
            if row.status == "IN_PROGRESS" {
                let db2 = db.clone();
                let pool2 = pool.clone();
                let rabbitmq2 = rabbitmq.clone();
                let tid = tournament_id.to_string();
                tokio::spawn(async move {
                    if let Err(e) =
                        tournament_init::run_next_round(&db2, &pool2, &rabbitmq2, &tid).await
                    {
                        eprintln!("[tournament_init] next_round id={tid} failed: {e}");
                    } else {
                        println!("[tournament_init] next_round id={tid} completed");
                    }
                });
            } else {
                println!(
                    "[tournament] next_round skipped — id={} status={} (not IN_PROGRESS)",
                    row.id, row.status
                );
            }
        }

        other => {
            eprintln!("[tournament] unknown trigger '{other}' for id={tournament_id}, skipping");
        }
    }

    Ok(())
}

/// Returns the status of the most recent round for this tournament, or None if no rounds exist.
async fn get_latest_round_status(
    db: &Arc<PgPool>,
    tournament_id: &str,
) -> Result<Option<String>, BoxError> {
    let status: Option<String> = sqlx::query_scalar(
        r#"SELECT status::text FROM "Round"
           WHERE "tournamentId" = $1
           ORDER BY "roundNumber" DESC LIMIT 1"#,
    )
    .bind(tournament_id)
    .fetch_optional(&**db)
    .await?;
    Ok(status)
}

// ── Redis ACK helpers

/// XACK the stream message and remove the job from the processing ZSET + job hash.
/// Also clears the CDC pending-LSN marker so the CDC worker knows this job is done
/// and won't re-deliver it on restart.
async fn ack_success(pool: &RedisPool, msg_id: &str, jid: &str) {
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
    let _: () = redis::cmd("DEL")
        .arg(format!("{JOB_PREFIX}:{jid}"))
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
    let _: () = redis::cmd("HDEL")
        .arg(CDC_PENDING_LSNS)
        .arg(jid)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

/// Increment the attempt counter stored in the job hash.
async fn bump_attempts(pool: &RedisPool, jid: &str, new_attempts: u32) {
    let mut conn = match pool.get().await {
        Ok(c) => c,
        Err(_) => return,
    };
    let _: () = redis::cmd("HSET")
        .arg(format!("{JOB_PREFIX}:{jid}"))
        .arg("attemptsMade")
        .arg(new_attempts.to_string())
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

/// XACK + ZREM the current delivery, then re-schedule via the pending ZSET
/// after `delay_ms` so the Lua scheduler picks it up again.
async fn ack_retry(pool: &RedisPool, msg_id: &str, jid: &str, delay_ms: u64) {
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
    let retry_at = now_ms() + delay_ms;
    let _: () = redis::cmd("ZADD")
        .arg(PENDING_ZSET)
        .arg(retry_at as f64)
        .arg(jid)
        .query_async(&mut *conn)
        .await
        .unwrap_or(());
}

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
