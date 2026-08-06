mod service;
mod spectate;

use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;

use redis::{aio::ConnectionManager, AsyncCommands, Client};
use service::{ChessMoveServiceImpl, ChessMoveServiceServer};
use tokio::sync::RwLock;
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();

    let port: u16 = std::env::var("GRPC_PORT")
        .unwrap_or_else(|_| "50051".to_string())
        .parse()
        .unwrap_or(50051);

    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

    let client = Client::open(redis_url)?;
    let redis = ConnectionManager::new(client).await?;

    println!("[game-server] Connected to Redis.");

    // Initialize modular Grafana/Prometheus metrics package
    metrics_rustclient::system::start_system_metrics_collector(5);
    let metrics = Arc::new(metrics_rustclient::MetricsCollector::new("game-server"));
    let metrics_port: u16 = std::env::var("METRICS_PORT")
        .unwrap_or_else(|_| "9100".to_string())
        .parse()
        .unwrap_or(9100);
    metrics_rustclient::server::start_metrics_server(metrics.clone(), metrics_port);

    // Shared in-memory set of game IDs that currently have spectators.
    // ProcessMove checks this before publishing to game:spectate:move:*.
    let watched_games: Arc<RwLock<HashSet<String>>> = Arc::new(RwLock::new(HashSet::new()));

    // Background worker: every 10 s, fetch HKEYS spectators:active from Redis
    // and replace the local watched-games set.  This keeps the set consistent
    // even after ws-server restarts or network splits.
    {
        let wg = watched_games.clone();
        let mut r = redis.clone();
        let mc = metrics.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(10)).await;
                match r.hkeys::<_, Vec<String>>("spectators:active").await {
                    Ok(keys) => {
                        mc.set_user_count(keys.len() as i64);
                        let new_set: HashSet<String> = keys.into_iter().collect();
                        *wg.write().await = new_set;
                    }
                    Err(e) => eprintln!("[spectate-worker] Redis HKEYS error: {e}"),
                }
            }
        });
    }

    let addr = format!("0.0.0.0:{port}").parse()?;
    let svc = ChessMoveServiceImpl {
        redis,
        watched_games,
    };

    println!("[gRPC] ChessMoveService listening on 0.0.0.0:{port}");

    Server::builder()
        .add_service(ChessMoveServiceServer::new(svc))
        .serve(addr)
        .await?;

    Ok(())
}
