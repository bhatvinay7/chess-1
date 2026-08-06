use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use redis_rustclient::redis::AsyncCommands;
use std::collections::BTreeMap;

use crate::models::{PlayerJoin, StagedPlayer};

pub const QUEUE_ZSET: &str = "matchmaker:zset";

pub async fn sync_from_redis(
    pool: Pool<RedisConnectionManager>,
    pool_name: &str,
) -> Vec<(String, f64)> {
    let mut conn = match pool.get().await {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[RECOVERY ERROR] {e}");
            return vec![];
        }
    };
    println!("[RECOVERY] {} syncing from Redis...", pool_name);
    let raw_players: Vec<(String, f64)> = (*conn)
        .zrange_withscores(QUEUE_ZSET, 0, -1)
        .await
        .unwrap_or_default();
    println!(
        "[RECOVERY] {} re-synced {} players.",
        pool_name,
        raw_players.len()
    );
    raw_players
}

pub fn parse_recovered_players(
    raw_players: Vec<(String, f64)>,
    pool_name: &str,
) -> BTreeMap<(String, bool, u32, String), StagedPlayer> {
    let mut recovered: BTreeMap<(String, bool, u32, String), StagedPlayer> = BTreeMap::new();
    for (json_str, score) in raw_players {
        if let Ok(parsed) = serde_json::from_str::<PlayerJoin>(&json_str) {
            let pool_key = if parsed.game_mode == "chess960" {
                format!("{}_chess960", parsed.time_slot)
            } else {
                parsed.time_slot.clone()
            };

            if pool_key == pool_name {
                let key = (
                    parsed.time_slot.clone(),
                    parsed.is_rated,
                    parsed.rating,
                    parsed.user_id.clone(),
                );
                recovered.insert(
                    key,
                    StagedPlayer {
                        raw_json: json_str.to_string(),
                        parsed,
                        timestamp: score,
                    },
                );
            }
        }
    }
    recovered
}
