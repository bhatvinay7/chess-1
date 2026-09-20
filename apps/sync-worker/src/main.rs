use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use tokio::time::sleep;
use uuid::Uuid;

use bb8_redis::{bb8, RedisConnectionManager};

use sync_worker::handlers::game_result::handle_game_result;
use sync_worker::handlers::matchmaking::handle_matchmaking;
use sync_worker::inistialize_stream::initialize_stream_infrastructure;
use sync_worker::manual_trigger_pubsub::run_manual_trigger_listener;
use sync_worker::recovery::recover_stream;
use sync_worker::stream_jobs::{consume_stream_jobs, RedisPool};
use sync_worker::types::{GameResultEntry, MatchData};

// ── Stream / group / DLQ constants ──────────────────────────────────────────
const MATCHMAKING_STREAM: &str = "matchmaking:queue";
const MATCHMAKING_GROUP: &str = "worker_group";
const MATCHMAKING_DLQ: &str = "dlq:matchmaking";
const MATCHMAKING_LOCK: &str = "lock:recovery:matchmaking";

const GAME_RESULT_STREAM: &str = "match:process:results";
const GAME_RESULT_GROUP: &str = "result_group";
const GAME_RESULT_DLQ: &str = "dlq:game_result";
const GAME_RESULT_LOCK: &str = "lock:recovery:game_result";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    chess_telemetry::init_telemetry("chess-sync-worker");
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();

    // ── 1. BB8 Redis pool ────────────────────────────────────────────────────
    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

    let manager: RedisConnectionManager = RedisConnectionManager::new(redis_url.clone())?;
    let redis_pool: RedisPool = bb8::Pool::builder().max_size(5).build(manager).await?;

    // ── 2. SQLx Postgres pool ────────────────────────────────────────────────
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let db = Arc::new(
        PgPoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await?,
    );

    println!("[sync-worker] Connected to Postgres and Redis.");

    // Initialize modular Grafana/Prometheus metrics package
    metrics_rustclient::system::start_system_metrics_collector(5);
    let metrics = Arc::new(metrics_rustclient::MetricsCollector::new("sync-worker"));
    let metrics_port: u16 = std::env::var("METRICS_PORT")
        .unwrap_or_else(|_| "9101".to_string())
        .parse()
        .unwrap_or(9101);
    metrics_rustclient::server::start_metrics_server(metrics.clone(), metrics_port);

    // ── 3. Initialize consumer groups ────────────────────────────────────────
    initialize_stream_infrastructure(
        &redis_pool,
        &[
            (MATCHMAKING_STREAM, MATCHMAKING_GROUP),
            (GAME_RESULT_STREAM, GAME_RESULT_GROUP),
        ],
    )
    .await?;

    // ── RabbitMQ Client ──────────────────────────────────────────────────────
    let rabbitmq_url =
        std::env::var("RABBITMQ_URL").unwrap_or_else(|_| "amqp://127.0.0.1:5672/%2f".to_string());
    let rabbitmq = Arc::new(
        rabbitmq_rustclient::RabbitClient::new(&rabbitmq_url)
            .await
            .expect("Failed to connect to RabbitMQ"),
    );
    println!("[sync-worker] Connected to RabbitMQ.");

    // ── 4. Unique worker ID ───────────────────────────────────────────────────
    let worker_id = format!("worker-{}", Uuid::new_v4());
    println!("[sync-worker] Worker ID: {worker_id}");

    // ── Task 1: Matchmaking consumer ─────────────────────────────────────────
    let (pool1, db1, wid1) = (redis_pool.clone(), db.clone(), worker_id.clone());
    let t_matchmaking = tokio::spawn(async move {
        loop {
            if let Err(e) = consume_stream_jobs::<MatchData, _, _>(
                &pool1,
                db1.clone(),
                &wid1,
                MATCHMAKING_GROUP,
                MATCHMAKING_STREAM,
                MATCHMAKING_DLQ,
                handle_matchmaking,
            )
            .await
            {
                eprintln!("[matchmaking] consumer error: {e}");
            }
            sleep(Duration::from_millis(10)).await;
        }
    });

    // ── Task 2: Game-result consumer ─────────────────────────────────────────
    let (pool2, db2, wid2) = (redis_pool.clone(), db.clone(), worker_id.clone());
    let t_game_result = tokio::spawn(async move {
        loop {
            if let Err(e) = consume_stream_jobs::<GameResultEntry, _, _>(
                &pool2,
                db2.clone(),
                &wid2,
                GAME_RESULT_GROUP,
                GAME_RESULT_STREAM,
                GAME_RESULT_DLQ,
                handle_game_result,
            )
            .await
            {
                eprintln!("[game_result] consumer error: {e}");
            }
            sleep(Duration::from_millis(10)).await;
        }
    });

    // ── Task 3: Matchmaking PEL recovery ─────────────────────────────────────
    let (pool3, wid3) = (redis_pool.clone(), worker_id.clone());
    let t_mm_recovery = tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(10)).await;
            match recover_stream(
                &pool3,
                &wid3,
                MATCHMAKING_LOCK,
                MATCHMAKING_STREAM,
                MATCHMAKING_GROUP,
                MATCHMAKING_DLQ,
            )
            .await
            {
                Ok((1, claimed, dlq)) if claimed > 0 || dlq > 0 => {
                    println!("[matchmaking recovery] claimed={claimed} dlq={dlq}")
                }
                Err(e) => eprintln!("[matchmaking recovery] error: {e}"),
                _ => {}
            }
        }
    });

    // ── Task 4: Game-result PEL recovery ─────────────────────────────────────
    let (pool4, wid4) = (redis_pool.clone(), worker_id.clone());
    let t_gr_recovery = tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(10)).await;
            match recover_stream(
                &pool4,
                &wid4,
                GAME_RESULT_LOCK,
                GAME_RESULT_STREAM,
                GAME_RESULT_GROUP,
                GAME_RESULT_DLQ,
            )
            .await
            {
                Ok((1, claimed, dlq)) if claimed > 0 || dlq > 0 => {
                    println!("[game_result recovery] claimed={claimed} dlq={dlq}")
                }
                Err(e) => eprintln!("[game_result recovery] error: {e}"),
                _ => {}
            }
        }
    });

    // ── Task 5: Tournament consumer ───────────────────────────────────────────
    let wid5 = worker_id.clone();
    let db5 = db.clone();
    let pool5 = redis_pool.clone();
    let rabbitmq_t = rabbitmq.clone();
    let t_tournament = tokio::spawn(async move {
        sync_worker::tournament_consumer::run(pool5, db5, rabbitmq_t, wid5).await;
    });

    // ── Task 6: Manual Trigger Pub/Sub Listener ───────────────────────────────
    let redis_url_clone = redis_url.clone();
    let pool6 = redis_pool.clone();
    let db6 = db.clone();
    let rabbitmq_pubsub = rabbitmq.clone();
    let t_pubsub = tokio::spawn(async move {
        run_manual_trigger_listener(redis_url_clone, pool6, db6, rabbitmq_pubsub).await;
    });

    // ── Task 7: Fallback Queue Processor ─────────────────────────────────────
    let pool7 = redis_pool.clone();
    let t_fallback = tokio::spawn(async move {
        sync_worker::handlers::fallback_queue::run_fallback_worker(pool7).await;
    });

    println!("[sync-worker] All tasks running.");
    let _ = tokio::join!(
        t_matchmaking,
        t_game_result,
        t_mm_recovery,
        t_gr_recovery,
        t_tournament,
        t_pubsub,
        t_fallback
    );

    Ok(())
}
