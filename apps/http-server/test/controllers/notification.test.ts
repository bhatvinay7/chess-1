import request from 'supertest';
import { app } from '../../src/index.js';
import { prisma } from '@repo/postgres-db';
import { mongoPrisma } from '@repo/mongo-db';
import { signToken } from '../../src/utils/middleware.commonfie.js';
import { redisClient, connectRedisClient } from '@repo/redis-client';

process.env.NODE_ENV = 'test';

describe('Notification Controller', () => {
  let userId: string;
  let token: string;
  let notificationId: string;

  beforeAll(async () => {
    await connectRedisClient();
    const u = await prisma.user.create({
      data: {
        email: `notif_${Date.now()}@test.com`,
        username: `notif_${Date.now()}`
      }
    });
    userId = u.id;
    token = signToken({ userId, isAdmin: false });

    // Create a mock notification
    const notification = await mongoPrisma.notification.create({
      data: {
        userId,
        type: 'TEST_NOTIFICATION',
        message: 'Test content',
        isRead: false
      }
    });
    notificationId = notification.id;
  });

  afterAll(async () => {
    await mongoPrisma.notification.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it('should get notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(notificationId);
  }, 15000);

  it('should mark notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Marked as read');
    expect(res.body.notification.isRead).toBe(true);
  }, 15000);

  it('should mark all notifications as read', async () => {
    await mongoPrisma.notification.create({
      data: {
        userId,
        type: 'TEST_NOTIFICATION_2',
        message: 'Another test',
        isRead: false
      }
    });

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All notifications marked as read');
  }, 15000);
});
