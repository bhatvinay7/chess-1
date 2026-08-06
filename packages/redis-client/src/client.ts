import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
dotenv.config();

type RedisClient = RedisClientType;

const redisClient: RedisClient = createClient({
  url: process.env.REDIS_URL! ?? "redis://localhost:6379",
});

redisClient.on("error", (err: Error) =>
  console.error("Redis client error:", err),
);

export async function connectRedisClient(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export { redisClient };
