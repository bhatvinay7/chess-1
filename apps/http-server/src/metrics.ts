import type { Express, Request, Response } from "express";

let requestCount = 0;
let lastCpu = process.cpuUsage();
let lastSample = process.hrtime.bigint();

export function registerMetrics(app: Express): void {
  app.use((req, res, next) => {
    if (req.path !== "/metrics") {
      res.on("finish", () => requestCount++);
    }
    next();
  });

  app.get("/metrics", (_req: Request, res: Response) => {
    const now = process.hrtime.bigint();
    const cpu = process.cpuUsage(lastCpu);
    const elapsedMicros = Number(now - lastSample) / 1_000;
    const cpuPercent =
      elapsedMicros > 0 ? ((cpu.user + cpu.system) / elapsedMicros) * 100 : 0;
    lastCpu = process.cpuUsage();
    lastSample = now;

    res
      .type("text/plain; version=0.0.4")
      .send(
        `# HELP chess_service_health_status Service health status (1 = healthy)\n` +
          `# TYPE chess_service_health_status gauge\nchess_service_health_status 1\n` +
          `# HELP chess_process_cpu_usage_percent Process CPU utilization percentage\n` +
          `# TYPE chess_process_cpu_usage_percent gauge\nchess_process_cpu_usage_percent ${cpuPercent}\n` +
          `# HELP chess_process_memory_bytes Process resident memory in bytes\n` +
          `# TYPE chess_process_memory_bytes gauge\nchess_process_memory_bytes ${process.memoryUsage().rss}\n` +
          `# HELP chess_requests_total Total HTTP requests processed\n` +
          `# TYPE chess_requests_total counter\nchess_requests_total ${requestCount}\n`,
      );
  });
}
