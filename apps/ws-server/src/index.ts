import "dotenv/config";
import { initTelemetry } from "@repo/telemetry-node";
import { WebSocketServer } from "./server.js";

initTelemetry("chess-ws-server");

new WebSocketServer().start().catch((err) => {
  console.error("[ws-server] Fatal startup error:", err);
  process.exit(1);
});
