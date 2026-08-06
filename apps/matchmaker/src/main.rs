#![allow(clippy::empty_line_after_doc_comments)]

use actix::prelude::*;
use redis_rustclient::redis::{self, AsyncCommands};
use std::collections::{BTreeMap, HashMap};

mod chess960;
mod config;
mod matching;
mod metrics;
mod models;
mod stream;

#[cfg(test)]
mod test;

use config::MatchmakerConfig;
use matching::MatchPool;
use stream::{run_stream_worker, INGEST_STREAM};

#[actix::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();
    let config = MatchmakerConfig::from_env();

    println!("Matchmaker connecting to {}", config.redis_url);
    println!("Matchmaker initialization starting...");

    // 1. Initialize modular Grafana/Prometheus metrics package
    let _metrics = metrics::init_metrics(config.metrics_port);

    // 2. Initialize the bb8 connection manager for Actors
    let redis_connection_pool = config::create_redis_pool(&config.redis_url).await?;

    // 3. Initialize the Consumer Group structural definitions
    let client = redis::Client::open(config.redis_url.clone())?;
    let mut setup_conn = client.get_multiplexed_async_connection().await?;
    let _: redis::RedisResult<()> = setup_conn
        .xgroup_create_mkstream(INGEST_STREAM, config.consumer_group, "$")
        .await;

    // 4. Dynamically spin up a pool actor for every time variant
    let mut pools = HashMap::new();
    for variant in MatchmakerConfig::default_time_variants() {
        let pool_name = variant.to_string();
        let variant_pool_handle = redis_connection_pool.clone();

        let pool_actor = Supervisor::start(move |_| MatchPool {
            name: pool_name,
            queue: BTreeMap::new(),
            pool: variant_pool_handle,
        });

        pools.insert(variant.to_string(), pool_actor);
    }

    println!("Matchmaker infrastructure initialized.");
    println!(
        "Consumer group '{}' active using consumer identity '{}'",
        config.consumer_group, config.consumer_name
    );

    // 5. Spawn Redis Stream Consumer Group Loop
    tokio::spawn(async move {
        run_stream_worker(
            config.redis_url,
            config.consumer_group,
            config.consumer_name,
            pools,
        )
        .await;
    });

    tokio::signal::ctrl_c().await?;
    println!("Shutting down matchmaker gracefully...");
    Ok(())
}
