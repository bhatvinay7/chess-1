import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";

process.env.NODE_ENV = "test";

describe("User Profile Controller", () => {
  const userEmail = `profileuser_${Date.now()}@example.com`;

  let userId: string;

  beforeAll(async () => {
    // Create test user
    const u = await prisma.user.create({
      data: {
        email: userEmail,
        username: `profile_${Date.now()}`,
        bio: "Hello world",
        isAdmin: false,
      },
    });
    userId = u.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: { id: userId },
    });
  });

  it("should fetch user profile by ID", async () => {
    const res = await request(app).get(`/api/v1/profile/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.bio).toBe("Hello world");
    expect(Array.isArray(res.body.ratings)).toBe(true);
  });

  it("should return 404 for nonexistent user", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app).get(`/api/v1/profile/${fakeId}`);

    expect(res.status).toBe(404);
  });

  it("should update user profile", async () => {
    const res = await request(app).put(`/api/v1/profile/${userId}`).send({
      bio: "Updated bio",
      username: "new_username",
    });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("Updated bio");
    expect(res.body.username).toBe("new_username");
  });

  it("should return 400 when no fields are provided", async () => {
    const res = await request(app).put(`/api/v1/profile/${userId}`).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("At least one field must be provided");
  });
});
