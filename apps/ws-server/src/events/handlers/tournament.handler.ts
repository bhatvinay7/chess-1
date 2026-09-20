import { Server, Socket } from "socket.io";
import { redisClient } from "@repo/redis-client";
import { getActiveGameId } from "../../shared/game-state.js";

/**
 * Socket handler for tournament:view events.
 *
 * Decision at connect time:
 *   Live   (latest round state exists in Redis) → serve all data from Redis in parallel
 *                                                  and emit  "tournament:live_data"
 *   Completed (Redis state cleared by sync-worker) → emit "tournament:use_api"
 *                                                     so the client calls
 *                                                     GET /tournaments/:id/dashboard
 *
 * Redis fan-out (live path):
 *   Tick 1 — rounds ZSET + player's active game pointer       (2 keys, parallel)
 *   Tick 2 — group ZSETs for every round + game:state hash    (parallel)
 *   Tick 3 — group:state HASHes + round:state HASHes          (parallel)
 *
 * No DB queries on the live path.
 */
export class TournamentHandler {
  constructor(
    private io: Server,
    private socket: Socket,
  ) {}

  register(): void {
    this.socket.on(
      "tournament:view",
      ({ tournamentId, userId }: { tournamentId: string; userId?: string }) =>
        this.onTournamentView(tournamentId, userId),
    );
  }

  private async onTournamentView(
    tournamentId: string,
    userId?: string,
  ): Promise<void> {
    try {
      // ── Tick 1: rounds index + player's active game pointer ──────────────────
      const [roundEntries, activeGameId] = await Promise.all([
        redisClient.zRangeWithScores(
          `tournament:${tournamentId}:rounds`,
          0,
          -1,
        ),
        userId ? getActiveGameId(userId) : Promise.resolve(null),
      ]);

      if (roundEntries.length === 0) {
        // Tournament not started yet or no rounds indexed.
        this.socket.emit("tournament:use_api", {
          tournamentId,
          reason: "no_rounds",
        });
        return;
      }

      const latestRound = roundEntries.at(-1)!;
      const latestRoundId = latestRound.value;

      // ── Tick 2: check liveness + fetch group indices + game state in parallel ─
      // If round:state is empty, sync-worker has cleared it → tournament completed.
      const [liveCheck, gameFields, ...groupEntriesPerRound] =
        await Promise.all([
          redisClient.hLen(`tournament:round:${latestRoundId}:state`),
          activeGameId
            ? redisClient.hGetAll(`game:state:${activeGameId}`)
            : Promise.resolve<Record<string, string>>({}),
          ...roundEntries.map(({ value: roundId }) =>
            redisClient.zRangeWithScores(
              `tournament:${tournamentId}:round:${roundId}:groups`,
              0,
              -1,
            ),
          ),
        ]);

      const isLive = liveCheck > 0;

      if (!isLive) {
        // Completed tournament — Redis state is cleared.
        // Tell the client to use the HTTP dashboard endpoint instead.
        this.socket.emit("tournament:use_api", {
          tournamentId,
          reason: "completed",
        });
        return;
      }

      // ── Tick 3: fetch all group:state + round:state HASHes in parallel ────────
      const allGroupIds = groupEntriesPerRound.flat().map((e) => e.value);
      const allRoundIds = roundEntries.map((e) => e.value);

      const [groupStateMaps, roundStateMaps] = await Promise.all([
        Promise.all(
          allGroupIds.map((gid) =>
            redisClient.hGetAll(`tournament:group:${gid}:state`),
          ),
        ),
        Promise.all(
          allRoundIds.map((rid) =>
            redisClient.hGetAll(`tournament:round:${rid}:state`),
          ),
        ),
      ]);

      // ── Build response ─────────────────────────────────────────────────────────
      let groupStateIdx = 0;
      const myPastGames: unknown[] = [];

      const rounds = roundEntries.map(
        ({ value: roundId, score: roundNumber }, rIdx) => {
          const groupEntries = groupEntriesPerRound[rIdx] ?? [];

          const groups = groupEntries.map(
            ({ value: groupId, score: groupNumber }) => {
              const stateMap = groupStateMaps[groupStateIdx++] ?? {};

              // Collect the current player's game entries across all groups
              if (userId && stateMap[userId]) {
                try {
                  const ps = JSON.parse(stateMap[userId]);
                  if (Array.isArray(ps.games)) myPastGames.push(...ps.games);
                } catch {
                  /* malformed — skip */
                }
              }

              const standings = Object.values(stateMap)
                .map((v) => {
                  try {
                    return JSON.parse(v);
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean)
                .sort((a: any, b: any) => b.score - a.score);

              return { groupId, groupNumber, standings };
            },
          );

          const roundStateMap = roundStateMaps[rIdx] ?? {};
          const roundStandings = Object.values(roundStateMap)
            .map((v) => {
              try {
                return JSON.parse(v);
              } catch {
                return null;
              }
            })
            .filter(Boolean)
            .sort((a: any, b: any) => b.groupScore - a.groupScore);

          return { roundId, roundNumber, groups, roundStandings };
        },
      );

      // My live game (verify it belongs to this tournament)
      let myLiveGame: (Record<string, string> & { gameId: string }) | null =
        null;
      if (
        activeGameId &&
        Object.keys(gameFields).length > 0 &&
        gameFields.tournament_id === tournamentId
      ) {
        myLiveGame = { gameId: activeGameId, ...gameFields };
      }

      this.socket.emit("tournament:live_data", {
        tournamentId,
        isLive: true,
        rounds,
        myLiveGame,
        myPastGames,
      });
    } catch (err) {
      console.error(
        `[tournament:view] Error for tournament ${tournamentId}:`,
        err,
      );
      this.socket.emit("tournament:error", {
        tournamentId,
        message: "Failed to fetch tournament data",
      });
    }
  }
}
