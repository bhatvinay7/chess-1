/**
 * Tournament dashboard service.
 *
 * Single source of truth for: myGame · groupStandings · leaderboard · currentRound
 * for the authenticated player in a given tournament.
 *
 * Case 1 — live (any round still IN_PROGRESS):
 *   All four data sets come from Redis in two parallel fan-outs.
 *   No extra DB reads beyond the single status check already done by the controller.
 *
 * Case 2 — completed (all rounds COMPLETED):
 *   Data is built from the DB then cached in Redis for 5 minutes.
 *   Subsequent requests within the TTL window are served from cache.
 *
 * Both cases return the same TournamentDashboard shape.
 */

import { prisma } from "@repo/postgres-db";
import { redisClient } from "@repo/redis-client";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLETED_TTL_SEC = 300; // 5 minutes

// ─── Public types (shared with controller / frontend) ─────────────────────────

export interface GameEntry {
  gameId: string;
  opponentId: string | null;
  opponentUsername: string;
  result: "WIN" | "LOSS" | "DRAW" | "ABANDONED" | "PENDING";
  color: "WHITE" | "BLACK";
  gameState: string;
}

export interface PlayerStanding {
  playerId: string;
  username: string;
  profileImageUrl?: string | null;
  score: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  games: GameEntry[];
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  profileImageUrl?: string | null;
  groupId: string;
  groupRank: number;
  groupScore: number;
}

export interface MyGame {
  gameId: string;
  gameState: string;
  myColor: "WHITE" | "BLACK";
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;
  blackUsername: string;
  whiteRating: number;
  blackRating: number;
  scheduledStartMs: number;
  timeSlot: string;
  increment: number;
  roundId: string;
  groupId: string;
}

export interface TournamentDashboard {
  tournamentId: string;
  isLive: boolean;
  myGame: MyGame | null;
  currentRound: {
    roundId: string;
    roundNumber: number;
    status: string;
    myGroupId: string | null;
  } | null;
  groupStandings: PlayerStanding[];
  leaderboard: LeaderboardEntry[];
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function getTournamentDashboard(
  tournamentId: string,
  userId: string,
): Promise<TournamentDashboard | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (!tournament) return null;

  return tournament.status === "COMPLETED"
    ? fetchCompletedDashboard(tournamentId, userId)
    : fetchLiveDashboard(tournamentId, userId);
}

// ─── Case 1: Live — Redis pipeline ────────────────────────────────────────────
//
// Fan-out 1: gameId + rounds ZSET          (2 keys, parallel)
// Fan-out 2: game:state + round:state[uid] (2 keys, parallel, keyed from fan-out 1)
// Fan-out 3: group:state + round:state     (2 HGETALL, parallel, keyed from fan-out 2)
//
// Total: 3 async ticks, each tick runs all keys in parallel.
// One extra DB scalar (round status) that isn't stored in Redis.

