import { prisma } from '@repo/postgres-db';
import { Request, Response } from 'express';
import { verifyToken } from '../../utils/middleware.commonfie.js';
import { redisClient } from '@repo/redis-client';
import { getTournamentDashboard } from '../../services/tournamentDashboard.js';

function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7)).userId;
  } catch {
    return null;
  }
}

const TOURNAMENT_INCLUDE = {
  creator: { select: { id: true, username: true, profileImageUrl: true } },
  timeManagement: true,
  timeControl: { select: { id: true, displayName: true, category: true } },
  _count: { select: { participants: true } },
} as const;

function formatTournament(t: any, userId?: string | null) {
  const userParticipant = t.participants?.find((p: any) => p.playerId === userId);
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    tournamentType: t.tournamentType,
    status: t.status,
    accessType: t.accessType,
    visibility: t.visibility,
    gameType: t.gameType,
    isRated: t.isRated,
    inviteOnly: t.inviteOnly,
    premiumOnly: t.premiumOnly,
    requiresApproval: t.requiresApproval,
    minPlayers: t.minPlayers,
    maxPlayers: t.maxPlayers,
    minRating: t.minRating,
    maxRating: t.maxRating,
    participantCount: t._count?.participants ?? t.participants?.length ?? 0,
    timeManagement: t.timeManagement,
    creator: t.creator,
    timeControl: t.timeControl
      ? { id: t.timeControl.id, label: t.timeControl.displayName, value: t.timeControl.displayName, category: t.timeControl.category }
      : null,
    userRole: userParticipant?.role ?? null,
    clubId: t.clubId,
  };
}

export async function listTournaments(req: Request, res: Response) {
  const userId = getUserId(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
  const status = req.query.status as string | undefined;
  const statuses = req.query.statuses as string | undefined;
  const type = req.query.type as string | undefined;
  const accessType = req.query.accessType as string | undefined;

  // Parse requested statuses (comma-separated) or single status
  const statusList: string[] = statuses
    ? statuses.split(',').map((s) => s.trim()).filter(Boolean)
    : status
      ? [status]
      : [];

  // For ended tournaments (COMPLETED / CANCELLED) we don't require timeManagement —
  // old records may lack it, and the frontend null-guards it already.
  const endedStatuses = new Set(["COMPLETED", "CANCELLED"]);
  const allEnded = statusList.length > 0 && statusList.every((s) => endedStatuses.has(s));

  try {
    const where: any = { deletedAt: null };

    // Only enforce timeManagement for active/upcoming tournaments so the sort is stable.
    // Ended tournaments are shown regardless of whether timeManagement exists.
    if (!allEnded) {
      where.timeManagement = { isNot: null };
    }

    if (statusList.length > 1) {
      where.status = { in: statusList };
    } else if (statusList.length === 1) {
      where.status = statusList[0];
    }
    if (type) where.tournamentType = type;
    if (accessType) where.accessType = accessType;

    if (!userId) {
      where.visibility = 'PUBLIC';
    } else {
      const userClubs = await prisma.clubMember.findMany({
        where: { userId },
        select: { clubId: true },
      });
      const clubIds = userClubs.map((c: { clubId: string }) => c.clubId);

      where.OR = [
        { visibility: 'PUBLIC' },
        { creatorId: userId },
        { participants: { some: { playerId: userId } } },
        ...(clubIds.length > 0 ? [{ visibility: 'CLUB_ONLY', clubId: { in: clubIds } }] : []),
      ];
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          ...TOURNAMENT_INCLUDE,
          participants: userId
            ? { where: { playerId: userId }, select: { playerId: true, role: true } }
            : false,
        },
        orderBy: allEnded
          ? [{ createdAt: 'desc' }]
          : [{ timeManagement: { startTime: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tournament.count({ where }),
    ]);

    return res.json({
      success: true,
      data: tournaments.map((t: Parameters<typeof formatTournament>[0]) => formatTournament(t, userId)),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tournaments.' });
  }
}

export async function getMyTournaments(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const tournaments = await prisma.tournament.findMany({
      where: {
        deletedAt: null,
        OR: [
          { creatorId: userId },
          { participants: { some: { playerId: userId } } },
        ],
      },
      include: {
        ...TOURNAMENT_INCLUDE,
        participants: { where: { playerId: userId }, select: { playerId: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: tournaments.map((t: Parameters<typeof formatTournament>[0]) => formatTournament(t, userId)),
      total: tournaments.length,
      page: 1,
      pageSize: tournaments.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your tournaments.' });
  }
}

export async function getTournament(req: Request, res: Response) {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        ...TOURNAMENT_INCLUDE,
        participants: userId
          ? { where: { playerId: userId }, select: { playerId: true, role: true } }
          : false,
        swissSettings: true,
        arenaSettings: true,
        dailySettings: true,
      },
    });

    if (!tournament || tournament.deletedAt) {
      return res.status(404).json({ success: false, message: 'Tournament not found.' });
    }

    // Visibility check for CLUB_ONLY tournaments
    if (tournament.visibility === 'CLUB_ONLY' && tournament.clubId) {
      if (!userId) {
        return res.status(403).json({ success: false, message: 'This tournament is private to club members.' });
      }
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: tournament.clubId, userId } },
      });
      if (!membership) {
        return res.status(403).json({ success: false, message: 'This tournament is private to club members.' });
      }
    }

    const formatted = formatTournament(tournament, userId);
    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tournament.' });
  }
}

