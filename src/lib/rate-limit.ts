import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "ratelimit:login",
    })
  : null;

export const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(80, "15 m"),
      prefix: "ratelimit:general",
    })
  : null;

// In-memory fallback for local dev without Upstash configured. Not safe
// across multiple serverless instances — production must set
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: max - entry.count };
}

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export async function checkLoginLimit(key: string) {
  if (loginLimiter) return loginLimiter.limit(key);
  return memoryLimit(`login:${key}`, 5, FIFTEEN_MIN_MS);
}

export async function checkGeneralLimit(key: string) {
  if (generalLimiter) return generalLimiter.limit(key);
  return memoryLimit(`general:${key}`, 80, FIFTEEN_MIN_MS);
}
