import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Client-supplied X-Forwarded-For is trivially spoofable — verified by
// testing directly against this app (rotating a fake header defeated every
// IP-keyed rate limit). Trust ordering:
//   1. x-vercel-forwarded-for — Vercel's edge overwrites this itself, a
//      client cannot set it, so it's safe to trust as-is on that platform.
//   2. x-forwarded-for, LAST entry — assumes exactly one trusted reverse
//      proxy in front (nginx, a load balancer, etc.) that appends the real
//      connecting IP as the final hop. The client can still forge earlier
//      entries in the chain, which is why the first entry is never trusted.
//   3. x-real-ip as a last resort.
// None of this is meaningful with no reverse proxy in front at all (e.g.
// hitting the origin directly) — there every header is attacker-controlled
// and IP-keyed limiting degrades to "unknown" for everyone. Deploy behind
// Vercel or a real reverse proxy for this to hold.
export function extractClientIp(headerList: Headers): string {
  const vercelForwardedFor = headerList.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor.split(",").map((h) => h.trim());
    return hops[hops.length - 1];
  }

  return headerList.get("x-real-ip") ?? "unknown";
}

// Server Actions are invoked as direct in-process calls, not HTTP requests
// through proxy.ts — get the caller's IP the same way from within an action.
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  return extractClientIp(headerList);
}

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
