/**
 * Game Server — Rust edition
 *
 * The gRPC ChessMoveService has been rewritten in Rust (src/main.rs + src/service.rs).
 * Run the Rust binary instead:
 *
 *   cargo build --release
 *   GRPC_PORT=50051 REDIS_URL=redis://... ./target/release/game-server
 *
 * This TypeScript file is kept for historical reference only.
 */

import { startGrpcServer } from "@repo/grpc-connection";

// ─────────────────────────────────────────────────────────────────────────────
// NEW — gRPC server (all validation + state logic lives in @repo/grpc-connection)
// ─────────────────────────────────────────────────────────────────────────────

async function startGameServer(): Promise<void> {
  const port = parseInt(process.env.GRPC_PORT ?? "50051", 10);
  // startGrpcServer connects Redis internally, registers ChessMoveService,
  // and binds to 0.0.0.0:${port}.
  await startGrpcServer(port);
  console.log(`[game-server] gRPC ChessMoveService running on port ${port}`);
}

startGameServer().catch((err: unknown) => {
  console.error("[game-server] Failed to start:", err);
  process.exit(1);
});
