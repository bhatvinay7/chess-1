use std::sync::Arc;

pub fn init_metrics(port: u16) -> Arc<metrics_rustclient::MetricsCollector> {
    // Initialize modular Grafana/Prometheus metrics package
    metrics_rustclient::system::start_system_metrics_collector(5);
    let metrics = Arc::new(metrics_rustclient::MetricsCollector::new("matchmaker"));
    metrics_rustclient::server::start_metrics_server(metrics.clone(), port);
    metrics
}
