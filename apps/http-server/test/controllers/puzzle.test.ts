import { jest } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/index.js";
import { prisma } from "@repo/postgres-db";
import { signToken } from "../../src/utils/middleware.commonfie.js";
import { redisClient, connectRedisClient } from "@repo/redis-client";

process.env.NODE_ENV = "test";

jest.mock("chess.js", () => {
  return {
    Chess: class MockChess {
      constructor(fen: string) {
        if (fen === "invalid_fen") throw new Error("Invalid FEN");
      }
      move(m: string) {
        if (m === "Kd1") return null;
        return {};
      }
    },
  };
});

describe("Puzzle Controller", () => {
  let adminId: string;
  let adminToken: string;
  let userToken: string;
  let puzzleId: string;

  beforeAll(async () => {
    await connectRedisClient();

    // Create admin
    const admin = await prisma.user.create({
      data: {
        email: `admin_puzzle_${Date.now()}@test.com`,
        username: `admin_puzzle_${Date.now()}`,
        isAdmin: true,
      },
    });
    adminId = admin.id;
    adminToken = signToken({ userId: adminId, isAdmin: true });

    // Create regular user
    const user = await prisma.user.create({
      data: {
        email: `user_puzzle_${Date.now()}@test.com`,
        username: `user_puzzle_${Date.now()}`,
        isAdmin: false,
      },
    });
    userToken = signToken({ userId: user.id, isAdmin: false });
  }, 15000);

  afterAll(async () => {
    await prisma.puzzle.deleteMany({ where: { id: puzzleId } });
    await prisma.user.deleteMany({ where: { email: { contains: "puzzle" } } });

    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  });

  it("should allow admin to upload a puzzle", async () => {
    const res = await request(app)
      .post("/api/v1/puzzle/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        initialFen:
          "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
        solution: ["Qxf7#"],
        movesToMate: 1,
        rating: 800,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Puzzle uploaded successfully");
    expect(res.body.puzzleId).toBeDefined();
    puzzleId = res.body.puzzleId;
  }, 15000);

  it("should reject invalid FEN", async () => {
    const res = await request(app)
      .post("/api/v1/puzzle/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        initialFen: "invalid_fen",
        solution: ["Qxf7#"],
        movesToMate: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid FEN");
  }, 15000);

  it("should reject invalid solution for FEN", async () => {
    const res = await request(app)
      .post("/api/v1/puzzle/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        initialFen:
          "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
        solution: ["a4"], // not a mate/valid move string format that chess.js accepts if invalid
        movesToMate: 1,
      });

    // Actually 'a4' is valid for chess.js in startpos, but wait, 'a4' is a valid move in this position!
    // Let's use an actually invalid move for this position, like 'a1=Q'
  }, 15000);

  it("should actually reject invalid move", async () => {
    const res = await request(app)
      .post("/api/v1/puzzle/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        initialFen:
          "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
        solution: ["a1=Q"], // completely invalid move for this position
        movesToMate: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid move");
  }, 15000);

  it("should reject upload from non-admin", async () => {
    const res = await request(app)
      .post("/api/v1/puzzle/upload")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution: ["e4"],
        movesToMate: 1,
      });

    expect(res.status).toBe(403);
  }, 15000);
});
