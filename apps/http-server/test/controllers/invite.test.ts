import request from "supertest";
import { app } from "../../src/index.js";
import { prisma as pgPrisma } from "@repo/postgres-db";
import { mongoPrisma } from "@repo/mongo-db";
import { redisClient, connectRedisClient } from "@repo/redis-client";
import { signToken } from "../../src/utils/middleware.commonfie.js";

process.env.NODE_ENV = "test";

describe("Invite Controller", () => {
  let user1Id: string, user2Id: string, user3Id: string;
  let token1: string, token2: string, token3: string;

  beforeAll(async () => {
    await connectRedisClient();

    // Create 3 users
    const u1 = await pgPrisma.user.create({
      data: {
        email: `i1_${Date.now()}@test.com`,
        username: `inviter1_${Date.now()}`,
      },
    });
    const u2 = await pgPrisma.user.create({
      data: {
        email: `i2_${Date.now()}@test.com`,
        username: `inviter2_${Date.now()}`,
      },
    });
    const u3 = await pgPrisma.user.create({
      data: {
        email: `i3_${Date.now()}@test.com`,
        username: `inviter3_${Date.now()}`,
      },
    });

    user1Id = u1.id;
    user2Id = u2.id;
    user3Id = u3.id;

    token1 = signToken({ userId: user1Id, isAdmin: false });
    token2 = signToken({ userId: user2Id, isAdmin: false });
    token3 = signToken({ userId: user3Id, isAdmin: false });

    // Make u1 and u2 friends
    await pgPrisma.friendship.create({
      data: { requesterId: user1Id, recipientId: user2Id, status: "ACCEPTED" },
    });
  });

  afterAll(async () => {
    await pgPrisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: user1Id },
          { requesterId: user2Id },
          { requesterId: user3Id },
        ],
      },
    });
    await pgPrisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, user3Id] } },
    });
    const invites = await mongoPrisma.invitation.findMany({
      where: {
        OR: [
          { senderId: user1Id },
          { senderId: user2Id },
          { senderId: user3Id },
        ],
      },
    });
    for (const inv of invites) {
      await mongoPrisma.invitation.delete({ where: { id: inv.id } });
    }

    const notifs = await mongoPrisma.notification.findMany({
      where: { userId: { in: [user1Id, user2Id, user3Id] } },
    });
    for (const n of notifs) {
      await mongoPrisma.notification.delete({ where: { id: n.id } });
    }

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }, 15000);

  it("should fail to send invite if not friends", async () => {
    const scheduledTime = new Date(Date.now() + 100000).toISOString();
    const res = await request(app)
      .post("/api/v1/invites")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        receiverId: user3Id,
        timeControl: "10+0",
        gameMode: "standard",
        scheduledTime,
        color: "random",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("only invite your friends");
  });

  it("should send a game invite to a friend", async () => {
    const scheduledTime = new Date(Date.now() + 100000).toISOString();
    const res = await request(app)
      .post("/api/v1/invites")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        receiverId: user2Id,
        timeControl: "10+0",
        gameMode: "standard",
        scheduledTime,
        color: "white",
      });

    expect(res.status).toBe(201);
    expect(res.body.invite.status).toBe("PENDING");
  });

  it("should get sent invites", async () => {
    const res = await request(app)
      .get("/api/v1/invites/sent")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].receiverId).toBe(user2Id);
    expect(res.body[0].payload.color).toBe("white");
  });

  it("should get received invites", async () => {
    const res = await request(app)
      .get("/api/v1/invites/received")
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].senderId).toBe(user1Id);
  });

  it("should accept an invite", async () => {
    const invitesRes = await request(app)
      .get("/api/v1/invites/received")
      .set("Authorization", `Bearer ${token2}`);

    const inviteId = invitesRes.body[0].id;

    const res = await request(app)
      .post(`/api/v1/invites/${inviteId}/accept`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Invitation accepted");
    expect(res.body.gameId).toBeDefined();

    // Verify Redis state is populated
    const state = await redisClient.hGetAll(`game:state:${res.body.gameId}`);
    expect(state.white_player_id).toBe(user1Id); // sender chose white
    expect(state.black_player_id).toBe(user2Id);

    // Clean up Redis
    await redisClient.del(`game:state:${res.body.gameId}`);
    await redisClient.del(`matchmaking:gameId:${user1Id}`);
    await redisClient.del(`matchmaking:gameId:${user2Id}`);
  });

  it("should reject an invite", async () => {
    // Send another invite to reject
    const scheduledTime = new Date(Date.now() + 200000).toISOString();
    const createRes = await request(app)
      .post("/api/v1/invites")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        receiverId: user2Id,
        timeControl: "5+0",
        gameMode: "standard",
        scheduledTime,
        color: "random",
      });

    const inviteId = createRes.body.invite.id;

    const res = await request(app)
      .post(`/api/v1/invites/${inviteId}/reject`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Invitation rejected");

    // verify it is rejected
    const invite = await mongoPrisma.invitation.findUnique({
      where: { id: inviteId },
    });
    expect(invite?.status).toBe("REJECTED");
  });
});
