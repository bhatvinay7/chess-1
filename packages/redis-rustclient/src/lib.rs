pub mod client;
pub mod pubsub;

pub use client::RedisClient;
pub use pubsub::RedisPubSub;

pub use redis;
pub use redis::RedisError;

use std::sync::OnceLock;

pub fn default_url() -> &'static str {
    static REDIS_URL: OnceLock<String> = OnceLock::new();

    REDIS_URL.get_or_init(|| {
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string())
    })
}
