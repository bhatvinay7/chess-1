import { GameHandler } from '../../src/events/handlers/game.handler.js';
import { createMockIo, createMockSocket } from '../setup.js';
import { redisClient } from '@repo/redis-client';
import { Server, Socket } from 'socket.io';
import { processMoveGrpc } from '@repo/grpc-connection';
import type { ChessMoveServiceClient } from '@repo/grpc-connection';
import { getActiveGameId, buildGameStatePayload, removeGameFromSchedule } from '../../src/shared/game-state.js';
import { syncGameTime } from '../../src/utils/syncGameTime.js';

jest.mock('../../src/shared/game-state.js');
jest.mock('../../src/utils/syncGameTime.js');
jest.mock('../../src/utils/gameTermination.js');

// Mock grpc client structure
const mockGrpcClient = {
  validateAndExecuteMove: jest.fn((req, callback) => {
    callback(null, { success: true, fen: 'test-fen', status: 'ACTIVE', gameId: req.gameId });
  }),
  terminateGame: jest.fn()
};

describe('GameHandler', () => {
  let io: Server;
  let socket: Socket;
  let handler: GameHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    handler = new GameHandler(io, socket, mockGrpcClient as unknown as ChessMoveServiceClient);
    handler.register();
  });

  it('should handle user_move', async () => {
    const gameMoveCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'user_move');
    expect(gameMoveCall).toBeDefined();
    const gameMoveCb = gameMoveCall[1];

    (redisClient.xAdd as jest.Mock).mockResolvedValue('12345-0');

    await gameMoveCb({
      gameId: 'game_1',
      userId: 'user_a',
      move: { from: 'e2', to: 'e4' }
    });

    expect(processMoveGrpc).toHaveBeenCalledWith(
      mockGrpcClient as unknown as ChessMoveServiceClient,
      expect.objectContaining({ game_id: 'game_1', from: 'e2', to: 'e4' })
    );
  });

  it('should handle search_opponent', async () => {
    const searchOpponentCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'search_opponent');
    const searchOpponentCb = searchOpponentCall[1];

    (redisClient.zRange as jest.Mock).mockResolvedValue([]);

    await searchOpponentCb({
      userId: 'user_a',
      username: 'User A',
      gameMode: 'STANDARD',
      time_slot: '10+0',
      elo: 1200,
      profileImageUrl: 'http://image.url',
      isRated: true
    });

    expect(redisClient.xAdd).toHaveBeenCalledWith(
      'matchmaker:stream',
      '*',
      expect.any(Object)
    );
    expect(redisClient.set).toHaveBeenCalledWith('presence:user_a', '1', { EX: 30, NX: true });
  });

  it('should handle join_arena', async () => {
    const joinArenaCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'join_arena');
    const joinArenaCb = joinArenaCall[1];

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (syncGameTime as jest.Mock).mockResolvedValue({ current_fen: 'fen', game_state: 'IN_PROGRESS' });
    (buildGameStatePayload as jest.Mock).mockReturnValue({ state: 'mock' });
    (redisClient.xRead as jest.Mock).mockResolvedValue([]);

    const mockUserSocket = { emit: jest.fn(), join: jest.fn() };
    const { userSocketMap } = require('../../src/shared/socket-store.js');
    userSocketMap.set('user_a', mockUserSocket);

    await joinArenaCb({ userId: 'user_a' });
    
    expect(getActiveGameId).toHaveBeenCalledWith('user_a');
    expect(syncGameTime).toHaveBeenCalledWith('game_1');
    expect(socket.join).toHaveBeenCalledWith('game:game_1');
    expect(mockUserSocket.emit).toHaveBeenCalledWith('game_state', { state: 'mock' });
  });

  it('should handle leave_search', async () => {
    const leaveSearchCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'leave_search');
    const leaveSearchCb = leaveSearchCall[1];

    (redisClient.get as jest.Mock).mockResolvedValue('ticket_data');

    await leaveSearchCb({ userId: 'user_a' });
    
    expect(redisClient.get).toHaveBeenCalledWith('matchmaking:ticket:user_a');
    expect(redisClient.zRem).toHaveBeenCalledWith('matchmaker:zset', 'ticket_data');
    expect(redisClient.del).toHaveBeenCalledWith('matchmaking:ticket:user_a');
    expect(redisClient.del).toHaveBeenCalledWith('presence:user_a');
  });
});
