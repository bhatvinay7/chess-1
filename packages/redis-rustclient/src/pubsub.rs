use redis::{aio::PubSub, AsyncCommands, Client, RedisError};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct RedisPubSub {
    pub_url: String,
    publisher: Arc<Mutex<redis::aio::MultiplexedConnection>>,
}

impl RedisPubSub {
    pub async fn new(url: &str) -> Result<Self, RedisError> {
        let client = Client::open(url)?;
        let publisher = client.get_multiplexed_tokio_connection().await?;
        Ok(Self {
            pub_url: url.to_string(),
            publisher: Arc::new(Mutex::new(publisher)),
        })
    }

    pub async fn publish(&self, channel: &str, message: &str) -> Result<i64, RedisError> {
        let mut conn = self.publisher.lock().await;
        conn.publish(channel, message).await
    }

    /// Returns a `PubSub` connection ready to subscribe on. The caller drives
    /// the message loop via `pubsub.on_message()`.
    pub async fn subscribe(&self, channels: &[&str]) -> Result<PubSub, RedisError> {
        let client = Client::open(self.pub_url.as_str())?;
        let mut pubsub = client.get_async_pubsub().await?;
        for channel in channels {
            pubsub.subscribe(*channel).await?;
        }
        Ok(pubsub)
    }

    pub async fn psubscribe(&self, patterns: &[&str]) -> Result<PubSub, RedisError> {
        let client = Client::open(self.pub_url.as_str())?;
        let mut pubsub = client.get_async_pubsub().await?;
        for pattern in patterns {
            pubsub.psubscribe(*pattern).await?;
        }
        Ok(pubsub)
    }
}
