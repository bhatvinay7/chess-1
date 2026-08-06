use redis::{aio::ConnectionManager, AsyncCommands, Client, RedisError};
use std::time::Duration;

#[derive(Clone)]
pub struct RedisClient {
    manager: ConnectionManager,
}

impl RedisClient {
    pub fn conn(&mut self) -> &mut ConnectionManager {
        &mut self.manager
    }
}

impl RedisClient {
    pub async fn new(url: &str) -> Result<Self, RedisError> {
        let client = Client::open(url)?;
        let manager = ConnectionManager::new(client).await?;
        Ok(Self { manager })
    }

    pub async fn set(&mut self, key: &str, value: &str) -> Result<(), RedisError> {
        self.manager.set(key, value).await
    }

    pub async fn set_ex(
        &mut self,
        key: &str,
        value: &str,
        ttl: Duration,
    ) -> Result<(), RedisError> {
        self.manager.set_ex(key, value, ttl.as_secs()).await
    }

    pub async fn get(&mut self, key: &str) -> Result<Option<String>, RedisError> {
        self.manager.get(key).await
    }

    pub async fn del(&mut self, key: &str) -> Result<(), RedisError> {
        self.manager.del(key).await
    }

    pub async fn exists(&mut self, key: &str) -> Result<bool, RedisError> {
        self.manager.exists(key).await
    }

    pub async fn lpush(&mut self, key: &str, value: &str) -> Result<i64, RedisError> {
        self.manager.lpush(key, value).await
    }

    pub async fn rpop(&mut self, key: &str) -> Result<Option<String>, RedisError> {
        self.manager.rpop(key, None).await
    }

    pub async fn llen(&mut self, key: &str) -> Result<i64, RedisError> {
        self.manager.llen(key).await
    }

    pub async fn lrange(
        &mut self,
        key: &str,
        start: isize,
        stop: isize,
    ) -> Result<Vec<String>, RedisError> {
        self.manager.lrange(key, start, stop).await
    }

    pub async fn lrem(&mut self, key: &str, count: isize, value: &str) -> Result<i64, RedisError> {
        self.manager.lrem(key, count, value).await
    }

    pub async fn hset(&mut self, hash: &str, field: &str, value: &str) -> Result<(), RedisError> {
        self.manager.hset(hash, field, value).await
    }

    pub async fn hget(&mut self, hash: &str, field: &str) -> Result<Option<String>, RedisError> {
        self.manager.hget(hash, field).await
    }

    pub async fn hdel(&mut self, hash: &str, field: &str) -> Result<(), RedisError> {
        self.manager.hdel(hash, field).await
    }

    pub async fn hgetall(
        &mut self,
        hash: &str,
    ) -> Result<std::collections::HashMap<String, String>, RedisError> {
        self.manager.hgetall(hash).await
    }
}
