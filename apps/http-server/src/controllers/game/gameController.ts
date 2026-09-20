import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";
import { redisClient } from "@repo/redis-client";
import { verifyToken } from "../../utils/middleware.commonfie.js";
import { getAuthenticatedUserId } from "../../utils/auth.js";

const GAMES_CACHE_LIMIT = 20;
const GAMES_CACHE_KEY = (userId: string) => `cache:user:${userId}:games`;

function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    return verifyToken(authHeader.slice(7)).userId;
  } catch {
    return null;
  }
}

function gameName(timeControl: string): string {
  const [minutesRaw] = timeControl.split("+");
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(minutes)) return "Chess";
  if (minutes < 3) return "Bullet";
  if (minutes < 10) return "Blitz";
  if (minutes < 30) return "Rapid";
  return "Classical";
}

function resultForUser(
  game: { status: string; winnerId: string | null },
  userId: string,
): "WIN" | "LOSS" | "DRAW" | "ABANDONED" {
  if (game.status === "DRAW") return "DRAW";
  if (game.status === "ABANDONED") return "ABANDONED";
  if (!game.winnerId) return "DRAW";
  return game.winnerId === userId ? "WIN" : "LOSS";
}

export async function getGameById(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { gameId } = req.params;

  try {
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: { notIn: ["WAITING", "ACTIVE"] },
      },
      include: {
        whitePlayer: {
          select: { id: true, username: true, profileImageUrl: true },
        },
        blackPlayer: {
          select: { id: true, username: true, profileImageUrl: true },
        },
        analysis: true,
        _count: { select: { moves: true } },
      },
    });

    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    const isWhite = game.whitePlayerId === userId;

    res.json({
      id: game.id,
      pgn: game.pgn,
      currentFen: game.currentFen,
      initialFen: game.initialFen,
      timeControl: game.timeControl,
      gameName: gameName(game.timeControl),
      isRated: game.isRated,
      status: game.status,
      result: resultForUser(game, userId),
      playerColor: isWhite ? "white" : "black",
      moveCount: game._count.moves,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      whitePlayer: {
        id: game.whitePlayer.id,
        username: game.whitePlayer.username,
        profileImageUrl: game.whitePlayer.profileImageUrl,
        rating: game.whiteRating,
        ratingAfter: game.whiteRatingAfter,
      },
      blackPlayer: game.blackPlayer
        ? {
            id: game.blackPlayer.id,
            username: game.blackPlayer.username,
            profileImageUrl: game.blackPlayer.profileImageUrl,
            rating: game.blackRating,
            ratingAfter: game.blackRatingAfter,
          }
        : null,
      analysis: game.analysis,
    });
  } catch (error) {
    console.error("[game-by-id]", error);
    res.status(500).json({ message: "Failed to load game" });
  }
}

export async function saveGameAnalysis(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { gameId } = req.params;
  const { whiteAccuracy, blackAccuracy } = req.body as {
    whiteAccuracy: number;
    blackAccuracy: number;
  };

  if (typeof whiteAccuracy !== "number" || typeof blackAccuracy !== "number") {
    res
      .status(400)
      .json({
        message: "whiteAccuracy and blackAccuracy are required numbers",
      });
    return;
  }

  try {
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
      include: { analysis: true },
    });
    if (!game) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    // If already reviewed, return the existing data without overwriting
    if (game.analysis?.reviewedAt) {
      res.json({
        success: true,
        existing: true,
        whiteAccuracy: game.analysis.whiteAccuracy,
        blackAccuracy: game.analysis.blackAccuracy,
        averageAccuracy: game.analysis.averageAccuracy,
      });
      return;
    }

    const averageAccuracy =
      Math.round(((whiteAccuracy + blackAccuracy) / 2) * 10) / 10;

    await prisma.gameAnalysis.upsert({
      where: { gameId: game.id },
      update: {
        whiteAccuracy,
        blackAccuracy,
        averageAccuracy,
        reviewedAt: new Date(),
      },
      create: {
        gameId: game.id,
        whiteAccuracy,
        blackAccuracy,
        averageAccuracy,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, whiteAccuracy, blackAccuracy, averageAccuracy });
  } catch (error) {
    console.error("[save-analysis]", error);
    res.status(500).json({ message: "Failed to save analysis" });
  }
}

