import { RematchHandler } from "../../src/events/handlers/rematch.handler.js";
import { createMockIo, createMockSocket } from "../setup.js";
import { PubSub } from "@repo/redis-client";
import { Server, Socket } from "socket.io";
import { getActiveGameId } from "../../src/shared/game-state.js";
import {
  requestRematch,
  exceptRematch,
  declineRematchRequest,
  checkPendingRematchRequest,
} from "../../src/utils/rematchHandle.js";

jest.mock("../../src/shared/game-state.js");
jest.mock("../../src/utils/rematchHandle.js");

describe("RematchHandler", () => {
  let io: Server;
  let socket: Socket;
  let handler: RematchHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    handler = new RematchHandler(io, socket);
    handler.register();
  });

  it("should handle rematch-request", async () => {
    const rematchCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "rematch-request",
    );
    expect(rematchCall).toBeDefined();
    const rematchCb = rematchCall[1];

    (requestRematch as jest.Mock).mockResolvedValue({ action: "allowed" });

    await rematchCb({ userId: "user_a", opponentId: "user_b" });

    expect(requestRematch).toHaveBeenCalledWith({
      userId: "user_a",
      opponentId: "user_b",
    });
    expect(PubSub.publish).toHaveBeenCalledWith(
      "rematch-request:user_b",
      JSON.stringify({ action: "allowed" }),
    );
  });

  it("should handle accept-rematch", async () => {
    const acceptCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "accept-rematch",
    );
    expect(acceptCall).toBeDefined();
    const acceptCb = acceptCall[1];

    (exceptRematch as jest.Mock).mockResolvedValue({ action: "allowed" });

    await acceptCb({ userId: "user_a", gameId: "game_1" });

    expect(exceptRematch).toHaveBeenCalledWith({
      userId: "user_a",
      gameId: "game_1",
    });
  });

  it("should handle decline-rematch-request", async () => {
    const declineCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "decline-rematch-request",
    );
    expect(declineCall).toBeDefined();
    const declineCb = declineCall[1];

    (declineRematchRequest as jest.Mock).mockResolvedValue({
      action: "declined",
    });

    await declineCb({ userId: "user_a", gameId: "game_1" });

    expect(declineRematchRequest).toHaveBeenCalledWith({
      userId: "user_a",
      gameId: "game_1",
    });
  });

  it("should handle check-rematch-request", async () => {
    const checkCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "check-rematch-request",
    );
    expect(checkCall).toBeDefined();
    const checkCb = checkCall[1];

    (checkPendingRematchRequest as jest.Mock).mockResolvedValue({
      status: "pending",
    });

    // We also need to mock userSocketMap because the handler uses it
    const mockUserSocket = { emit: jest.fn() };
    const { userSocketMap } = require("../../src/shared/socket-store.js");
    userSocketMap.set("user_a", mockUserSocket);

    await checkCb({ userId: "user_a" });

    expect(checkPendingRematchRequest).toHaveBeenCalledWith("user_a");
    expect(mockUserSocket.emit).toHaveBeenCalledWith("rematch-request", {
      status: "pending",
    });
  });
});
