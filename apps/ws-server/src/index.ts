import { WebSocketServer } from "./server.js";

new WebSocketServer().start().catch((err) => {
  console.error("[ws-server] Fatal startup error:", err);
  process.exit(1);
});
