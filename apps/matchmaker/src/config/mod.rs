use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use redis_rustclient::default_url;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct MatchmakerConfig {
    pub redis_url: String,
    pub metrics_port: u16,
    pub consumer_group: &'static str,
    pub consumer_name: String,
}

impl MatchmakerConfig {
    pub fn from_env() -> Self {
        let redis_url = default_url().to_string();
        let metrics_port: u16 = std::env::var("METRICS_PORT")
            .unwrap_or_else(|_| "9102".to_string())
            .parse()
            .unwrap_or(9102);

        let consumer_group = "matchmaker_group";
        let consumer_name = format!("matchmaker_node_{}", std::process::id());

        Self {
            redis_url,
            metrics_port,
            consumer_group,
            consumer_name,
        }
    }

    pub fn default_time_variants() -> Vec<&'static str> {
        vec![
            "1+0",
            "1+1",
            "2+1",
            "3+0",
            "3+2",
            "5+0",
            "10+0",
            "15+10",
            "30+0",
            "1+0_chess960",
            "1+1_chess960",
            "2+1_chess960",
            "3+0_chess960",
            "3+2_chess960",
            "5+0_chess960",
            "10+0_chess960",
            "15+10_chess960",
            "30+0_chess960",
        ]
    }
}

pub async fn create_redis_pool(
    redis_url: &str,
) -> Result<Pool<RedisConnectionManager>, Box<dyn std::error::Error>> {
    let manager = RedisConnectionManager::new(redis_url.to_string())?;
    let pool = Pool::builder()
        .max_size(5)
        .connection_timeout(Duration::from_secs(3))
        .build(manager)
        .await?;
    Ok(pool)
}
