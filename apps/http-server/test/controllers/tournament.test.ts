import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";
import { redisClient, connectRedisClient } from "@repo/redis-client";
import { signToken } from "../../src/utils/middleware.commonfie.js";

process.env.NODE_ENV = "test";

describe("Tournament Controller", () => {
  let user1Id: string, user2Id: string;
  let token1: string, token2: string;
  let timeControlId: string;
  let tournamentId: string;

  beforeAll(async () => {
    await connectRedisClient();

    // Create users
    const u1 = await prisma.user.create({
      data: {
        email: `t1_${Date.now()}@test.com`,
        username: `tourney1_${Date.now()}`,
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `t2_${Date.now()}@test.com`,
        username: `tourney2_${Date.now()}`,
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;

    token1 = signToken({ userId: user1Id, isAdmin: false });
    token2 = signToken({ userId: user2Id, isAdmin: false });

    // Create time control
    const tc = await prisma.timeControl.create({
      data: {
        id: `tc_${Date.now()}`,
        displayName: "10+0",
        initialTimeSec: 600,
        incrementSec: 0,
        category: "RAPID",
      },
    });
    timeControlId = tc.id;
  });

  afterAll(async () => {
    await prisma.tournamentParticipant.deleteMany({
      where: { playerId: { in: [user1Id, user2Id] } },
    });
    await prisma.tournament.deleteMany({
      where: { creatorId: { in: [user1Id, user2Id] } },
    });
    await prisma.timeControl.deleteMany({ where: { id: timeControlId } });
    await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should create a new tournament (createTournament)", async () => {
    const startTime = Date.now() + 86400000; // Tomorrow in ms
    const registrationCloseAt = startTime - 30 * 60000; // 30 minutes before
    const registrationOpenAt = startTime - 86400000 * 2; // 2 days before
    const res = await request(app)
      .post("/api/v1/tournaments")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        name: "Test Tournament",
        description: "Testing",
        gameType: "STANDARD",
        visibility: "PUBLIC",
        accessType: "OPEN",
        tournamentType: "GLOBAL_SWISS",
        status: "REGISTRATION_OPEN",
        isRated: true,
        maxPlayers: 10,
        timeControlId,
        swissSettings: {
          totalRounds: 3,
        },
        startTime: new Date(startTime).toISOString(),
        registrationCloseAt: new Date(registrationCloseAt).toISOString(),
        registrationOpenAt: new Date(registrationOpenAt).toISOString(),
      });

    console.log("Response:", res.body);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    tournamentId = res.body.data.id;
  }, 15000);

  it("should list tournaments", async () => {
    const res = await request(app).get("/api/v1/tournaments");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  }, 15000);

  it("should get a specific tournament", async () => {
    const res = await request(app).get(`/api/v1/tournaments/${tournamentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(tournamentId);
    expect(res.body.data.name).toBe("Test Tournament");
  }, 15000);

  it("should allow user2 to join the tournament", async () => {
    const res = await request(app)
      .post(`/api/v1/tournaments/${tournamentId}/join`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Joined tournament.");
  }, 15000);

  it("should prevent joining twice", async () => {
    const res = await request(app)
      .post(`/api/v1/tournaments/${tournamentId}/join`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Already joined.");
  }, 15000);

  it("should list my tournaments", async () => {
    const res = await request(app)
      .get("/api/v1/tournaments/my")
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((t: any) => t.id === tournamentId)).toBe(true);
  }, 15000);

  it("should allow user2 to leave the tournament", async () => {
    const res = await request(app)
      .post(`/api/v1/tournaments/${tournamentId}/leave`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Left tournament.");
  }, 15000);

  it("should get empty tournament rounds since it has not started", async () => {
    const res = await request(app).get(
      `/api/v1/tournaments/${tournamentId}/rounds`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.rounds).toEqual([]);
  }, 15000);

  it("should prevent non-creator from deleting", async () => {
    const res = await request(app)
      .delete(`/api/v1/tournaments/${tournamentId}`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(403);
  }, 15000);

  it("should delete the tournament", async () => {
    const res = await request(app)
      .delete(`/api/v1/tournaments/${tournamentId}`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Tournament deleted.");

    // verify it is deleted (soft delete)
    const getRes = await request(app).get(
      `/api/v1/tournaments/${tournamentId}`,
    );
    expect(getRes.status).toBe(404);
  }, 15000);
});
