import { PrismaClient, Prisma } from '@repo/postgres-db';
import { parseTournamentData, TournamentInput } from '../../types/tournamentTypes.js';
import { Request, Response } from 'express';
import { verifyToken } from '../../utils/middleware.commonfie.js';

const prisma = new PrismaClient();

function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7)).userId;
  } catch {
    return null;
  }
}

export async function createTournament(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const validation = parseTournamentData(req.body as TournamentInput);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const d = validation.data;

  let swissCreateInput = undefined;
  let arenaCreateInput = undefined;
  let dailyCreateInput = undefined;

  const SWISS_TYPES = ['CLUB_SWISS', 'GLOBAL_SWISS', 'CLUB_ROUND_ROBIN', 'GLOBAL_ROUND_ROBIN'];
  if (SWISS_TYPES.includes(d.tournamentType)) {
    if (d.swissSettings) swissCreateInput = { create: d.swissSettings };
  } else if (d.tournamentType === 'ARENA') {
    if (d.arenaSettings) arenaCreateInput = { create: d.arenaSettings };
  } else if (d.tournamentType === 'DAILY') {
    if (d.dailySettings) dailyCreateInput = { create: d.dailySettings };
  }

  const CLUB_TYPES = ['CLUB_SWISS', 'CLUB_ROUND_ROBIN'];
  const isClubEvent = CLUB_TYPES.includes(d.tournamentType) || d.accessType === 'CLUB';

  // Club events require club admin
  if (isClubEvent) {
    if (!d.clubId) {
      return res.status(400).json({ success: false, message: 'clubId is required for club events.' });
    }
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: d.clubId, userId } },
    });
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only club admins can create club events.' });
    }
  }

  // Cross-club: creator must be admin of primary club
  if (d.accessType === 'CROSS_CLUB') {
    if (!d.clubId) {
      return res.status(400).json({ success: false, message: 'clubId is required for cross-club events.' });
    }
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: d.clubId, userId } },
    });
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only club admins can create cross-club events.' });
    }
  }

  try {
    const newTournament = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tournament = await tx.tournament.create({
        data: {
          name: d.name,
          description: d.description,
          accessType: d.accessType!,
          tournamentType: d.tournamentType,
          visibility: d.visibility,
          status: d.status!,
          gameType: d.gameType!,
          isRated: d.isRated,
          inviteOnly: d.inviteOnly,
          premiumOnly: d.premiumOnly,
          requiresApproval: d.requiresApproval,
          autoStartWhenFull: d.autoStartWhenFull,
          allowVacation: d.allowVacation,
          allowLateJoin: d.allowLateJoin,
          useTieBreaks: d.useTieBreaks,
          tieBreakMethod: d.tieBreakMethod,
          minPlayers: d.minPlayers,
          maxPlayers: d.maxPlayers,
          minRating: d.minRating,
          maxRating: d.maxRating,
          minGamesPlayed: d.minGamesPlayed,
          customFen: d.customFen,
          openingName: d.openingName,
          creator: { connect: { id: userId } },
          ...(d.clubId && { club: { connect: { id: d.clubId } } }),
          ...(d.timeControlId && {
            timeControl: { connect: { id: d.timeControlId } },
          }),
          swissSettings: swissCreateInput,
          arenaSettings: arenaCreateInput,
          dailySettings: dailyCreateInput,
        },
        include: {
          swissSettings: true,
          arenaSettings: true,
          dailySettings: true,
        },
      });

      const timeManagement = await tx.tournamentTimeManagement.create({
        data: {
          tournamentId: tournament.id,
          registrationOpenAt: d.registrationOpenAt,
          registrationCloseAt: d.registrationCloseAt,
          startTime: d.startTime,
          endTime: d.endTime ?? null,
        },
      });

      return { ...tournament, timeManagement };
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // Cross-club: create pending invites outside the transaction (non-critical)
    if (d.accessType === 'CROSS_CLUB' && d.invitedClubIds?.length) {
      await (prisma as any).crossClubInvite.createMany({
        data: d.invitedClubIds.map((clubId: string) => ({
          tournamentId: newTournament.id,
          clubId,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Tournament created successfully!',
      data: newTournament,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected database error occurred.',
      errors: [{ fieldName: 'database', message: errorMessage || 'Unknown error' }],
    });
  }
}
