import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";
import { redisClient } from "@repo/redis-client";
import { signToken } from "../../src/utils/middleware.commonfie.js";

process.env.NODE_ENV = "test";

describe("User Controller", () => {
  const user1Email = `user1_${Date.now()}@example.com`;
  const user2Email = `user2_${Date.now()}@example.com`;

  let user1Id: string;
  let user2Id: string;
  let user1Token: string;

  beforeAll(async () => {
    // Create test users
    const u1 = await prisma.user.create({
      data: {
        email: user1Email,
        username: `u1_${Date.now()}`,
        isAdmin: false,
      },
    });
    user1Id = u1.id;
    user1Token = signToken({ userId: user1Id, isAdmin: false });

    const u2 = await prisma.user.create({
      data: {
        email: user2Email,
        username: `searchable_${Date.now()}`,
        isAdmin: false,
      },
    });
    user2Id = u2.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should search for users successfully", async () => {
    const res = await request(app)
      .get("/api/v1/users/search?query=searchable")
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);

    const foundUser = res.body.users.find((u: any) => u.id === user2Id);
    expect(foundUser).toBeDefined();
    expect(foundUser.friendshipStatus).toBe("NONE");
  });

  it("should return 401 for unauthorized search", async () => {
    const res = await request(app).get("/api/v1/users/search?query=test");

    expect(res.status).toBe(401);
  });

  it("should get public profile for another user", async () => {
    const res = await request(app)
      .get(`/api/v1/users/${user2Id}/profile`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user2Id);
    expect(res.body.friendshipStatus).toBe("NONE");
  });

  it("should return 404 for nonexistent user profile", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .get(`/api/v1/users/${fakeId}/profile`)
      .set("Authorization", `Bearer ${user1Token}`);

    expect(res.status).toBe(404);
  });
});
