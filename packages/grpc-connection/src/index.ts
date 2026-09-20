// ── Public API of @repo/grpc-connection ──────────────────────────────────────
//
//  Server side  (used by apps/game-server):
//    import { startGrpcServer } from "@repo/grpc-connection";
//    await startGrpcServer();          // listens on GRPC_PORT (default 50051)
//
//  Client side  (used by apps/ws-server):
//    import { createGrpcClient, processMoveGrpc } from "@repo/grpc-connection";
//    const client = createGrpcClient();            // GRPC_ADDRESS env or localhost:50051
//    processMoveGrpc(client, { ... }).catch(console.error);
//
// ─────────────────────────────────────────────────────────────────────────────

export { startGrpcServer } from "./server.js";
export {
  createGrpcClient,
  processMoveGrpc,
  registerSpectatedGameGrpc,
} from "./client.js";
export type {
  MoveRequest,
  MoveResponse,
  SpectateRequest,
  SpectateResponse,
  ChessMoveServiceClient,
  ProcessMoveHandler,
} from "./types.js";
