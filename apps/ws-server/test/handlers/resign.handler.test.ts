import { ResignHandler } from '../../src/events/handlers/resign.handler.js';
import { createMockIo, createMockSocket } from '../setup.js';
import { Server, Socket } from 'socket.io';
import { fetchGameTerminationState, terminateGame, buildTerminationData } from '../../src/utils/gameTermination.js';
import { buildGameStatePayload } from '../../src/shared/game-state.js';
import { userSocketMap } from '../../src/shared/socket-store.js';

jest.mock('../../src/utils/gameTermination.js');
jest.mock('../../src/shared/game-state.js');

describe('ResignHandler', () => {
  let io: Server;
  let socket: Socket;
  let handler: ResignHandler;
  let mockUserSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    handler = new ResignHandler(io, socket);
    handler.register();
    
    mockUserSocket = { emit: jest.fn() };
    userSocketMap.set('user_a', mockUserSocket as any);
    userSocketMap.set('user_b', mockUserSocket as any);

     
  });

  it('should handle resign event', async () => {
    const resignCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'resign');
    expect(resignCall).toBeDefined();
    const resignCb = resignCall[1];

    const mockState = {
      gameState: 'IN_PROGRESS',
      whitePlayerId: 'user_a',
      blackPlayerId: 'user_b',
      player1Id: 'user_a',
      player2Id: 'user_b'
    };

    (fetchGameTerminationState as jest.Mock).mockResolvedValue(mockState);
    (buildTerminationData as jest.Mock).mockReturnValue({ isTerminated: true });
    (buildGameStatePayload as jest.Mock).mockReturnValue({ state: 'updated' });

    await resignCb({
      gameId: 'game_1',
      userId: 'user_a',
    });

    expect(fetchGameTerminationState).toHaveBeenCalledWith('game_1');
    expect(terminateGame).toHaveBeenCalledWith(
      'game_1', 
      mockState, 
      expect.objectContaining({
        newGameState: 'RESIGN',
        winnerId: 'user_b',
        status: 'BLACK_WIN'
      })
    );

    expect(mockUserSocket.emit).toHaveBeenCalledWith('game_state', { state: 'updated' });
  });

  it('should not process resign if game is not in progress or initialized', async () => {
    const resignCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'resign');
    const resignCb = resignCall[1];

    const mockState = {
      gameState: 'COMPLETED',
      whitePlayerId: 'user_a',
    };

    (fetchGameTerminationState as jest.Mock).mockResolvedValue(mockState);

    await resignCb({
      gameId: 'game_1',
      userId: 'user_a',
    });

    expect(terminateGame).not.toHaveBeenCalled();
  });
});

