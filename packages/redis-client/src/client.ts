import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
dotenv.config();

type RedisClient = RedisClientType;

function sanitizeUrl(url?: string): string {
  if (!url) return "redis://localhost:6379";
  return url.trim().replace(/^['"]|['"]$/g, "");
}

const redisClient: RedisClient = createClient({
  url: sanitizeUrl(process.env.REDIS_URL),
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
