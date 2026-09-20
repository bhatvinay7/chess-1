import { redisClient as redis } from "@repo/redis-client";

export const OTP_TTL_SECONDS = 600;

export function buildOtpKey(namespace: string, email: string): string {
  return `${namespace}:${email}`;
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function storeOtp(key: string, code: string): Promise<void> {
  await redis.set(key, code, { EX: OTP_TTL_SECONDS });
}

export async function consumeOtp(
  key: string,
  code: string,
): Promise<{ valid: boolean; expired: boolean }> {
  const stored = await redis.get(key);
  if (!stored) return { valid: false, expired: true };
  if (stored !== code) return { valid: false, expired: false };
  await redis.del(key);
  return { valid: true, expired: false };
}
