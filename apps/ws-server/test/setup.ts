// apps/ws-server/test/setup.ts

// Mock @repo/redis-client
jest.mock('@repo/redis-client', () => {
  return {
    redisClient: {
      hmGet: jest.fn(),
      hSet: jest.fn(),
      hDel: jest.fn(),
      zAdd: jest.fn(),
      zRem: jest.fn(),
      xAdd: jest.fn(),
      zRangeWithScores: jest.fn(),
      hGetAll: jest.fn(),
      hLen: jest.fn(),
      zRange: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      set: jest.fn(),
      xRead: jest.fn(),
    },
    PubSub: {
      publish: jest.fn(),
      subscribe: jest.fn(),
      pSubscribe: jest.fn(),
    },
    connectRedisClient: jest.fn().mockResolvedValue(true),
    SocketIORedisAdapter: {
      setup: jest.fn().mockResolvedValue(true),
    }
  };
});

// Mock @repo/grpc-connection
jest.mock('@repo/grpc-connection', () => {
  return {
    createGrpcClient: jest.fn().mockReturnValue({
      validateAndExecuteMove: jest.fn((req, callback) => {
        // Default mock implementation
        callback(null, {
          success: true,
          fen: 'mock-fen',
          status: 'ACTIVE',
          gameId: req.gameId,
        });
      }),
      terminateGame: jest.fn((req, callback) => {
        callback(null, { success: true });
      })
    }),
    processMoveGrpc: jest.fn().mockResolvedValue({}),
  };
});

// Utility to mock Socket.io Socket
export const createMockSocket = (id: string = 'socket_1') => {
  return {
    id,
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  };
};

export const createMockIo = () => {
  return {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    on: jest.fn(),
  };
};