type HistoryFilter = "all" | "wins" | "losses" | "draws" | "rated";

function filterWhere(filter: HistoryFilter, userId: string) {
  switch (filter) {
    case "wins":
      return { winnerId: userId };
    case "losses":
      return {
        NOT: { winnerId: userId },
        winnerId: { not: null as string | null },
      };
    case "draws":
      return {
        OR: [
          { status: "DRAW" as const },
          { winnerId: null, status: { not: "ABANDONED" as const } },
        ],
      };
    case "rated":
      return { isRated: true };
    default:
      return {};
  }
}

export async function getMyGameHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  await sendGameHistoryForUser(req, res, userId);
}

export async function getUserGameHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const currentUserId = getAuthenticatedUserId(req);
  if (!currentUserId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ message: "User id is required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  await sendGameHistoryForUser(req, res, userId);
}

async function sendGameHistoryForUser(
  req: Request,
  res: Response,
  userId: string,
): Promise<void> {
  const limit = Math.min(Number(req.query.limit ?? 8) || 8, 100);
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const skip = (page - 1) * limit;
  const filter = (req.query.filter as HistoryFilter | undefined) ?? "all";

  const baseWhere = {
    OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
    status: { notIn: ["WAITING" as const, "ACTIVE" as const] },
  };
  const where = { ...baseWhere, ...filterWhere(filter, userId) };

  // Cache covers page 1 / no filter / limit ≤ GAMES_CACHE_LIMIT only.
  // Cache key holds serialised game items as a Redis LIST (RPUSH, LRANGE).
  const useCache = page === 1 && filter === "all" && limit <= GAMES_CACHE_LIMIT;
  const cacheKey = GAMES_CACHE_KEY(userId);

  try {
    if (useCache) {
      try {
        const keyExists = await redisClient.exists(cacheKey);
        if (keyExists) {
          const cached = await redisClient.lRange(cacheKey, 0, limit - 1);
          const items = cached.map((s) => JSON.parse(s));

          // Counts are cheap queries (no joins) — still hit DB.
          const [
            total,
            countAll,
            countWins,
            countLosses,
            countDraws,
            countRated,
          ] = await Promise.all([
            prisma.game.count({ where }),
            prisma.game.count({ where: baseWhere }),
            prisma.game.count({
              where: { ...baseWhere, ...filterWhere("wins", userId) },
            }),
            prisma.game.count({
              where: { ...baseWhere, ...filterWhere("losses", userId) },
            }),
            prisma.game.count({
              where: { ...baseWhere, ...filterWhere("draws", userId) },
            }),
            prisma.game.count({
              where: { ...baseWhere, ...filterWhere("rated", userId) },
            }),
          ]);

          const reviewedGames = items.filter(
            (g: any) =>
              g.analysis?.reviewedAt || g.analysis?.averageAccuracy != null,
          ).length;
          const decisiveGames = items.filter(
            (g: any) => g.result === "WIN" || g.result === "LOSS",
          ).length;
          const wins = items.filter((g: any) => g.result === "WIN").length;
          const accuracies = items
            .map((g: any) => g.analysis?.averageAccuracy)
            .filter((v: any): v is number => typeof v === "number");

          res.json({
            games: items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            filterCounts: {
              all: countAll,
              wins: countWins,
              losses: countLosses,
              draws: countDraws,
              rated: countRated,
            },
            summary: {
              totalGames: countAll,
              winRate:
                decisiveGames > 0
                  ? Math.round((wins / decisiveGames) * 1000) / 10
                  : 0,
              reviewedGames,
              averageAccuracy:
                accuracies.length > 0
                  ? Math.round(
                      (accuracies.reduce((s: number, v: number) => s + v, 0) /
                        accuracies.length) *
                        10,
                    ) / 10
                  : null,
            },
          });
          return;
        }
      } catch {
        // Redis unavailable — fall through to DB.
      }
    }

    const [
      games,
      total,
      countAll,
      countWins,
      countLosses,
      countDraws,
      countRated,
    ] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip,
        include: {
          whitePlayer: {
            select: { id: true, username: true, profileImageUrl: true },
          },
          blackPlayer: {
            select: { id: true, username: true, profileImageUrl: true },
          },
          gameState: true,
          analysis: true,
          _count: { select: { moves: true } },
        },
      }),
      prisma.game.count({ where }),
      prisma.game.count({ where: baseWhere }),
      prisma.game.count({
        where: { ...baseWhere, ...filterWhere("wins", userId) },
      }),
      prisma.game.count({
        where: { ...baseWhere, ...filterWhere("losses", userId) },
      }),
      prisma.game.count({
        where: { ...baseWhere, ...filterWhere("draws", userId) },
      }),
      prisma.game.count({
        where: { ...baseWhere, ...filterWhere("rated", userId) },
      }),
    ]);

    type GameRow = (typeof games)[number];
    const items = games.map((game: GameRow) => {
      const isWhite = game.whitePlayerId === userId;

      const playerRating = isWhite ? game.whiteRating : game.blackRating;
      const opponentRating = isWhite ? game.blackRating : game.whiteRating;
      const playerRatingAfter = isWhite
        ? game.whiteRatingAfter
        : game.blackRatingAfter;
      const opponentRatingAfter = isWhite
        ? game.blackRatingAfter
        : game.whiteRatingAfter;
      const playerDelta =
        (isWhite ? game.whiteRatingGain : game.blackRatingGain) ?? 0;
      const opponentDelta =
        (isWhite ? game.blackRatingGain : game.whiteRatingGain) ?? 0;

      return {
        id: game.id,
        result: resultForUser(game, userId),
        status: game.status,
        gameName: gameName(game.timeControl),
        timeControl: game.timeControl,
        timeSlot: game.timeControl,
        date: game.endedAt ?? game.createdAt,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        currentFen: game.currentFen,
        pgn: game.pgn,
        isRated: game.isRated,
        moveCount: game._count.moves,
        playerColor: isWhite ? "white" : "black",
        player: {
          id: userId,
          rating: playerRating,
          ratingAfter: playerRatingAfter,
          ratingDelta: playerDelta,
        },
        opponent: {
          id: isWhite ? game.blackPlayer?.id : game.whitePlayer.id,
          username: isWhite
            ? game.blackPlayer?.username
            : game.whitePlayer.username,
          profileImageUrl: isWhite
            ? game.blackPlayer?.profileImageUrl
            : game.whitePlayer.profileImageUrl,
          rating: opponentRating,
          ratingAfter: opponentRatingAfter,
          ratingDelta: opponentDelta,
        },
        whitePlayer: {
          id: game.whitePlayer.id,
          username: game.whitePlayer.username,
          profileImageUrl: game.whitePlayer.profileImageUrl,
          rating: game.whiteRating,
          ratingAfter: game.whiteRatingAfter,
          ratingDelta: game.whiteRatingGain ?? 0,
        },
        blackPlayer: game.blackPlayer
          ? {
              id: game.blackPlayer.id,
              username: game.blackPlayer.username,
              profileImageUrl: game.blackPlayer.profileImageUrl,
              rating: game.blackRating,
              ratingAfter: game.blackRatingAfter,
              ratingDelta: game.blackRatingGain ?? 0,
            }
          : null,
        gameState: game.gameState,
        analysis: game.analysis,
      };
    });

    // Populate cache for the first GAMES_CACHE_LIMIT items.
    if (useCache && items.length > 0) {
      try {
        await redisClient.del(cacheKey);
        await redisClient.rPush(
          cacheKey,
          items
            .slice(0, GAMES_CACHE_LIMIT)
            .map((g: (typeof items)[number]) => JSON.stringify(g)),
        );
      } catch {
        /* ignore cache write errors */
      }
    }

    type Item = (typeof items)[number];
    const reviewedGames = items.filter(
      (game: Item) =>
        game.analysis?.reviewedAt || game.analysis?.averageAccuracy != null,
    ).length;
    const decisiveGames = items.filter(
      (game: Item) => game.result === "WIN" || game.result === "LOSS",
    ).length;
    const wins = items.filter((game: Item) => game.result === "WIN").length;
    const averageAccuracyValues = items
      .map((game: Item) => game.analysis?.averageAccuracy)
      .filter(
        (value: number | null | undefined): value is number =>
          typeof value === "number",
      );

    res.json({
      games: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filterCounts: {
        all: countAll,
        wins: countWins,
        losses: countLosses,
        draws: countDraws,
        rated: countRated,
      },
      summary: {
        totalGames: countAll,
        winRate:
          decisiveGames > 0
            ? Math.round((wins / decisiveGames) * 1000) / 10
            : 0,
        reviewedGames,
        averageAccuracy:
          averageAccuracyValues.length > 0
            ? Math.round(
                (averageAccuracyValues.reduce(
                  (sum: number, value: number) => sum + value,
                  0,
                ) /
                  averageAccuracyValues.length) *
                  10,
              ) / 10
            : null,
      },
    });
  } catch (error) {
    console.error("[game-history] Failed to load game history:", error);
    res.status(500).json({ message: "Failed to load game history" });
  }
}

