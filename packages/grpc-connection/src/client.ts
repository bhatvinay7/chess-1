/**
 * gRPC client for ChessMoveService.
 *
 * Usage (in ws-server):
 *
 *   import { createGrpcClient, processMoveGrpc } from "@repo/grpc-connection";
 *
 *   const grpcClient = createGrpcClient();          // uses GRPC_ADDRESS env or localhost:50051
 *
 *   // fire-and-forget (pub/sub handles the result):
 *   processMoveGrpc(grpcClient, { game_id, user_id, from, to, promotion }).catch(console.error);
 */

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { ChessMoveServiceClient, MoveRequest, MoveResponse, SpectateRequest, SpectateResponse } from "./types.js";

// ── Proto path (same proto as server) ────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROTO_PATH = join(__dirname, "..", "proto", "chess.proto");

// ── Client factory ────────────────────────────────────────────────────────────

let _packageDef: ReturnType<typeof protoLoader.loadSync> | null = null;

/** Load the package definition once and reuse it. */
function getPackageDef() {
  if (!_packageDef) {
    _packageDef = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  }
  return _packageDef;
}

/**
 * Create a new gRPC client for ChessMoveService.
 *
 * @param address  Host:port of the gRPC server.
 *                 Defaults to process.env.GRPC_ADDRESS or "localhost:50051".
 */
export function createGrpcClient(
  address: string = process.env.GRPC_SERVER_URL ?? process.env.GRPC_ADDRESS ?? "localhost:50051",
): ChessMoveServiceClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto = grpc.loadPackageDefinition(getPackageDef()) as any;
  const ChessMoveService = proto.chess.ChessMoveService as new (
    address: string,
    credentials: grpc.ChannelCredentials,
    options?: grpc.ClientOptions,
  ) => ChessMoveServiceClient;

  return new ChessMoveService(
    address,
    grpc.credentials.createInsecure(),
    {
      // Automatically reconnect on transient failures.
      "grpc.enable_retries": 1,
      "grpc.service_config": JSON.stringify({
        loadBalancingConfig: [{ round_robin: {} }],
        methodConfig: [
          {
            name: [{ service: "chess.ChessMoveService" }],
            retryPolicy: {
              maxAttempts: 3,
              initialBackoff: "0.1s",
              maxBackoff: "1s",
              backoffMultiplier: 2,
              retryableStatusCodes: ["UNAVAILABLE"],
            },
          },
        ],
      }),
    },
  );
}

// ── Promisified helper ────────────────────────────────────────────────────────

/**
 * Call ProcessMove and return a Promise<MoveResponse>.
 *
 * The ws-server uses this fire-and-forget because the canonical result
 * notification is delivered via Redis Pub/Sub (game:move:processed:* /
 * game:move:invalid:*).  The Promise rejection is still surfaced for logging.
 */
export function processMoveGrpc(
  client: ChessMoveServiceClient,
  request: MoveRequest,
): Promise<MoveResponse> {
  return new Promise<MoveResponse>((resolve, reject) => {
    client.ProcessMove(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Notify the game-server that a spectator has joined game_id.
 * The server immediately adds the game to its local watched-games set so
 * spectator move events are published without waiting for the 10-second poll.
 */
export function registerSpectatedGameGrpc(
  client: ChessMoveServiceClient,
  game_id: string,
): Promise<SpectateResponse> {
  return new Promise<SpectateResponse>((resolve, reject) => {
    client.RegisterSpectatedGame({ game_id }, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}
