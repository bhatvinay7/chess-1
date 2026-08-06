import request from 'supertest';
import { app } from '../../src/index.js';
import { prisma } from '@repo/postgres-db';
import { signToken } from '../../src/utils/middleware.commonfie.js';

process.env.NODE_ENV = 'test';

describe('Friend Controller', () => {
  let user1Id: string, user2Id: string, user3Id: string;
  let token1: string, token2: string, token3: string;

  beforeAll(async () => {
    // Create 3 users for friend logic
    const u1 = await prisma.user.create({
      data: { email: `f1_${Date.now()}@test.com`, username: `friend1_${Date.now()}` }
    });
    const u2 = await prisma.user.create({
      data: { email: `f2_${Date.now()}@test.com`, username: `friend2_${Date.now()}` }
    });
    const u3 = await prisma.user.create({
      data: { email: `f3_${Date.now()}@test.com`, username: `friend3_${Date.now()}` }
    });
    
    user1Id = u1.id;
    user2Id = u2.id;
    user3Id = u3.id;
    
    token1 = signToken({ userId: user1Id, isAdmin: false });
    token2 = signToken({ userId: user2Id, isAdmin: false });
    token3 = signToken({ userId: user3Id, isAdmin: false });
  });

  afterAll(async () => {
    await prisma.friendship.deleteMany({
      where: { OR: [{ requesterId: user1Id }, { requesterId: user2Id }, { requesterId: user3Id }] }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, user3Id] } }
    });
  });

  it('should send a friend request', async () => {
    const res = await request(app)
      .post('/api/v1/friends/requests')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipientId: user2Id });
      
    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe('PENDING');
  });

  it('should list outgoing requests', async () => {
    const res = await request(app)
      .get('/api/v1/friends/requests/outgoing')
      .set('Authorization', `Bearer ${token1}`);
      
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].user.id).toBe(user2Id);
  });

  it('should list incoming requests', async () => {
    const res = await request(app)
      .get('/api/v1/friends/requests/incoming')
      .set('Authorization', `Bearer ${token2}`);
      
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].user.id).toBe(user1Id);
  });

  it('should accept a friend request', async () => {
    const incomingReq = await request(app)
      .get('/api/v1/friends/requests/incoming')
      .set('Authorization', `Bearer ${token2}`);
    
    const requestId = incomingReq.body.requests[0].id;
    
    const res = await request(app)
      .post(`/api/v1/friends/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${token2}`);
      
    expect(res.status).toBe(200);
    expect(res.body.friendship.status).toBe('ACCEPTED');
  });

  it('should list friends', async () => {
    const res = await request(app)
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${token1}`);
      
    expect(res.status).toBe(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0].user.id).toBe(user2Id);
  });

  it('should reject a friend request', async () => {
    // user 3 sends to user 2
    await request(app)
      .post('/api/v1/friends/requests')
      .set('Authorization', `Bearer ${token3}`)
      .send({ recipientId: user2Id });
      
    const incomingReq = await request(app)
      .get('/api/v1/friends/requests/incoming')
      .set('Authorization', `Bearer ${token2}`);
      
    const requestId = incomingReq.body.requests.find((r: any) => r.user.id === user3Id).id;
    
    const res = await request(app)
      .post(`/api/v1/friends/requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${token2}`);
      
    expect(res.status).toBe(200);
    
    const listRes = await request(app)
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${token2}`);
    expect(listRes.body.friends.find((f: any) => f.user.id === user3Id)).toBeUndefined();
  });
});
