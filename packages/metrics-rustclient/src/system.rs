use crate::{CPU_USAGE_PERCENT, RAM_USAGE_BYTES};
use std::time::Duration;
use sysinfo::{Pid, ProcessRefreshKind, RefreshKind, System};

/// Starts a background Tokio task that periodically samples the process's
/// CPU usage percentage and Resident Set Size (RSS) memory in bytes,
/// updating the Prometheus gauges for Grafana observability.
pub fn start_system_metrics_collector(interval_secs: u64) {
    tokio::spawn(async move {
        let mut sys = System::new_with_specifics(
            RefreshKind::new().with_processes(ProcessRefreshKind::new().with_cpu().with_memory()),
        );
        let pid = Pid::from(std::process::id() as usize);

        let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
        loop {
            interval.tick().await;

            // Refresh only the current server process for efficiency
            sys.refresh_process(pid);

            if let Some(process) = sys.process(pid) {
                // CPU usage percentage of the process
                let cpu_usage = process.cpu_usage() as f64;
                CPU_USAGE_PERCENT.set(cpu_usage);

                // Memory (Resident Set Size) in bytes
                let ram_bytes = process.memory() as f64;
                RAM_USAGE_BYTES.set(ram_bytes);
            }
        }
    });
}
