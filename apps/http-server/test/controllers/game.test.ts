import request from 'supertest';
import { app } from '../../src/index.js';
import { prisma } from '@repo/postgres-db';
import { redisClient } from '@repo/redis-client';
import { signToken } from '../../src/utils/middleware.commonfie.js';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';

describe('Game Controller', () => {
  const userEmail = `gameuser_${Date.now()}@example.com`;

  let userId: string;
  let userToken: string;
  let gameId: string;

  beforeAll(async () => {
    // Create test user
    const u = await prisma.user.create({
      data: {
        email: userEmail,
        username: `gamer_${Date.now()}`,
        isAdmin: false
      }
    });
    userId = u.id;
    userToken = signToken({ userId, isAdmin: false });

    // Create a mock game for the user
    gameId = crypto.randomUUID();
    await prisma.game.create({
      data: {
        id: gameId,
        whitePlayerId: userId,
        blackPlayerId: userId, // Playing against themselves for test
        status: 'WHITE_WIN',
        timeControl: '3+0',
        gameMode: 'standard',
        isRated: true,
        winnerId: userId, // White wins
        pgn: '1. e4',
        initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        currentFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.game.deleteMany({
      where: { id: gameId }
    });
    await prisma.user.deleteMany({
      where: { id: userId }
    });

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it('should fetch game history', async () => {
    const res = await request(app)
      .get('/api/v1/games/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('games');
    expect(Array.isArray(res.body.games)).toBe(true);
    expect(res.body.games.length).toBeGreaterThanOrEqual(1);

    const game = res.body.games.find((g: any) => g.id === gameId);
    expect(game).toBeDefined();
    expect(game.timeControl).toBe('3+0');
  });

  it('should get a specific game by ID', async () => {
    const res = await request(app)
      .get(`/api/v1/games/${gameId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(gameId);
    expect(res.body.pgn).toBe('1. e4');
  });

  it('should get rating history', async () => {
    const res = await request(app)
      .get('/api/v1/games/rating-history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('points');
    expect(Array.isArray(res.body.points)).toBe(true);
  });
});
