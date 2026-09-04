let lastCpu = process.cpuUsage();
let lastSample = process.hrtime.bigint();

export const dynamic = "force-dynamic";

export function GET(): Response {
  const now = process.hrtime.bigint();
  const cpu = process.cpuUsage(lastCpu);
  const elapsedMicros = Number(now - lastSample) / 1_000;
  const cpuPercent = elapsedMicros > 0 ? ((cpu.user + cpu.system) / elapsedMicros) * 100 : 0;
  lastCpu = process.cpuUsage();
  lastSample = now;

  const body =
    `# HELP chess_service_health_status Service health status (1 = healthy)\n` +
    `# TYPE chess_service_health_status gauge\nchess_service_health_status 1\n` +
    `# HELP chess_process_cpu_usage_percent Process CPU utilization percentage\n` +
    `# TYPE chess_process_cpu_usage_percent gauge\nchess_process_cpu_usage_percent ${cpuPercent}\n` +
    `# HELP chess_process_memory_bytes Process resident memory in bytes\n` +
    `# TYPE chess_process_memory_bytes gauge\nchess_process_memory_bytes ${process.memoryUsage().rss}\n`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
