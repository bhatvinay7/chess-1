// ── Draw flow: shared between apps/web (socket client) and apps/ws-server ────
//
// Keeping these in one place means both sides agree on the exact shape of the
// "offer-draw" / "claim-draw" / "decline-draw" round trip without re-declaring
// the types (and risking drift) on each side.

export type DrawAction = "allowed" | "not_allowed";

/** Info about the user who sent the draw offer, shown to the recipient. */
export interface OfferDrawPayload {
  username: string;
  profile_image_url: string;
  message: string;
  opponentId: string;
}

export interface OfferDrawSuccessResponse {
  payload: OfferDrawPayload;
  action: "allowed";
}

export interface OfferDrawErrorResponse {
  message: string;
  action: "not_allowed";
}

export type OfferDrawResponse =
  | OfferDrawSuccessResponse
  | OfferDrawErrorResponse;

export interface ClaimDrawSuccessResponse {
  game_state: string;
  white_player_id: string | null;
  black_player_id: string | null;
  player1_profile_image_url: string | null;
  player2_profile_image_url: string | null;
  player1_rating: string | null;
  player2_rating: string | null;
  player1_username: string;
  player2_username: string;
  player1_id: string | null;
  player2_id: string | null;
  opponentId?: string;
}

export interface ClaimDrawErrorResponse {
  message: string;
  action: "not_allowed";
}

export type ClaimDrawResponse =
  | ClaimDrawSuccessResponse
  | ClaimDrawErrorResponse;

export interface DeclineDrawResponse {
  message: string;
  opponentId?: string;
}

// ── Client → server emit payloads ────────────────────────────────────────────

export interface OfferDrawRequest {
  userId: string;
  opponentId: string;
}

export interface ClaimDrawRequest {
  userId: string;
  opponentId: string;
}

export interface DeclineDrawRequest {
  userId: string;
  opponentId: string;
}

/** Asks the server whether a draw offer is currently pending for this user
 *  (e.g. on reconnect) — server replies on "draw-request" if one exists. */
export interface CheckDrawOfferRequest {
  userId: string;
}

// ── Rematch flow ──────────────────────────────────────────────────────────────

export interface RematchRequestPayload {
  userId: string;
  opponentId: string;
}

/** Sender info forwarded to the receiver when a rematch is requested. */
export interface RematchOpponent {
  /** The sender's userId — from the receiver's perspective this is their opponent. */
  opponentId: string;
  profile_image_url: string;
  username: string;
  /** The user who should receive this notification (used for PubSub routing). */
  receiverId: string;
}

export interface CheckRematchRequest {
  userId: string;
}
