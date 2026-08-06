pub mod server;
pub mod system;

use lazy_static::lazy_static;
use prometheus::{
    register_gauge, register_histogram_vec, register_int_counter_vec, register_int_gauge, Encoder,
    Gauge, HistogramVec, IntCounterVec, IntGauge, TextEncoder,
};
use std::sync::atomic::{AtomicBool, Ordering};

lazy_static! {
    /// Tracks active user count / connected sessions on this server instance.
    pub static ref USER_COUNT: IntGauge = register_int_gauge!(
        "chess_active_users_total",
        "Current total number of active connected users or matches"
    )
    .expect("metric can be created");

    /// Service health status: 1.0 = healthy, 0.0 = degraded or unhealthy.
    pub static ref SERVICE_HEALTH: Gauge = register_gauge!(
        "chess_service_health_status",
        "Service health status (1.0 = healthy, 0.0 = unhealthy)"
    )
    .expect("metric can be created");

    /// Real-time CPU utilization percentage of the server process.
    pub static ref CPU_USAGE_PERCENT: Gauge = register_gauge!(
        "chess_process_cpu_usage_percent",
        "CPU utilization percentage of the service process"
    )
    .expect("metric can be created");

    /// Real-time Resident Set Size (RSS) memory consumption in bytes.
    pub static ref RAM_USAGE_BYTES: Gauge = register_gauge!(
        "chess_process_memory_bytes",
        "Resident Set Size (RSS) memory consumption in bytes"
    )
    .expect("metric can be created");

    /// Total requests processed labeled by endpoint and status code.
    pub static ref REQUESTS_TOTAL: IntCounterVec = register_int_counter_vec!(
        "chess_requests_total",
        "Total requests processed by the server",
        &["endpoint", "status"]
    )
    .expect("metric can be created");

    /// Request duration histogram in seconds labeled by endpoint.
    pub static ref REQUEST_DURATION_SECONDS: HistogramVec = register_histogram_vec!(
        "chess_request_duration_seconds",
        "Request duration histogram in seconds",
        &["endpoint"]
    )
    .expect("metric can be created");
}

static IS_HEALTHY: AtomicBool = AtomicBool::new(true);

/// Production-grade modular metrics collector and observability handle.
#[derive(Clone)]
pub struct MetricsCollector {
    pub service_name: String,
}

impl MetricsCollector {
    /// Initialize a new MetricsCollector for the service.
    /// Sets initial health to 1.0 (healthy) and initializes gauges.
    pub fn new(service_name: impl Into<String>) -> Self {
        let name = service_name.into();
        SERVICE_HEALTH.set(1.0);
        IS_HEALTHY.store(true, Ordering::SeqCst);
        Self { service_name: name }
    }

    /// Set the active user / player count.
    pub fn set_user_count(&self, count: i64) {
        USER_COUNT.set(count);
    }

    /// Increment the active user count by delta.
    pub fn inc_user_count(&self) {
        USER_COUNT.inc();
    }

    /// Decrement the active user count by delta.
    pub fn dec_user_count(&self) {
        USER_COUNT.dec();
    }

    /// Update service health status.
    pub fn set_health(&self, healthy: bool) {
        IS_HEALTHY.store(healthy, Ordering::SeqCst);
        SERVICE_HEALTH.set(if healthy { 1.0 } else { 0.0 });
    }

    /// Check if the service is currently marked healthy.
    pub fn is_healthy(&self) -> bool {
        IS_HEALTHY.load(Ordering::SeqCst)
    }

    /// Record a request execution duration and counter.
    pub fn record_request(&self, endpoint: &str, status: &str, duration_secs: f64) {
        REQUESTS_TOTAL.with_label_values(&[endpoint, status]).inc();
        REQUEST_DURATION_SECONDS
            .with_label_values(&[endpoint])
            .observe(duration_secs);
    }

    /// Gather all Prometheus metrics formatted as string.
    pub fn gather_metrics_as_string() -> String {
        let encoder = TextEncoder::new();
        let metric_families = prometheus::gather();
        let mut buffer = vec![];
        if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
            return format!("# ERROR encoding metrics: {}\n", e);
        }
        String::from_utf8_lossy(&buffer).to_string()
    }
}