async function fetchLiveDashboard(
  tournamentId: string,
  userId: string,
): Promise<TournamentDashboard> {
  // ── Fan-out 1 ──────────────────────────────────────────────────────────────
  const nowMs = Date.now();
  const [activeGamesRaw, roundsRaw] = await Promise.all([
    redisClient.zRange(`user:active:games:${userId}`, nowMs, 0, { BY: "SCORE", REV: true, LIMIT: { offset: 0, count: 1 } }),
    redisClient.zRangeWithScores(`tournament:${tournamentId}:rounds`, 0, -1),
  ]);

  const gameId = activeGamesRaw.length > 0 ? activeGamesRaw[0] : null;

  // Highest score in the ZSET = latest round
  const latestRound = roundsRaw.at(-1);
  const roundId = latestRound?.value ?? null;
  const roundNumber = latestRound ? Math.round(latestRound.score) : 0;

  // ── Fan-out 2 ──────────────────────────────────────────────────────────────
  const [gameFields, playerRoundStateRaw, roundStatusRow] = await Promise.all([
    gameId ? redisClient.hGetAll(`game:state:${gameId}`) : Promise.resolve<Record<string, string>>({}),
    roundId ? redisClient.hGet(`tournament:round:${roundId}:state`, userId) : Promise.resolve(null),
    // One DB read for round status — not stored in Redis
    roundId
      ? prisma.round.findUnique({ where: { id: roundId }, select: { status: true } })
      : Promise.resolve(null),
  ]);

  // Derive groupId: round state is authoritative; fall back to game:state hash
  const playerRoundState: LeaderboardEntry | null = playerRoundStateRaw
    ? JSON.parse(playerRoundStateRaw)
    : null;

  const groupId: string | null =
    playerRoundState?.groupId ??
    gameFields?.group_id ??
    null;

  // ── Fan-out 3 ──────────────────────────────────────────────────────────────
  const [groupStateRaw, roundStateRaw] = await Promise.all([
    groupId ? redisClient.hGetAll(`tournament:group:${groupId}:state`) : Promise.resolve<Record<string, string>>({}),
    roundId ? redisClient.hGetAll(`tournament:round:${roundId}:state`) : Promise.resolve<Record<string, string>>({}),
  ]);

  const groupStandings: PlayerStanding[] = Object.values(groupStateRaw)
    .map((v) => JSON.parse(v) as PlayerStanding)
    .sort((a, b) => b.score - a.score);

  const leaderboard: LeaderboardEntry[] = Object.values(roundStateRaw)
    .map((v) => JSON.parse(v) as LeaderboardEntry)
    .sort((a, b) => b.groupScore - a.groupScore);

  return {
    tournamentId,
    isLive: true,
    myGame: buildMyGameFromRedis(gameId!, gameFields, userId),
    currentRound: roundId
      ? { roundId, roundNumber, status: roundStatusRow?.status ?? "IN_PROGRESS", myGroupId: groupId }
      : null,
    groupStandings,
    leaderboard,
  };
}

// ─── Case 2: Completed — DB with 5-min cache ──────────────────────────────────

async function fetchCompletedDashboard(
  tournamentId: string,
  userId: string,
): Promise<TournamentDashboard> {
  const cacheKey = `cache:tournament:${tournamentId}:player:${userId}:dashboard`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis unavailable — fall through to DB */ }

  const dashboard = await buildDashboardFromDb(tournamentId, userId);

  try {
    await redisClient.set(cacheKey, JSON.stringify(dashboard), { EX: COMPLETED_TTL_SEC });
  } catch { /* ignore cache write failure */ }

  return dashboard;
}

// ─── DB builder ───────────────────────────────────────────────────────────────