// GET /tournaments/:id/rounds
// Returns all rounds → groups → player matchups with per-game timing.
// Checks Redis for live game state (start time, status); falls back to DB values.
// For completed tournaments the result is cached in Redis (cache-aside).
export async function getTournamentRounds(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { status: true },
    });
    const isCompleted = tournament?.status === 'COMPLETED';
    const cacheKey = `cache:tournament:${id}:rounds`;

    if (isCompleted) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ success: true, data: JSON.parse(cached) });
        }
      } catch { /* Redis unavailable — fall through to DB */ }
    }

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id },
      orderBy: { roundNumber: 'asc' },
    });

    type RoundRow = (typeof rounds)[number];
    const data = await Promise.all(rounds.map(async (round: RoundRow) => {
      const groups = await prisma.tournamentGroup.findMany({
        where: { tournamentId: id, roundNumber: round.roundNumber },
        orderBy: { groupNumber: 'asc' },
      });

      type GroupRow = (typeof groups)[number];
      const groupsOut = await Promise.all(groups.map(async (grp: GroupRow) => {
        const matches = await prisma.match.findMany({
          where: { groupId: grp.id },
          include: {
            game: {
              include: {
                whitePlayer: { select: { id: true, username: true, profileImageUrl: true } },
                blackPlayer: { select: { id: true, username: true, profileImageUrl: true } },
              },
            },
          },
        });

        type MatchRow = (typeof matches)[number];
        const matchesOut = await Promise.all(matches.map(async (m: MatchRow) => {
          let scheduledStartMs: number | null = null;
          let liveState: string = m.game.status;

          if (!isCompleted) {
            try {
              const [startTime, gameState] = await redisClient.hmGet(
                `game:state:${m.gameId}`,
                ['left_game_start_time', 'game_state'],
              );
              if (startTime) scheduledStartMs = Number(startTime);
              if (gameState) liveState = gameState;
            } catch { /* Redis unavailable — use DB values */ }
          }

          return {
            matchId: m.id,
            gameId: m.gameId,
            scheduledStartMs,
            gameState: liveState,
            status: m.game.status,
            whitePlayer: m.game.whitePlayer
              ? { id: m.game.whitePlayer.id, username: m.game.whitePlayer.username, profileImageUrl: m.game.whitePlayer.profileImageUrl }
              : null,
            blackPlayer: m.game.blackPlayer
              ? { id: m.game.blackPlayer.id, username: m.game.blackPlayer.username, profileImageUrl: m.game.blackPlayer.profileImageUrl }
              : null,
            winnerId: m.game.winnerId ?? null,
          };
        }));

        const playerMap = new Map<string, { id: string; username: string; profileImageUrl?: string | null }>();
        type MatchOut = (typeof matchesOut)[number];
        matchesOut.forEach((m: MatchOut) => {
          if (m.whitePlayer) playerMap.set(m.whitePlayer.id, m.whitePlayer);
          if (m.blackPlayer) playerMap.set(m.blackPlayer.id, m.blackPlayer);
        });

        return {
          groupId: grp.id,
          groupNumber: grp.groupNumber,
          players: Array.from(playerMap.values()),
          matches: matchesOut,
        };
      }));

      return {
        roundId: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        groups: groupsOut,
      };
    }));

    const payload = { rounds: data };

    if (isCompleted) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 86400 });
      } catch { /* ignore */ }
    }

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('[getTournamentRounds]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tournament rounds.' });
  }
}

