/**
 * TypeScript interfaces that mirror the proto message definitions in chess.proto.
 * Keeping them here means callers get full type-safety without code generation.
 */

// ── Proto messages ────────────────────────────────────────────────────────────

export interface MoveRequest {
  game_id: string;
  user_id: string;
  from: string;
  to: string;
  promotion: string; // "q"|"r"|"b"|"n" or empty string
}

export interface MoveResponse {
  valid: boolean;
  new_fen: string;
  /** "IN_PROGRESS" | "CHECKMATE" | "DRAW" | "GAME_OVER" */
  game_status: string;
  /** "WHITE_TO_MOVE" | "BLACK_TO_MOVE" */
  turn: string;
  is_game_over: boolean;
  /** Seconds remaining on white's clock */
  black_player_left_time: number,
  white_player_left_time: number;
  /** Seconds remaining on black's clock */

  /** Populated only when valid=false */
  error_reason: string;
  // Echo fields
  game_id: string;
  user_id: string;
  move_from: string;
  move_to: string;
  move_promotion: string;
  game_mode: string;
}

// ── gRPC service client shape ─────────────────────────────────────────────────

import type * as grpc from "@grpc/grpc-js";

/** Typed gRPC client for ChessMoveService. */
export interface ChessMoveServiceClient extends grpc.Client {
  ProcessMove(
    request: MoveRequest,
    metadata: grpc.Metadata,
    callback: (
      error: grpc.ServiceError | null,
      response: MoveResponse,
    ) => void,
  ): grpc.ClientUnaryCall;

  RegisterSpectatedGame(
    request: SpectateRequest,
    metadata: grpc.Metadata,
    callback: (
      error: grpc.ServiceError | null,
      response: SpectateResponse,
    ) => void,
  ): grpc.ClientUnaryCall;
}

// ── Spectator messages ────────────────────────────────────────────────────────

export interface SpectateRequest {
  game_id: string;
}

export interface SpectateResponse {
  success: boolean;
}

// ── Server handler types ──────────────────────────────────────────────────────

export type ProcessMoveHandler = (
  call: grpc.ServerUnaryCall<MoveRequest, MoveResponse>,
  callback: grpc.sendUnaryData<MoveResponse>,
) => void | Promise<void>;