async function buildDashboardFromDb(
  tournamentId: string,
  userId: string,
): Promise<TournamentDashboard> {
  // Three independent queries in parallel
  const [lastRoundRow, myLastGame, participants] = await Promise.all([
    prisma.round.findFirst({
      where: { tournamentId },
      orderBy: { roundNumber: "desc" },
      select: { id: true, roundNumber: true, status: true },
    }),
    prisma.game.findFirst({
      where: {
        tournamentId,
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        whitePlayer: { select: { id: true, username: true, profileImageUrl: true } },
        blackPlayer: { select: { id: true, username: true, profileImageUrl: true } },
      },
    }),
    prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        player: { select: { id: true, username: true, profileImageUrl: true } },
        stats: true,
      },
    }),
  ]);

  // Find the player's group in the last round (needs lastRound + myLastGame)
  let myGroupId: string | null = null;
  if (lastRoundRow && myLastGame) {
    const match = await prisma.match.findFirst({
      where: { gameId: myLastGame.id, roundId: lastRoundRow.id },
      select: { groupId: true },
    });
    myGroupId = match?.groupId ?? null;
  }

  // Fetch group standings if we know the group
  let groupStandings: PlayerStanding[] = [];
  if (myGroupId) {
    const groupMatches = await prisma.match.findMany({
      where: { groupId: myGroupId },
      include: {
        game: {
          include: {
            whitePlayer: { select: { id: true, username: true, profileImageUrl: true } },
            blackPlayer: { select: { id: true, username: true, profileImageUrl: true } },
          },
        },
      },
    });
    groupStandings = buildGroupStandingsFromDb(groupMatches);
  }

  // Leaderboard from TournamentPlayerStats (tournament-wide)
  type ParticipantRow = (typeof participants)[number];
  const leaderboard: LeaderboardEntry[] = participants
    .filter((p: ParticipantRow) => p.stats !== null)
    .map((p: ParticipantRow) => ({
      playerId: p.playerId,
      username: p.player.username,
      profileImageUrl: p.player.profileImageUrl,
      groupId: "",
      groupRank: 0,
      groupScore: p.stats!.score,
    }))
    .sort((a: { groupScore: number }, b: { groupScore: number }) => b.groupScore - a.groupScore)
    .map((e: Omit<LeaderboardEntry, 'groupRank'> & { groupRank: number }, i: number) => ({ ...e, groupRank: i + 1 }));

  const myGame: MyGame | null = myLastGame
    ? {
      gameId: myLastGame.id,
      gameState: myLastGame.status,
      myColor: myLastGame.whitePlayerId === userId ? "WHITE" : "BLACK",
      whitePlayerId: myLastGame.whitePlayerId,
      blackPlayerId: myLastGame.blackPlayerId ?? "",
      whiteUsername: myLastGame.whitePlayer.username,
      blackUsername: myLastGame.blackPlayer?.username ?? "",
      whiteRating: myLastGame.whiteRating ?? 0,
      blackRating: myLastGame.blackRating ?? 0,
      scheduledStartMs: myLastGame.startedAt?.getTime() ?? 0,
      timeSlot: myLastGame.timeControl,
      increment: 0,
      roundId: lastRoundRow?.id ?? "",
      groupId: myGroupId ?? "",
    }
    : null;

  return {
    tournamentId,
    isLive: false,
    myGame,
    currentRound: lastRoundRow
      ? { roundId: lastRoundRow.id, roundNumber: lastRoundRow.roundNumber, status: lastRoundRow.status, myGroupId }
      : null,
    groupStandings,
    leaderboard,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMyGameFromRedis(
  gameId: string | null,
  fields: Record<string, string>,
  userId: string,
): MyGame | null {
  if (!gameId || !fields.game_state) return null;

  return {
    gameId,
    gameState: fields.game_state,
    myColor: fields.white_player_id === userId ? "WHITE" : "BLACK",
    whitePlayerId: fields.white_player_id ?? "",
    blackPlayerId: fields.black_player_id ?? "",
    whiteUsername: fields.player1_username ?? "",
    blackUsername: fields.player2_username ?? "",
    whiteRating: Number(fields.player1_rating ?? 0),
    blackRating: Number(fields.player2_rating ?? 0),
    scheduledStartMs: Number(fields.left_game_start_time ?? 0),
    timeSlot: fields.time_slot ?? "",
    increment: Number(fields.increment ?? 0),
    roundId: fields.round_id ?? "",
    groupId: fields.group_id ?? "",
  };
}

function buildGroupStandingsFromDb(matches: any[]): PlayerStanding[] {
  const map = new Map<string, PlayerStanding>();

  const ensure = (
    id: string,
    username: string,
    profileImageUrl?: string | null,
  ): PlayerStanding => {
    if (!map.has(id)) {
      map.set(id, { playerId: id, username, profileImageUrl, score: 0, wins: 0, draws: 0, losses: 0, byes: 0, games: [] });
    }
    return map.get(id)!;
  };

  const resultLabel = (status: string, isWhite: boolean): GameEntry["result"] => {
    if (status === "WHITE_WIN") return isWhite ? "WIN" : "LOSS";
    if (status === "BLACK_WIN") return isWhite ? "LOSS" : "WIN";
    if (status === "DRAW") return "DRAW";
    if (status === "ABANDONED") return "ABANDONED";
    return "PENDING";
  };

  for (const m of matches) {
    const { game } = m;
    if (!game.whitePlayer || !game.blackPlayer) continue;

    const wp = ensure(game.whitePlayer.id, game.whitePlayer.username, game.whitePlayer.profileImageUrl);
    const bp = ensure(game.blackPlayer.id, game.blackPlayer.username, game.blackPlayer.profileImageUrl);

    if (game.status === "WHITE_WIN") { wp.wins++; bp.losses++; }
    else if (game.status === "BLACK_WIN") { bp.wins++; wp.losses++; }
    else if (game.status === "DRAW") { wp.draws++; bp.draws++; }

    wp.score = wp.wins + wp.draws * 0.5;
    bp.score = bp.wins + bp.draws * 0.5;

    wp.games.push({ gameId: game.id, opponentId: game.blackPlayer.id, opponentUsername: game.blackPlayer.username, result: resultLabel(game.status, true), color: "WHITE", gameState: game.status });
    bp.games.push({ gameId: game.id, opponentId: game.whitePlayer.id, opponentUsername: game.whitePlayer.username, result: resultLabel(game.status, false), color: "BLACK", gameState: game.status });
  }

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}
