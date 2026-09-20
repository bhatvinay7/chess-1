import { SpectateHandler } from "../../src/events/handlers/spectate.handler.js";
import { createMockIo, createMockSocket } from "../setup.js";
import { Server, Socket } from "socket.io";
import {
  handleWatchGame,
  handleLeaveSpectate,
  syncSpectateTime,
} from "../../src/utils/spectateHandler.js";
import {
  spectatorGameMap,
  socketSpectatingMap,
} from "../../src/shared/socket-store.js";
import { redisClient } from "@repo/redis-client";
import type { ChessMoveServiceClient } from "@repo/grpc-connection";

jest.mock("../../src/utils/spectateHandler.js");

describe("SpectateHandler", () => {
  let io: Server;
  let socket: Socket;
  let handler: SpectateHandler;
  let mockGrpcClient: ChessMoveServiceClient;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    mockGrpcClient = {} as ChessMoveServiceClient;

    handler = new SpectateHandler(io, socket, mockGrpcClient);
    handler.register();
  });

  it("should handle watch_game", async () => {
    const watchCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "watch_game",
    );
    expect(watchCall).toBeDefined();
    const watchCb = watchCall[1];

    await watchCb({ gameId: "game_1" });

    expect(handleWatchGame).toHaveBeenCalledWith(
      socket,
      "game_1",
      spectatorGameMap,
      socketSpectatingMap,
      mockGrpcClient,
    );
  });

  it("should handle leave_spectate", async () => {
    const leaveCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "leave_spectate",
    );
    expect(leaveCall).toBeDefined();
    const leaveCb = leaveCall[1];

    await leaveCb({ gameId: "game_1" });

    expect(handleLeaveSpectate).toHaveBeenCalledWith(
      socket.id,
      "game_1",
      spectatorGameMap,
      socketSpectatingMap,
    );
  });

  it("should handle get_live_games and emit empty array if none found", async () => {
    const getLiveCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "get_live_games",
    );
    expect(getLiveCall).toBeDefined();
    const getLiveCb = getLiveCall[1];

    (redisClient.zRange as jest.Mock).mockResolvedValue([]);
    (redisClient.hGetAll as jest.Mock).mockResolvedValue({});

    await getLiveCb();

    expect(socket.emit).toHaveBeenCalledWith("live_games_list", { games: [] });
  });

  it("should handle get_live_games and emit game list", async () => {
    const getLiveCall = (socket.on as jest.Mock).mock.calls.find(
      (call: any[]) => call[0] === "get_live_games",
    );
    const getLiveCb = getLiveCall[1];

    (redisClient.zRange as jest.Mock).mockResolvedValue(["game_1"]);
    (redisClient.hGetAll as jest.Mock).mockResolvedValue({ game_1: "5" });

    (syncSpectateTime as jest.Mock).mockResolvedValue({
      current_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      game_state: "IN_PROGRESS",
      player1_username: "Player1",
      player2_username: "Player2",
    });

    await getLiveCb();

    expect(socket.emit).toHaveBeenCalledWith("live_games_list", {
      games: [
        expect.objectContaining({
          gameId: "game_1",
          gameState: "IN_PROGRESS",
          spectatorCount: 5,
        }),
      ],
    });
  });
});
