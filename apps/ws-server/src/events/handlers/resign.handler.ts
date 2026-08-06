import { Server, Socket } from "socket.io";
import { fetchGameTerminationState, terminateGame, buildTerminationData } from "../../utils/gameTermination.js";
import { buildGameStatePayload } from "../../shared/game-state.js";
import { userSocketMap } from "../../shared/socket-store.js";

export class ResignHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  register(): void {
    this.socket.on(
      "resign",
      ({ userId, gameId }: { userId: string; gameId: string }) =>
        this.onResign(userId, gameId),
    );
  }

  private async onResign(userId: string, gameId: string): Promise<void> {
    try {
      const state = await fetchGameTerminationState(gameId);

      if (state.gameState !== "IN_PROGRESS" && state.gameState !== "INITIALIZED") return;

      const winnerId = userId === state.whitePlayerId ? state.blackPlayerId : state.whitePlayerId;
      const status: "WHITE_WIN" | "BLACK_WIN" =
        userId === state.whitePlayerId ? "BLACK_WIN" : "WHITE_WIN";

      await terminateGame(gameId, state, { newGameState: "RESIGN", winnerId, status });

      const payload = buildGameStatePayload(
        gameId, buildTerminationData(state, "RESIGN", winnerId),
      );
      if (state.player1Id) userSocketMap.get(state.player1Id)?.emit("game_state", payload);
      if (state.player2Id) userSocketMap.get(state.player2Id)?.emit("game_state", payload);
    } catch (err) {
      console.error(`[resign] Error for game ${gameId} user ${userId}:`, err);
    }
  }
}
