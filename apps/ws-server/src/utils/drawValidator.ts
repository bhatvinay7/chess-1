import { Chess } from "chess.js";
import { redisClient } from "@repo/redis-client";
import { fetchGameTerminationState, terminateGame } from "./gameTermination.js";
import type {
  OfferDrawPayload,
  OfferDrawResponse,
  ClaimDrawResponse,
  DeclineDrawResponse,
} from "@repo/socket-types";

export type {
  OfferDrawPayload,
  OfferDrawSuccessResponse,
  OfferDrawErrorResponse,
  OfferDrawResponse,
  ClaimDrawSuccessResponse,
  ClaimDrawErrorResponse,
  ClaimDrawResponse,
  DeclineDrawResponse,
} from "@repo/socket-types";

// Internal Validation Helper Types
export interface ValidationError {
  error: {
    message: string;
    action: "not_allowed";
  };
  activeTurn?: never;
  whiteTimeRemaining?: never;
  blackTimeRemaining?: never;
  rawState?: never;
}

export interface GameSessionState {
  player1_id: string;
  player1_rating: string;
  player1_profile_image_url: string;
  player1_username: string;
  player2_id: string;
  player2_rating: string;
  player2_profile_image_url: string;
  player2_username: string;
  white_player_id: string;
  black_player_id: string;
  increment: string;
  time_slot: string;
  is_rated: boolean;
  current_fen: string;
}

export interface ValidationSuccess {
  error: null;
  activeTurn: "w" | "b";
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  rawState: GameSessionState | Record<string, string>;
}

export type ValidationResult = ValidationError | ValidationSuccess;

async function getAndValidateGameState(
  game_id: string,
  requiredFields: string[],
  errorMessageOnTimeout: string,
): Promise<ValidationResult> {
  const redisValues = await redisClient.hmGet(
    `game:state:${game_id}`,
    requiredFields,
  );

  const getVal = (field: string) => {
    const index = requiredFields.indexOf(field);
    return index !== -1 ? redisValues[index] : null;
  };

  const currentFen = getVal("current_fen");
  const last_move_time = getVal("last_move_time");
  const black_player_left_time = getVal("black_player_left_time");
  const white_player_left_time = getVal("white_player_left_time");
  const game_state = getVal("game_state");

  if (game_state === "GAME_OVER" || game_state === "DRAW") {
    return {
      error: {
        message: "Current game is not in progress,Already complted",
        action: "not_allowed",
      },
    };
  }

  const activeTurn = currentFen!.split(" ")[1] as "w" | "b";
  const initialMoveTime = parseInt(last_move_time!) || 0;
  const currentTimeStamp = Math.floor(Date.now() / 1000);
  const elapsedSeconds =
    initialMoveTime > 0 ? currentTimeStamp - initialMoveTime : 0;

  let whiteTimeRemaining = parseInt(white_player_left_time!) || 0;
  let blackTimeRemaining = parseInt(black_player_left_time!) || 0;

  if (activeTurn === "w") {
    whiteTimeRemaining = Math.max(0, whiteTimeRemaining - elapsedSeconds);
  } else {
    blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsedSeconds);
  }

  const isTimedOut =
    (activeTurn === "w" && whiteTimeRemaining === 0) ||
    (activeTurn === "b" && blackTimeRemaining === 0);
  if (isTimedOut) {
    return {
      error: { message: errorMessageOnTimeout, action: "not_allowed" },
    };
  }

  const rawState: Record<string, string> = {};
  requiredFields.forEach((field, idx) => {
    if (field === "player1_rating")
      rawState["player1_rating"] = redisValues[idx]!;
    else if (field === "player2_rating")
      rawState["player2_rating"] = redisValues[idx]!;
    else rawState[field] = redisValues[idx]!;
  });

  rawState["current_fen"] = currentFen!;

  return {
    error: null,
    activeTurn,
    whiteTimeRemaining,
    blackTimeRemaining,
    rawState,
  };
}

