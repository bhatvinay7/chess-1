use crate::types::GameResultEntry;
use bb8_redis::{bb8, RedisConnectionManager};
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::sleep;

pub type RedisPool = bb8::Pool<RedisConnectionManager>;

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub async fn run_fallback_worker(redis_pool: RedisPool) {
    loop {
        if let Err(e) = process_fallback_queue(&redis_pool).await {
            eprintln!("[fallback_worker] Error processing queue: {}", e);
        }
        sleep(Duration::from_secs(60)).await;
    }
}

async fn process_fallback_queue(redis_pool: &RedisPool) -> Result<(), Box<dyn std::error::Error>> {
    let mut conn = match redis_pool.get().await {
        Ok(c) => c,
        Err(_) => return Ok(()),
    };

    let current_ms = now_ms();

    // Get all game IDs with score <= current_ms
    let expired_games: Vec<String> = redis::cmd("ZRANGEBYSCORE")
        .arg("game:fallback:queue")
        .arg("-inf")
        .arg(current_ms)
        .query_async(&mut *conn)
        .await
        .unwrap_or_default();

    for game_id in expired_games {
        let game_key = format!("game:state:{}", game_id);
        let exists: bool = redis::cmd("EXISTS")
            .arg(&game_key)
            .query_async(&mut *conn)
            .await
            .unwrap_or(false);

        if !exists {
            // Game successfully completed and cleaned up natively. Remove from queue.
            let _: () = redis::cmd("ZREM")
                .arg("game:fallback:queue")
                .arg(&game_id)
                .query_async(&mut *conn)
                .await
                .unwrap_or(());
            continue;
        }

        // Game still exists. Let's fetch it and forcefully declare a timeout.
        let game_state: HashMap<String, String> = redis::cmd("HGETALL")
            .arg(&game_key)
            .query_async(&mut *conn)
            .await
            .unwrap_or_default();

        if game_state.is_empty() {
            let _: () = redis::cmd("ZREM")
                .arg("game:fallback:queue")
                .arg(&game_id)
                .query_async(&mut *conn)
                .await
                .unwrap_or(());
            continue;
        }

        let p1_id = game_state.get("player1_id").cloned().unwrap_or_default();
        let p2_id = game_state.get("player2_id").cloned().unwrap_or_default();
        let w_id = game_state
            .get("white_player_id")
            .cloned()
            .unwrap_or_default();
        let b_id = game_state
            .get("black_player_id")
            .cloned()
            .unwrap_or_default();

        let initial_time = game_state
            .get("time_slot")
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(600);
        let white_left = game_state
            .get("white_player_left_time")
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(initial_time);
        let black_left = game_state
            .get("black_player_left_time")
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(initial_time);

        let winner_id = if white_left < black_left {
            Some(b_id.clone())
        } else if black_left < white_left {
            Some(w_id.clone())
        } else {
            None
        };

        let result_reason = if winner_id.is_none() {
            "ABANDONED".to_string()
        } else {
            "TIMEOUT".to_string()
        };

        let payload = GameResultEntry {
            game_id: game_id.clone(),
            winner_id,
            status: result_reason,
        };

        if let Ok(json_str) = serde_json::to_string(&payload) {
            let _: () = redis::cmd("XADD")
                .arg("match:process:results")
                .arg("*")
                .arg("payload")
                .arg(&json_str)
                .query_async(&mut *conn)
                .await
                .unwrap_or(());
        }

        // Cleanup the ZSET queues. We do NOT delete game_key because game_result worker needs it.
        let mut pipe = redis::pipe();
        pipe.atomic();
        pipe.zrem("game:fallback:queue", &game_id);

        if !p1_id.is_empty() {
            pipe.zrem(format!("matchmaking:gameId:{}", p1_id), &game_id);
            pipe.zrem(format!("user:active:games:{}", p1_id), &game_id);
        }
        if !p2_id.is_empty() {
            pipe.zrem(format!("matchmaking:gameId:{}", p2_id), &game_id);
            pipe.zrem(format!("user:active:games:{}", p2_id), &game_id);
        }

        let _: () = pipe.query_async(&mut *conn).await.unwrap_or(());
        println!("[fallback_worker] Processed abandoned game {}", game_id);
    }

    Ok(())
}
