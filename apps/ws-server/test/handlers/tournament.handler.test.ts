import { TournamentHandler } from '../../src/events/handlers/tournament.handler.js';
import { createMockIo, createMockSocket } from '../setup.js';
import { Server, Socket } from 'socket.io';
import { redisClient } from '@repo/redis-client';
import { getActiveGameId } from '../../src/shared/game-state.js';

jest.mock('../../src/shared/game-state.js');

describe('TournamentHandler', () => {
  let io: Server;
  let socket: Socket;
  let handler: TournamentHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    handler = new TournamentHandler(io, socket);
    handler.register();
     
  });

  it('should handle tournament:view when no rounds exist', async () => {
    const viewCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'tournament:view');
    expect(viewCall).toBeDefined();
    const viewCb = viewCall[1];

    (redisClient.zRangeWithScores as jest.Mock).mockResolvedValue([]);
    (getActiveGameId as jest.Mock).mockResolvedValue(null);

    await viewCb({ tournamentId: 'tourney_1', userId: 'user_a' });

    expect(socket.emit).toHaveBeenCalledWith('tournament:use_api', {
      tournamentId: 'tourney_1',
      reason: 'no_rounds'
    });
  });

  it('should handle tournament:view when tournament is completed (no live state)', async () => {
    const viewCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'tournament:view');
    const viewCb = viewCall[1];

    (redisClient.zRangeWithScores as jest.Mock).mockResolvedValue([
      { value: 'round_1', score: 1 }
    ]);
    (getActiveGameId as jest.Mock).mockResolvedValue(null);
    (redisClient.hLen as jest.Mock).mockResolvedValue(0);

    await viewCb({ tournamentId: 'tourney_1', userId: 'user_a' });

    expect(socket.emit).toHaveBeenCalledWith('tournament:use_api', {
      tournamentId: 'tourney_1',
      reason: 'completed'
    });
  });

  it('should handle tournament:view and emit live data', async () => {
    const viewCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'tournament:view');
    const viewCb = viewCall[1];

    // Mock round entries
    (redisClient.zRangeWithScores as jest.Mock)
      .mockResolvedValueOnce([{ value: 'round_1', score: 1 }]) // For rounds
      .mockResolvedValueOnce([{ value: 'group_1', score: 1 }]); // For groups in round_1

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (redisClient.hLen as jest.Mock).mockResolvedValue(1); // isLive = true
    (redisClient.hGetAll as jest.Mock)
      .mockResolvedValueOnce({ tournament_id: 'tourney_1', status: 'IN_PROGRESS' }) // Active game
      .mockResolvedValueOnce({ user_a: JSON.stringify({ score: 10, games: [] }) }) // Group state
      .mockResolvedValueOnce({ user_a: JSON.stringify({ groupScore: 10 }) }); // Round state

    await viewCb({ tournamentId: 'tourney_1', userId: 'user_a' });

    expect(socket.emit).toHaveBeenCalledWith('tournament:live_data', expect.objectContaining({
      tournamentId: 'tourney_1',
      isLive: true,
      myLiveGame: expect.objectContaining({ gameId: 'game_1' }),
      rounds: expect.any(Array)
    }));
  });

  it('should handle errors gracefully', async () => {
    const viewCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'tournament:view');
    const viewCb = viewCall[1];

    (redisClient.zRangeWithScores as jest.Mock).mockRejectedValue(new Error('Redis error'));

    await viewCb({ tournamentId: 'tourney_1' });

    expect(socket.emit).toHaveBeenCalledWith('tournament:error', {
      tournamentId: 'tourney_1',
      message: 'Failed to fetch tournament data'
    });
  });
});
