import { Server, Socket } from "socket.io";
import { PubSub } from "@repo/redis-client";
import {
  requestRematch, declineRematchRequest, exceptRematch, checkPendingRematchRequest,
} from "../../utils/rematchHandle.js";
import type { RematchRequestPayload, CheckRematchRequest } from "@repo/socket-types";
import { userSocketMap } from "../../shared/socket-store.js";

export class RematchHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  register(): void {
    this.socket.on("rematch-request", (payload: RematchRequestPayload) =>
      this.onRematchRequest(payload));

    this.socket.on("check-rematch-request", (payload: CheckRematchRequest) =>
      this.onCheckRematch(payload));

    this.socket.on("accept-rematch", (payload: RematchRequestPayload) =>
      this.onAcceptRematch(payload));

    this.socket.on("decline-rematch-request", (payload: RematchRequestPayload) =>
      this.onDeclineRematch(payload));
  }

  private async onRematchRequest(payload: RematchRequestPayload): Promise<void> {
    const response = await requestRematch(payload);
    if (response) {
      await PubSub.publish(`rematch-request:${payload.opponentId}`, JSON.stringify(response));
    }
  }

  private async onCheckRematch(payload: CheckRematchRequest): Promise<void> {
    const pending = await checkPendingRematchRequest(payload.userId);
    if (pending) {
      userSocketMap.get(payload.userId)?.emit("rematch-request", pending);
    }
  }

  private async onAcceptRematch(payload: RematchRequestPayload): Promise<void> {
    await exceptRematch(payload);
  }

  private async onDeclineRematch(payload: RematchRequestPayload): Promise<void> {
    await declineRematchRequest(payload);
  }
}
