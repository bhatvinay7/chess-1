use crate::MetricsCollector;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

/// Start an async HTTP server serving `/metrics` (for Prometheus scraping)
/// and `/health` (for Kubernetes liveness/readiness probes) on the specified port.
pub fn start_metrics_server(collector: Arc<MetricsCollector>, port: u16) {
    tokio::spawn(async move {
        let addr = format!("0.0.0.0:{}", port);
        let listener = match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                eprintln!(
                    "[metrics-rustclient] Failed to bind metrics server on {}: {}",
                    addr, e
                );
                return;
            }
        };

        println!(
            "[metrics-rustclient] Serving /metrics and /health on {}",
            addr
        );

        loop {
            if let Ok((mut socket, _)) = listener.accept().await {
                let collector = Arc::clone(&collector);
                tokio::spawn(async move {
                    let mut buf = [0u8; 1024];
                    let n = match socket.read(&mut buf).await {
                        Ok(0) | Err(_) => return,
                        Ok(n) => n,
                    };

                    let request_line = String::from_utf8_lossy(&buf[..n]);
                    let mut lines = request_line.lines();
                    let first_line = lines.next().unwrap_or("");

                    if first_line.starts_with("GET /metrics") {
                        let metrics = MetricsCollector::gather_metrics_as_string();
                        let response = format!(
                            "HTTP/1.1 200 OK\r\n\
                             Content-Type: text/plain; version=0.0.4\r\n\
                             Content-Length: {}\r\n\
                             Connection: close\r\n\r\n\
                             {}",
                            metrics.len(),
                            metrics
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                    } else if first_line.starts_with("GET /health") {
                        let is_healthy = collector.is_healthy();
                        let (status_code, status_text) = if is_healthy {
                            (200, "OK")
                        } else {
                            (503, "Service Unavailable")
                        };
                        let body = format!(
                            "{{\"service\":\"{}\",\"status\":\"{}\",\"healthy\":{}}}",
                            collector.service_name,
                            if is_healthy { "healthy" } else { "unhealthy" },
                            is_healthy
                        );
                        let response = format!(
                            "HTTP/1.1 {} {}\r\n\
                             Content-Type: application/json\r\n\
                             Content-Length: {}\r\n\
                             Connection: close\r\n\r\n\
                             {}",
                            status_code,
                            status_text,
                            body.len(),
                            body
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                    } else {
                        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
                        let _ = socket.write_all(response.as_bytes()).await;
                    }
                });
            }
        }
    });
}
