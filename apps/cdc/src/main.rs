mod config;
mod decoder;
mod models;
mod processor;
mod scheduler;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    dotenvy::dotenv().ok();
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();
    eprintln!("[CDC] worker starting");

    // Initialize modular Grafana/Prometheus metrics package
    metrics_rustclient::system::start_system_metrics_collector(5);
    let metrics = std::sync::Arc::new(metrics_rustclient::MetricsCollector::new("cdc"));
    let metrics_port: u16 = std::env::var("METRICS_PORT")
        .unwrap_or_else(|_| "9103".to_string())
        .parse()
        .unwrap_or(9103);
    metrics_rustclient::server::start_metrics_server(metrics.clone(), metrics_port);
    processor::run().await
}
