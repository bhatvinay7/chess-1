use actix::prelude::*;
use redis_rustclient::redis::streams::{StreamReadOptions, StreamReadReply};
use redis_rustclient::redis::{self, AsyncCommands};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::matching::{MatchPool, QUEUE_ZSET};
use crate::models::{PlayerJoin, StagedPlayer};

pub const INGEST_STREAM: &str = "matchmaker:stream";

pub async fn run_stream_worker(
    redis_url: String,
    consumer_group: &'static str,
    consumer_name: String,
    pools: HashMap<String, Addr<MatchPool>>,
) {
    let client = match redis::Client::open(redis_url.clone()) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[STREAM FATAL] Failed to create Redis client: {e}");
            return;
        }
    };

    let mut stream_conn = match client.get_multiplexed_tokio_connection().await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[STREAM FATAL] Failed to connect to Redis: {e}");
            return;
        }
    };

    println!(
        "[STREAM WORKER] Active on stream '{}' for group '{}' as '{}'",
        INGEST_STREAM, consumer_group, consumer_name
    );

    loop {
        let opts = StreamReadOptions::default()
            .count(100)
            .block(500)
            .group(consumer_group, &consumer_name);

        let results: StreamReadReply = match stream_conn
            .xread_options(&[INGEST_STREAM], &[">"], &opts)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[STREAM ERROR] {e}. Attempting connection recovery...");
                tokio::time::sleep(Duration::from_millis(1000)).await;
                if let Ok(new_conn) = client.get_multiplexed_async_connection().await {
                    stream_conn = new_conn;
                }
                continue;
            }
        };

        for stream_key in results.keys {
            for entry in stream_key.ids {
                let entry_id = entry.id.clone();

                let parsed = match entry.map.get("data") {
                    Some(redis::Value::BulkString(bytes)) => {
                        match serde_json::from_slice::<PlayerJoin>(bytes) {
                            Ok(p) => p,
                            Err(e) => {
                                let raw_text = String::from_utf8_lossy(bytes);
                                eprintln!("[PARSE ERROR] {e} — raw: {raw_text}");
                                let _: redis::RedisResult<()> = stream_conn
                                    .xack(INGEST_STREAM, consumer_group, &[&entry_id])
                                    .await;
                                continue;
                            }
                        }
                    }
                    _ => {
                        eprintln!("[STREAM] Entry {entry_id} missing 'data' field, skipping.");
                        let _: redis::RedisResult<()> = stream_conn
                            .xack(INGEST_STREAM, consumer_group, &[&entry_id])
                            .await;
                        continue;
                    }
                };

                let timestamp = if parsed.timestamp > 0.0 {
                    parsed.timestamp
                } else {
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs_f64()
                };

                if let Ok(json_str) = serde_json::to_string(&parsed) {
                    let _: redis::RedisResult<()> =
                        stream_conn.zadd(QUEUE_ZSET, &json_str, timestamp).await;

                    let payload = StagedPlayer {
                        raw_json: json_str,
                        parsed: parsed.clone(),
                        timestamp,
                    };

                    let pool_key = if parsed.game_mode == "chess960" {
                        format!("{}_chess960", parsed.time_slot)
                    } else {
                        parsed.time_slot.clone()
                    };

                    if let Some(pool) = pools.get(&pool_key) {
                        if let Err(e) = pool.send(payload).await {
                            eprintln!(
                                "[ROUTING ERROR] Failed to send payload to pool {}: {:?}",
                                pool_key, e
                            );
                        }
                    } else {
                        eprintln!(
                            "Routing failed! No matchmaking pool configured for: {}",
                            pool_key
                        );
                    }

                    let ack_res: redis::RedisResult<i32> = stream_conn
                        .xack(INGEST_STREAM, consumer_group, &[&entry_id])
                        .await;

                    if let Err(ack_err) = ack_res {
                        eprintln!(
                            "[ACK ERROR] Failed to acknowledge message {entry_id}: {ack_err}"
                        );
                    }
                }
            }
        }
    }
}