export async function getRatingHistory(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: { notIn: ["WAITING" as const, "ACTIVE" as const] },
        isRated: true,
      },
      orderBy: [{ endedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        whitePlayerId: true,
        whiteRatingAfter: true,
        blackRatingAfter: true,
        endedAt: true,
        createdAt: true,
      },
    });

    type RatingRow = (typeof games)[number];
    const points = games
      .map((g: RatingRow) => {
        const rating =
          g.whitePlayerId === userId ? g.whiteRatingAfter : g.blackRatingAfter;
        if (rating == null) return null;
        return { date: (g.endedAt ?? g.createdAt).toISOString(), rating };
      })
      .filter(
        (
          p: { date: string; rating: number } | null,
        ): p is { date: string; rating: number } => p !== null,
      );

    res.json({ points });
  } catch (error) {
    console.error("[rating-history]", error);
    res.status(500).json({ message: "Failed to load rating history" });
  }
}

function parseTimeControlCategory(tc: string): "BULLET" | "BLITZ" | "RAPID" {
  const [minStr] = tc.split("+");
  const mins = Number(minStr ?? 0);
  if (mins < 3) return "BULLET";
  if (mins <= 10) return "BLITZ";
  return "RAPID";
}

export async function getRatingHistoryByCategory(
  req: Request,
  res: Response,
): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: { notIn: ["WAITING" as const, "ACTIVE" as const] },
        isRated: true,
      },
      orderBy: [{ endedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        whitePlayerId: true,
        whiteRatingAfter: true,
        blackRatingAfter: true,
        timeControl: true,
        endedAt: true,
        createdAt: true,
      },
    });

    const result: Record<string, { date: string; rating: number }[]> = {
      BULLET: [],
      BLITZ: [],
      RAPID: [],
    };

    for (const g of games) {
      const rating =
        g.whitePlayerId === userId ? g.whiteRatingAfter : g.blackRatingAfter;
      if (rating == null) continue;
      const cat = parseTimeControlCategory(g.timeControl);
      result[cat]!.push({
        date: (g.endedAt ?? g.createdAt).toISOString(),
        rating,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("[rating-history-by-category]", error);
    res.status(500).json({ message: "Failed to load rating history" });
  }
}
