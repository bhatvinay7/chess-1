import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";
import { signToken } from "../../src/utils/middleware.commonfie.js";

process.env.NODE_ENV = "test";

describe("Club Controller", () => {
  let user1Id: string, user2Id: string;
  let token1: string, token2: string;
  let clubId: string;
  let requestId: string;

  beforeAll(async () => {
    // Create users
    const u1 = await prisma.user.create({
      data: {
        email: `c1_${Date.now()}@test.com`,
        username: `club1_${Date.now()}`,
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `c2_${Date.now()}@test.com`,
        username: `club2_${Date.now()}`,
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;

    token1 = signToken({ userId: user1Id, isAdmin: false });
    token2 = signToken({ userId: user2Id, isAdmin: false });
  });

  afterAll(async () => {
    await prisma.clubJoinRequest.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } },
    });
    await prisma.clubMember.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } },
    });
    await prisma.club.deleteMany({
      where: { creatorId: { in: [user1Id, user2Id] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });
  });

  it("should create a new club", async () => {
    const res = await request(app)
      .post("/api/v1/clubs")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        name: `Test Club ${Date.now()}`,
        description: "A great club",
        creatorId: user1Id,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    clubId = res.body.id;
  });

  it("should prevent duplicate club names", async () => {
    const res = await request(app)
      .post("/api/v1/clubs")
      .set("Authorization", `Bearer ${token1}`)
      .send({
        name: await prisma.club
          .findUnique({ where: { id: clubId } })
          .then((c) => c?.name),
        description: "Duplicate",
        creatorId: user1Id,
      });

    expect(res.status).toBe(409);
  });

  it("should get a specific club", async () => {
    const res = await request(app).get(`/api/v1/clubs/${clubId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(clubId);
  });

  it("should list all clubs", async () => {
    const res = await request(app).get("/api/v1/clubs");
    expect(res.status).toBe(200);
    expect(res.body.clubs).toBeDefined();
    expect(res.body.clubs.some((c: any) => c.id === clubId)).toBe(true);
  });

  it("should list my admin clubs", async () => {
    const res = await request(app)
      .get("/api/v1/clubs/mine")
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.some((c: any) => c.id === clubId)).toBe(true);
  });

  it("should allow user2 to request to join", async () => {
    const res = await request(app)
      .post(`/api/v1/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ userId: user2Id });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    requestId = res.body.id;
  });

  it("should allow admin to list join requests", async () => {
    const res = await request(app)
      .get(`/api/v1/clubs/${clubId}/requests?adminId=${user1Id}`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(requestId);
  });

  it("should allow admin to accept join request", async () => {
    const res = await request(app)
      .patch(`/api/v1/clubs/${clubId}/requests/${requestId}`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ action: "accept", adminId: user1Id });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Request accepted");

    // verify membership
    const getRes = await request(app).get(`/api/v1/clubs/${clubId}`);
    expect(getRes.body.members.some((m: any) => m.userId === user2Id)).toBe(
      true,
    );
  });

  it("should allow admin to remove a member", async () => {
    const res = await request(app)
      .delete(`/api/v1/clubs/${clubId}/members/${user2Id}`)
      .set("Authorization", `Bearer ${token1}`)
      .send({ adminId: user1Id });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Member removed");
  });
});
