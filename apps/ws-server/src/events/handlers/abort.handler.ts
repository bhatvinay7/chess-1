import { Socket, Server } from "socket.io";
import {
  fetchGameTerminationState,
  terminateGame,
  buildTerminationData,
} from "../../utils/gameTermination.js";
import { buildGameStatePayload } from "../../shared/game-state.js";
import { userSocketMap } from "../../shared/socket-store.js";

export class AbortHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  public register() {
    this.socket.on(
      "abort_game",
      ({ gameId, userId }: { gameId: string; userId: string }) =>
        this.onAbort(userId, gameId),
    );
  }

  private async onAbort(userId: string, gameId: string): Promise<void> {
    try {
      const state = await fetchGameTerminationState(gameId);

      // 1. Verify game is active
      const isActive =
        state.gameState === "IN_PROGRESS" || state.gameState === "INITIALIZED";
      if (!isActive) {
        console.warn(
          `[abort] Game ${gameId} not active (status: ${state.gameState})`,
        );
        return;
      }

      // 2. Verify caller is a player
      if (userId !== state.whitePlayerId && userId !== state.blackPlayerId) {
        console.warn(
          `[abort] User ${userId} is not a player in game ${gameId}`,
        );
        return;
      }

      // 3. Verify abort window (time used <= 6s)
      const baseTimeMin = parseInt(state.timeSlot?.split("+")[0] ?? "10", 10);
      const baseTimeSec = baseTimeMin * 60;
      const whiteLeft = parseInt(
        state.whiteLeftTime ?? String(baseTimeSec),
        10,
      );
      const blackLeft = parseInt(
        state.blackLeftTime ?? String(baseTimeSec),
        10,
      );

      // Time used by each player
      const whiteUsed = Math.max(0, baseTimeSec - whiteLeft);
      const blackUsed = Math.max(0, baseTimeSec - blackLeft);

      if (whiteUsed + blackUsed > 6) {
        console.warn(
          `[abort] Game ${gameId} elapsed time > 6s, cannot abort. w=${whiteUsed} b=${blackUsed}`,
        );
        this.socket.emit("abort_failed", {
          message:
            "Cannot abort game after 6 seconds of clock time have elapsed.",
        });
        return;
      }

      // 4. Terminate the game with ABORTED state
      await terminateGame(gameId, state, {
        newGameState: "ABORTED",
        winnerId: null,
        status: "ABORTED",
      });

      // 5. Notify clients via normal socket payload format
      const payload = buildGameStatePayload(
        gameId,
        buildTerminationData(state, "ABORTED", null) as any,
      );
      this.io.to(`game:${gameId}`).emit("game_state", payload);

      // Also emit directly to ensure delivery if not joined to room yet
      if (state.player1Id)
        userSocketMap.get(state.player1Id)?.emit("game_state", payload);
      if (state.player2Id)
        userSocketMap.get(state.player2Id)?.emit("game_state", payload);

      console.log(`[abort] Game ${gameId} successfully aborted by ${userId}`);
    } catch (err) {
      console.error(`[abort] Error for game ${gameId} user ${userId}:`, err);
    }
  }
}
