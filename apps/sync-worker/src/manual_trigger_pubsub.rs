use sqlx::PgPool;
use std::sync::Arc;
use tokio_stream::StreamExt;

use crate::handlers::tournament_init;
use crate::stream_jobs::RedisPool;

const MANUAL_TRIGGER_CHANNEL: &str = "channel:tournament:manual_trigger";
const TRIGGER_LOCK_PREFIX: &str = "lock:tournament:trigger:";

pub async fn run_manual_trigger_listener(
    redis_url: String,
    pool: RedisPool,
    db: Arc<PgPool>,
    rabbitmq: Arc<rabbitmq_rustclient::RabbitClient>,
) {
    eprintln!("[sync-worker] Manual trigger Pub/Sub listener starting...");

    let client = match redis::Client::open(redis_url.clone()) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[sync-worker] Failed to create redis client for manual trigger: {e}");
            return;
        }
    };

    let mut con = match client.get_async_pubsub().await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[sync-worker] Failed to get async pubsub connection: {e}");
            return;
        }
    };

    if let Err(e) = con.subscribe(MANUAL_TRIGGER_CHANNEL).await {
        eprintln!("[sync-worker] Failed to subscribe to manual trigger channel: {e}");
        return;
    }

    eprintln!("[sync-worker] Subscribed to {MANUAL_TRIGGER_CHANNEL}");

    let mut pubsub_stream = con.on_message();

    while let Some(msg) = pubsub_stream.next().await {
        let payload: String = match msg.get_payload() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("[sync-worker] Pub/Sub payload error: {e}");
                continue;
            }
        };

        let v: Result<serde_json::Value, _> = serde_json::from_str(&payload);
        if let Ok(json) = v {
            if let Some(tournament_id) = json["tournamentId"].as_str() {
                let action = json["action"].as_str().unwrap_or("trigger_next_group");

                let db_clone = db.clone();
                let pool_clone = pool.clone();
                let rabbitmq_clone = rabbitmq.clone();
                let t_id = tournament_id.to_string();
                let a = action.to_string();

                tokio::spawn(async move {
                    handle_manual_trigger(&db_clone, &pool_clone, &rabbitmq_clone, &t_id, &a).await;
                });
            }
        }
    }
}

async fn handle_manual_trigger(
    db: &Arc<PgPool>,
    pool: &RedisPool,
    rabbitmq: &Arc<rabbitmq_rustclient::RabbitClient>,
    tournament_id: &str,
    action: &str,
) {
    let mut conn = match pool.get().await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[manual_trigger] Redis pool error: {e}");
            return;
        }
    };

    let lock_key = format!("{TRIGGER_LOCK_PREFIX}{tournament_id}");

    // Acquire distributed lock for 10 seconds to prevent double triggering
    let acquired: Option<String> = redis::cmd("SET")
        .arg(&lock_key)
        .arg("locked")
        .arg("NX")
        .arg("EX")
        .arg(10)
        .query_async(&mut *conn)
        .await
        .unwrap_or(None);

    if acquired.is_none() {
        eprintln!("[manual_trigger] Action {action} for {tournament_id} ignored (lock active)");
        return;
    }

    eprintln!("[manual_trigger] Processing {action} for tournament {tournament_id}");

    if action == "trigger_next_group" || action == "trigger_next_round" {
        // Fetch current tournament and round status
        let status: Option<String> = match sqlx::query_scalar(
            r#"SELECT status::text FROM "Round"
               WHERE "tournamentId" = $1
               ORDER BY "roundNumber" DESC LIMIT 1"#,
        )
        .bind(tournament_id)
        .fetch_optional(&**db)
        .await
        {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[manual_trigger] DB error getting round status: {e}");
                return;
            }
        };

        if let Some(s) = status {
            if s == "IN_PROGRESS" {
                eprintln!("[manual_trigger] Tournament {tournament_id} has an IN_PROGRESS round, skipping next_round trigger");
                return;
            }
        }

        // Call the tournament init / next round logic
        if let Err(e) = tournament_init::run_next_round(db, pool, rabbitmq, tournament_id).await {
            eprintln!("[manual_trigger] Failed to trigger next round for {tournament_id}: {e}");
        } else {
            println!("[manual_trigger] Successfully triggered next round for {tournament_id}");
        }
    } else {
        eprintln!("[manual_trigger] Unknown action {action} for {tournament_id}");
    }
}