// GET /tournaments/:id/groups/:groupId/standings
// While the group is live: reads from tournament:group:{groupId}:state HASH (written by sync-worker).
// After the round is completed: cleared by sync-worker → falls back to API cache → then DB.
// GET /tournaments/:id/my-game
// Returns the authenticated user's current active/waiting game inside this tournament.
// Used by the "Play" button so the frontend can navigate without waiting for socket data.
export async function getMyCurrentGame(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { id: tournamentId } = req.params;

  try {
    const game = await prisma.game.findFirst({
      where: {
        tournamentId,
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: { in: ['WAITING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });

    return res.json({ success: true, gameId: game?.id ?? null });
  } catch (err) {
    console.error('[getMyCurrentGame]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch current game.' });
  }
}

export async function getGroupStandings(req: Request, res: Response) {
  const { id: tournamentId, groupId } = req.params;

  try {
    // Live path: Redis HASH populated by sync-worker after every game.
    try {
      const liveData = await redisClient.hGetAll(`tournament:group:${groupId}:state`);
      if (Object.keys(liveData).length > 0) {
        const standings = Object.values(liveData)
          .map((v) => JSON.parse(v))
          .sort((a, b) => b.score - a.score);
        return res.json({ success: true, source: 'live', data: standings });
      }
    } catch { /* Redis unavailable */ }

    // API cache: populated on first request after round completion.
    const cacheKey = `cache:tournament:${tournamentId}:group:${groupId}:standings`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
      }
    } catch { /* Redis unavailable */ }

    // DB fallback: compute standings from Match + Game rows.
    const matches = await prisma.match.findMany({
      where: { groupId },
      include: {
        game: {
          include: {
            whitePlayer: { select: { id: true, username: true, profileImageUrl: true } },
            blackPlayer: { select: { id: true, username: true, profileImageUrl: true } },
          },
        },
      },
    });

    type PlayerEntry = {
      playerId: string; username: string; profileImageUrl?: string | null;
      score: number; wins: number; draws: number; losses: number;
      games: Array<{ gameId: string; opponentId?: string; opponentUsername?: string; result: string; color: string; gameState: string }>;
    };
    const playerMap = new Map<string, PlayerEntry>();

    const ensurePlayer = (id: string, username: string, img: string | null | undefined) => {
      if (!playerMap.has(id)) {
        playerMap.set(id, { playerId: id, username, profileImageUrl: img, score: 0, wins: 0, draws: 0, losses: 0, games: [] });
      }
    };

    for (const m of matches) {
      const { game } = m;
      if (!game.whitePlayer || !game.blackPlayer) continue;
      ensurePlayer(game.whitePlayer.id, game.whitePlayer.username, game.whitePlayer.profileImageUrl);
      ensurePlayer(game.blackPlayer.id, game.blackPlayer.username, game.blackPlayer.profileImageUrl);

      const wp = playerMap.get(game.whitePlayer.id)!;
      const bp = playerMap.get(game.blackPlayer.id)!;

      if (game.status === 'WHITE_WIN') { wp.wins++; bp.losses++; }
      else if (game.status === 'BLACK_WIN') { bp.wins++; wp.losses++; }
      else if (game.status === 'DRAW') { wp.draws++; bp.draws++; }

      wp.score = wp.wins * 0.5 + wp.draws * 0.5;
      bp.score = bp.wins * 0.5 + bp.draws * 0.5;

      const resultLabel = (isWhite: boolean) => {
        if (game.status === 'WHITE_WIN') return isWhite ? 'WIN' : 'LOSS';
        if (game.status === 'BLACK_WIN') return isWhite ? 'LOSS' : 'WIN';
        if (game.status === 'DRAW') return 'DRAW';
        return 'PENDING';
      };

      wp.games.push({ gameId: game.id, opponentId: game.blackPlayer.id, opponentUsername: game.blackPlayer.username, result: resultLabel(true), color: 'WHITE', gameState: game.status });
      bp.games.push({ gameId: game.id, opponentId: game.whitePlayer.id, opponentUsername: game.whitePlayer.username, result: resultLabel(false), color: 'BLACK', gameState: game.status });
    }

    const standings = Array.from(playerMap.values()).sort((a, b) => b.score - a.score);

    try {
      await redisClient.set(cacheKey, JSON.stringify(standings), { EX: 86400 });
    } catch { /* ignore */ }

    return res.json({ success: true, source: 'db', data: standings });
  } catch (err) {
    console.error('[getGroupStandings]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch group standings.' });
  }
}

// GET /tournaments/:id/rounds/:roundId/leaderboard
// While the round is live: reads from tournament:round:{roundId}:state HASH.
// After completion: cleared by sync-worker → falls back to API cache → then DB.
export async function getRoundLeaderboard(req: Request, res: Response) {
  const { id: tournamentId, roundId } = req.params;

  try {
    // Live path.
    try {
      const liveData = await redisClient.hGetAll(`tournament:round:${roundId}:state`);
      if (Object.keys(liveData).length > 0) {
        const leaderboard = Object.values(liveData)
          .map((v) => JSON.parse(v))
          .sort((a, b) => b.groupScore - a.groupScore);
        return res.json({ success: true, source: 'live', data: leaderboard });
      }
    } catch { /* Redis unavailable */ }

    // API cache.
    const cacheKey = `cache:tournament:${tournamentId}:round:${roundId}:leaderboard`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
      }
    } catch { /* Redis unavailable */ }

    // DB fallback: aggregate from TournamentPlayerStats.
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: {
        player: { select: { id: true, username: true, profileImageUrl: true } },
        stats: true,
      },
    });

    type Participant = (typeof participants)[number];
    const leaderboard = participants
      .filter((p: Participant) => p.stats)
      .map((p: Participant) => ({
        playerId: p.playerId,
        username: p.player.username,
        profileImageUrl: p.player.profileImageUrl,
        score: p.stats!.score,
        wins: p.stats!.wins,
        draws: p.stats!.draws,
        losses: p.stats!.losses,
        currentRank: p.stats!.currentRank,
      }))
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    try {
      await redisClient.set(cacheKey, JSON.stringify(leaderboard), { EX: 86400 });
    } catch { /* ignore */ }

    return res.json({ success: true, source: 'db', data: leaderboard });
  } catch (err) {
    console.error('[getRoundLeaderboard]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch round leaderboard.' });
  }
}