export async function offerDraw(
  game_id: string,
  userId: string,
  opponentId: string,
): Promise<OfferDrawResponse> {
  const fieldsNeeded = [
    "current_fen",
    "last_move_time",
    "white_player_left_time",
    "black_player_left_time",
    "white_player_id",
    "black_player_id",
    "game_state",
    "player1_id",
    "player2_id",
    "player1_username",
    "player1_profile_image_url",
    "player2_username",
    "player2_profile_image_url",
  ];

  const validation = await getAndValidateGameState(
    game_id,
    fieldsNeeded,
    "Draw can not be offered, game is over!",
  );
  if (validation.error) return validation.error;

  const { activeTurn, rawState } = validation;

  const activeTurnPlayerId =
    activeTurn === "w" ? rawState.white_player_id : rawState.black_player_id;
  if (activeTurnPlayerId !== userId) {
    return {
      message: " current play user can offer draw ",
      action: "not_allowed",
    };
  }

  const isUserPlayer1 = userId === rawState.player1_id;
  const payload: OfferDrawPayload = {
    // opponentId is the recipient of the offer (the *other* player) — the
    // username/profile_image_url below describe the offering user (userId),
    // since that's who the recipient sees the popup for.
    opponentId: isUserPlayer1 ? rawState.player2_id! : rawState.player1_id!,
    username: isUserPlayer1
      ? rawState.player1_username!
      : rawState.player2_username!,
    profile_image_url: isUserPlayer1
      ? rawState.player1_profile_image_url!
      : rawState.player2_profile_image_url!,
    message: "Draw is offered by the opponent!",
  };

  await redisClient.hSet(`game:draw:${game_id}:${opponentId}`, {
    offerDraw: "1",
    payload: JSON.stringify(payload),
  });

  return { payload, action: "allowed" };
}

export async function claimDraw(
  userId: string,
  game_id: string,
  opponentId: string,
): Promise<ClaimDrawResponse> {
  const hasDrawOffer = await redisClient.exists(
    `game:draw:${game_id}:${userId}`,
  );
  if (!hasDrawOffer) {
    return {
      message: "No pending draw offer found to claim",
      action: "not_allowed",
    };
  }

  // Validate game is still active and clocks haven't expired
  const validation = await getAndValidateGameState(
    game_id,
    [
      "current_fen",
      "last_move_time",
      "black_player_left_time",
      "white_player_left_time",
      "game_state",
    ],
    "Draw can not be claimed, game is over!",
  );
  if (validation.error) return validation.error;

  // Fetch the full state (includes tournament fields) for termination
  const state = await fetchGameTerminationState(game_id);

  // terminateGame handles:
  //  - normal game  → rematch key + matchmaking cleanup
  //  - tournament   → schedule/active-game cleanup (no rematch key)
  await terminateGame(game_id, state, {
    newGameState: "DRAW",
    winnerId: null,
    status: "DRAW",
    extraCleanupKeys: [
      `game:draw:${game_id}:${userId}`,
      `matchmaking:streamId:${userId}`,
      `matchmaking:streamId:${opponentId}`,
      `presence:${userId}`,
      `presence:${opponentId}`,
    ],
  });

  return {
    game_state: "DRAW",
    white_player_id: state.whitePlayerId ?? "",
    black_player_id: state.blackPlayerId ?? "",
    player1_profile_image_url: state.player1ProfileImageUrl ?? "",
    player2_profile_image_url: state.player2ProfileImageUrl ?? "",
    player1_rating: state.player1Rating ?? "",
    player2_rating: state.player2Rating ?? "",
    player1_username: state.player1Username ?? "",
    player2_username: state.player2Username ?? "",
    player1_id: state.player1Id ?? "",
    player2_id: state.player2Id ?? "",
  };
}

export async function declineOfferDraw(
  userId: string,
  game_id: string,
  opponentId: string,
): Promise<DeclineDrawResponse> {
  const hasDrawOffer = await redisClient.exists(
    `game:draw:${game_id}:${userId}`,
  );
  if (hasDrawOffer) {
    await redisClient.del(`game:draw:${game_id}:${userId}`);
    return { message: "Draw offer is declined", opponentId: opponentId! };
  } else {
    return { message: "request not found" };
  }
}

// Looks up a draw offer that's still pending for this user — used so a user
// who reconnects mid-offer (e.g. page refresh) gets the popup again instead
// of losing track of it, since they must accept or decline before continuing.
export async function getPendingDrawOffer(
  userId: string,
  game_id: string,
): Promise<OfferDrawPayload | null> {
  const hasDrawOffer = await redisClient.exists(
    `game:draw:${game_id}:${userId}`,
  );
  if (!hasDrawOffer) return null;

  const stored = await redisClient.hGet(
    `game:draw:${game_id}:${userId}`,
    "payload",
  );
  if (!stored) return null;

  return JSON.parse(stored) as OfferDrawPayload;
}
