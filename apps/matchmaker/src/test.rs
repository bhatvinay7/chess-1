#[cfg(test)]
mod tests {
    use actix::prelude::*;
    use bb8::Pool;
    use bb8_redis::RedisConnectionManager;
    use redis_rustclient::redis::AsyncCommands;
    use std::collections::BTreeMap;

    // Import from the other modules that were split out
    use crate::matching::{MatchPool, QUEUE_ZSET};
    use crate::models::{PlayerJoin, StagedPlayer};

    async fn setup_redis() -> (
        Pool<RedisConnectionManager>,
        redis_rustclient::redis::Client,
    ) {
        dotenvy::from_filename(".env.test").ok();
        let redis_url =
            std::env::var("TEST_REDIS_URL").expect("TEST_REDIS_URL must be set in .env.test");

        let manager =
            RedisConnectionManager::new(redis_url.clone()).expect("Invalid TEST_REDIS_URL");
        let pool = Pool::builder()
            .build(manager)
            .await
            .expect("Failed to build bb8 pool");
        let client = redis_rustclient::redis::Client::open(redis_url).unwrap();
        (pool, client)
    }

    #[actix::test]
    async fn test_matchmaking_flow() {
        let (redis_pool, client) = setup_redis().await;
        let mut conn = client.get_multiplexed_async_connection().await.unwrap();

        // 1. Clean up Redis before test
        let _: () = conn.del(QUEUE_ZSET).await.unwrap_or(());

        // 2. Start the pool actor (Supervisor protects it, but we can also just use .start())
        let pool_actor = MatchPool {
            name: "3+0".to_string(),
            queue: BTreeMap::new(),
            pool: redis_pool,
        }
        .start();

        // 3. Create two mock players
        let mut p1 = StagedPlayer {
            raw_json: "".to_string(),
            parsed: PlayerJoin {
                trace_context: Default::default(),
                user_id: "test_user_1".to_string(),
                rating: 1500,
                profile_image_url: "".to_string(),
                timestamp: 0.0,
                username: "Player1".to_string(),
                time_slot: "3+0".to_string(),
                is_rated: true,
                game_mode: "standard".to_string(),
            },
            timestamp: 0.0,
        };
        p1.raw_json = serde_json::to_string(&p1.parsed).unwrap();

        let mut p2 = p1.clone();
        p2.parsed.user_id = "test_user_2".to_string();
        p2.parsed.username = "Player2".to_string();
        p2.raw_json = serde_json::to_string(&p2.parsed).unwrap();

        // MatchPool checks "presence:user_id" before matching them!
        // We must mock their presence in Redis so they don't get discarded.
        let _: () = conn.set("presence:test_user_1", "1").await.unwrap();
        let _: () = conn.set("presence:test_user_2", "1").await.unwrap();

        // 4. Send players to the actor via the mailbox
        pool_actor.send(p1).await.unwrap();
        pool_actor.send(p2).await.unwrap();

        // 5. Wait briefly for the actor's async Redis pipeline to complete
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;

        // 6. Check if the game was created and added to the player's matchmaking queue
        let p1_game_key = "matchmaking:gameId:test_user_1";
        let matches: Vec<String> = conn.zrange(p1_game_key, 0, -1).await.unwrap();

        assert!(
            !matches.is_empty(),
            "A match should have been created and added to Redis ZSET"
        );

        // Clean up mock presence
        let _: () = conn.del("presence:test_user_1").await.unwrap();
        let _: () = conn.del("presence:test_user_2").await.unwrap();
    }
}