export async function joinTournament(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const id = req.params['id'] as string;
  if (!id) return res.status(400).json({ success: false, message: 'Missing tournament id.' });

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } },
        timeManagement: true,
      },
    });

    if (!tournament || tournament.deletedAt) {
      return res.status(404).json({ success: false, message: 'Tournament not found.' });
    }

    if (!['REGISTRATION_OPEN', 'NOT_INITIALIZED'].includes(tournament.status)) {
      return res.status(400).json({ success: false, message: 'Registration is not open.' });
    }

    // Block join if registration window has passed, even if status hasn't been flipped yet
    if (tournament.timeManagement && new Date() > new Date(tournament.timeManagement.registrationCloseAt)) {
      return res.status(400).json({ success: false, message: 'Registration has closed.' });
    }

    if (tournament.maxPlayers && tournament._count.participants >= tournament.maxPlayers) {
      return res.status(400).json({ success: false, message: 'Tournament is full.' });
    }

    // Club-only check
    if (tournament.accessType === 'CLUB' && tournament.clubId) {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: tournament.clubId, userId } },
      });
      if (!membership) {
        return res.status(403).json({ success: false, message: 'This tournament is for club members only.' });
      }
    }

    const existing = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_playerId: { tournamentId: id, playerId: userId } },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Already joined.' });
    }

    await prisma.tournamentParticipant.create({
      data: { tournamentId: id, playerId: userId, role: 'PLAYER' },
    });

    return res.json({ success: true, message: 'Joined tournament.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to join tournament.' });
  }
}

