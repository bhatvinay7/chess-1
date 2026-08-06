import { DrawHandler } from '../../src/events/handlers/draw.handler.js';
import { createMockIo, createMockSocket } from '../setup.js';
import { PubSub } from '@repo/redis-client';
import { Server, Socket } from 'socket.io';
import {
  claimDraw,
  offerDraw,
  declineOfferDraw,
  getPendingDrawOffer
} from '../../src/utils/drawValidator.js';
import { getActiveGameId } from '../../src/shared/game-state.js';

// Mock dependencies
jest.mock('../../src/utils/drawValidator.js');
jest.mock('../../src/shared/game-state.js');

describe('DrawHandler', () => {
  let io: Server;
  let socket: Socket;
  let handler: DrawHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    io = createMockIo() as unknown as Server;
    socket = createMockSocket() as unknown as Socket;
    handler = new DrawHandler(io, socket);
    handler.register();
     
  });

  it('should handle offer-draw', async () => {
    const offerDrawCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'offer-draw');
    expect(offerDrawCall).toBeDefined();
    const offerDrawCb = offerDrawCall[1];

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (offerDraw as jest.Mock).mockResolvedValue({ action: 'allowed' });

    await offerDrawCb({ userId: 'user_a', opponentId: 'user_b' });

    expect(getActiveGameId).toHaveBeenCalledWith('user_a');
    expect(offerDraw).toHaveBeenCalledWith('game_1', 'user_a', 'user_b');
    expect(PubSub.publish).toHaveBeenCalledWith('offer-draw:game_1', JSON.stringify({ action: 'allowed' }));
  });

  it('should handle claim-draw', async () => {
    const claimDrawCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'claim-draw');
    const claimDrawCb = claimDrawCall[1];

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (claimDraw as jest.Mock).mockResolvedValue({ action: 'allowed' });

    await claimDrawCb({ userId: 'user_a', opponentId: 'user_b' });

    expect(claimDraw).toHaveBeenCalledWith('user_a', 'game_1', 'user_b');
    expect(PubSub.publish).toHaveBeenCalledWith('accept-draw:game_1', JSON.stringify({ action: 'allowed' }));
  });

  it('should handle decline-draw', async () => {
    const declineDrawCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'decline-draw');
    const declineDrawCb = declineDrawCall[1];

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (declineOfferDraw as jest.Mock).mockResolvedValue({ action: 'declined' });

    await declineDrawCb({ userId: 'user_a', opponentId: 'user_b' });

    expect(declineOfferDraw).toHaveBeenCalledWith('user_a', 'game_1', 'user_b');
    expect(PubSub.publish).toHaveBeenCalledWith('decline-draw:game_1', JSON.stringify({ action: 'declined' }));
  });

  it('should handle check_draw_offer', async () => {
    const checkDrawOfferCall = (socket.on as jest.Mock).mock.calls.find((call: any[]) => call[0] === 'check_draw_offer');
    const checkDrawOfferCb = checkDrawOfferCall[1];

    (getActiveGameId as jest.Mock).mockResolvedValue('game_1');
    (getPendingDrawOffer as jest.Mock).mockResolvedValue({ some: 'offer' });

    await checkDrawOfferCb({ userId: 'user_a' });

    expect(getPendingDrawOffer).toHaveBeenCalledWith('user_a', 'game_1');
    expect(socket.emit).toHaveBeenCalledWith('draw-request', {
      payload: { some: 'offer' },
      action: 'allowed',
    });
  });
});

