import { Server, Socket } from "socket.io";
import { PubSub } from "@repo/redis-client";
import {
  claimDraw,
  offerDraw,
  declineOfferDraw,
  getPendingDrawOffer,
} from "../../utils/drawValidator.js";
import { getActiveGameId } from "../../shared/game-state.js";
import type {
  OfferDrawRequest,
  ClaimDrawRequest,
  DeclineDrawRequest,
  CheckDrawOfferRequest,
  OfferDrawSuccessResponse,
} from "@repo/socket-types";
import { userSocketMap } from "../../shared/socket-store.js";

export class DrawHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  register(): void {
    this.socket.on("offer-draw", (payload: OfferDrawRequest) =>
      this.onOfferDraw(payload),
    );

    this.socket.on("claim-draw", (payload: ClaimDrawRequest) =>
      this.onClaimDraw(payload),
    );

    this.socket.on("decline-draw", (payload: DeclineDrawRequest) =>
      this.onDeclineDraw(payload),
    );

    this.socket.on("check_draw_offer", (payload: CheckDrawOfferRequest) =>
      this.onCheckDrawOffer(payload),
    );
  }

  private async onOfferDraw(payload: OfferDrawRequest): Promise<void> {
    const gameId = await getActiveGameId(payload.userId);
    if (!gameId) return;

    const response = await offerDraw(
      gameId,
      payload.userId,
      payload.opponentId,
    );
    if (response.action === "allowed") {
      await PubSub.publish(`offer-draw:${gameId}`, JSON.stringify(response));
    } else {
      this.socket.emit("error", { message: response.message });
    }
  }

  private async onClaimDraw(payload: ClaimDrawRequest): Promise<void> {
    const gameId = await getActiveGameId(payload.userId);
    if (!gameId) return;

    try {
      const response = await claimDraw(
        payload.userId,
        gameId,
        payload.opponentId,
      );
      if ("action" in response && response.action === "not_allowed") {
        this.socket.emit("error", { message: response.message });
        return;
      }
      await PubSub.publish(`accept-draw:${gameId}`, JSON.stringify(response));
    } catch {
      userSocketMap.get(payload.userId)?.emit("error", {
        message: "Not able to process your request, please try again",
      });
    }
  }

  private async onDeclineDraw(payload: DeclineDrawRequest): Promise<void> {
    const gameId = await getActiveGameId(payload.userId);
    if (!gameId) return;

    const response = await declineOfferDraw(
      payload.userId,
      gameId,
      payload.opponentId,
    );
    await PubSub.publish(`decline-draw:${gameId}`, JSON.stringify(response));
  }

  private async onCheckDrawOffer(
    payload: CheckDrawOfferRequest,
  ): Promise<void> {
    const gameId = await getActiveGameId(payload.userId);
    if (!gameId) return;

    const pendingOffer = await getPendingDrawOffer(payload.userId, gameId);
    if (pendingOffer) {
      const response: OfferDrawSuccessResponse = {
        payload: pendingOffer,
        action: "allowed",
      };
      this.socket.emit("draw-request", response);
    }
  }
}