export async function leaveTournament(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const id = req.params['id'] as string;
  if (!id) return res.status(400).json({ success: false, message: 'Missing tournament id.' });

  try {
    const [participant, tm] = await Promise.all([
      prisma.tournamentParticipant.findUnique({
        where: { tournamentId_playerId: { tournamentId: id, playerId: userId } },
      }),
      prisma.tournamentTimeManagement.findUnique({ where: { tournamentId: id } }),
    ]);

    if (!participant) {
      return res.status(404).json({ success: false, message: 'You are not in this tournament.' });
    }

    if (tm && new Date() > new Date(tm.registrationCloseAt)) {
      return res.status(400).json({ success: false, message: 'Registration has closed — you can no longer leave.' });
    }

    await prisma.tournamentParticipant.delete({
      where: { tournamentId_playerId: { tournamentId: id, playerId: userId } },
    });

    return res.json({ success: true, message: 'Left tournament.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to leave tournament.' });
  }
}

export async function deleteTournament(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const id = req.params['id'] as string;
  if (!id) return res.status(400).json({ success: false, message: 'Missing tournament id.' });

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { timeManagement: true },
    });

    if (!tournament || tournament.deletedAt) {
      return res.status(404).json({ success: false, message: 'Tournament not found.' });
    }

    if (tournament.creatorId !== userId) {
      return res.status(403).json({ success: false, message: 'Only the creator can delete this tournament.' });
    }

    if (['NOT_INITIALIZED', 'IN_PROGRESS'].includes(tournament.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete a tournament once rounds have been initialised or it is in progress.' });
    }

    if (tournament.timeManagement) {
      const minutesUntilStart = (new Date(tournament.timeManagement.startTime).getTime() - Date.now()) / 60000;
      if (minutesUntilStart <= 30) {
        return res.status(400).json({ success: false, message: 'Cannot delete a tournament within 30 minutes of its start time.' });
      }
    }

    await prisma.tournament.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.json({ success: true, message: 'Tournament deleted.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to delete tournament.' });
  }
}

// GET /tournaments/:id/dashboard
// Returns myGame + groupStandings + leaderboard + currentRound for the
// authenticated player.  Live: Redis (no extra DB reads).  Completed: DB
// with 5-minute cache.  Both paths return identical TournamentDashboard shape.
export async function getTournamentPlayerDashboard(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const tournamentId = req.params['id'] as string;
  if (!tournamentId) return res.status(400).json({ success: false, message: 'Missing tournament id.' });

  try {
    const dashboard = await getTournamentDashboard(tournamentId, userId);
    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Tournament not found.' });
    }
    return res.json({ success: true, data: dashboard });
  } catch (err) {
    console.error('[getTournamentPlayerDashboard]', err);
    return res.status(500).json({ success: false, message: 'Failed to load tournament dashboard.' });
  }
}

export async function getClubTournaments(req: Request, res: Response) {
  const userId = getUserId(req);
  const clubId = req.params['clubId'] as string;
  if (!clubId) return res.status(400).json({ success: false, message: 'Missing clubId.' });

  try {
    const tournaments = await prisma.tournament.findMany({
      where: { clubId, deletedAt: null },
      include: {
        ...TOURNAMENT_INCLUDE,
        participants: userId
          ? { where: { playerId: userId }, select: { playerId: true, role: true } }
          : false,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json({
      success: true,
      data: tournaments.map((t: Parameters<typeof formatTournament>[0]) => formatTournament(t, userId)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch club tournaments.' });
  }
}
