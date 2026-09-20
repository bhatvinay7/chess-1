import { jest } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";
import { redisClient, connectRedisClient } from "@repo/redis-client";

process.env.NODE_ENV = "test";

// Mock mailService to prevent sending real emails
jest.mock("../../src/services/mailService.js", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
}));

describe("Admin Auth Controller", () => {
  let adminId: string;
  let adminEmail: string;

  beforeAll(async () => {
    await connectRedisClient();
    adminEmail = `admin_${Date.now()}@test.com`;
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: `admin_${Date.now()}`,
        isAdmin: true,
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: adminId } });
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should request an OTP for a valid admin email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/admin/request-otp")
      .send({ email: adminEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("OTP sent to your email");
  }, 15000);

  it("should reject OTP request for non-admin user", async () => {
    const nonAdminEmail = `user_${Date.now()}@test.com`;
    const nonAdmin = await prisma.user.create({
      data: {
        email: nonAdminEmail,
        username: `user_${Date.now()}`,
        isAdmin: false,
      },
    });

    const res = await request(app)
      .post("/api/v1/auth/admin/request-otp")
      .send({ email: nonAdminEmail });

    expect(res.status).toBe(401);

    await prisma.user.delete({ where: { id: nonAdmin.id } });
  }, 15000);

  it("should verify OTP correctly", async () => {
    // 1. request OTP
    await request(app)
      .post("/api/v1/auth/admin/request-otp")
      .send({ email: adminEmail });

    // 2. get OTP from redis
    const redisKey = `admin_otp:${adminEmail}`;
    const otp = await redisClient.get(redisKey);

    // 3. verify OTP
    const res = await request(app)
      .post("/api/v1/auth/admin/verify-otp")
      .send({ email: adminEmail, otp });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe(adminEmail);
  }, 15000);
});
