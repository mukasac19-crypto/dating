import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// 1. Fail-safe Redis initialization
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// --- TIER 1: GLOBAL PROTECTION (Used in Middleware) ---

// Anonymous users: 10 requests per 60s (Stops basic scraping)
const anonymousRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit:anon",
});

// Authenticated users: 100 requests per 60s (General API usage)
const authenticatedRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  analytics: true,
  prefix: "@upstash/ratelimit:auth",
});

// --- TIER 2: COST PROTECTION (Used in Specific API Routes) ---

// OCR (GPT-4o Vision): Very Expensive. Limit: 5 per minute.
export const ocrRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "@upstash/ratelimit:ocr",
});

// Deep Analysis (Large Context): Expensive. Limit: 5 per minute.
export const analysisRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "@upstash/ratelimit:analysis",
});

// Chat: Moderate Cost. Limit: 20 messages per minute.
export const chatRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "@upstash/ratelimit:chat",
});

// Anonymous (logged-out / ad-funnel) analysis: strict per-IP DAILY cap so bots
// and ad-scrapers can't burn AI spend. Keyed by IP, not user id.
export const ANON_ANALYSIS_DAILY_LIMIT = 2;
export const anonAnalysisRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(ANON_ANALYSIS_DAILY_LIMIT, "86400 s"),
  prefix: "@upstash/ratelimit:anon-analysis",
});

/**
 * Enforce the strict anonymous-analysis cap for a given IP. Returns true if the
 * request is allowed, false if the daily limit is exhausted. Fails open if
 * Redis is unavailable.
 */
export async function checkAnonAnalysisLimit(ip: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true;
  }
  try {
    const { success } = await anonAnalysisRatelimit.limit(`ip:${ip}`);
    return success;
  } catch (error) {
    console.error("Anon analysis rate limit error (Fail-Open):", error);
    return true;
  }
}

/**
 * Retrieves the client's real IP address, handling proxies and load balancers.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  if (realIp) {
    return realIp.trim();
  }
  return request.ip ?? "127.0.0.1";
}

/**
 * Global Middleware Rate Limiter
 * Handles the basic "Anonymous vs Authenticated" tier.
 */
export async function rateLimiter(request: NextRequest, userId?: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Rate limiting disabled: Missing Upstash Redis credentials.");
    return null;
  }

  const ip = getClientIp(request);
  const identifier = userId ?? ip;
  
  // Select the appropriate limiter based on auth status
  const limiter = userId ? authenticatedRatelimit : anonymousRatelimit;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      const resetTime = new Date(reset).toLocaleTimeString();
      return new NextResponse(
        JSON.stringify({
          error: `Too many requests. Please try again after ${resetTime}.`,
          code: "RATE_LIMIT_EXCEEDED"
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }
  } catch (error) {
    // Fail-Open: Allow request if Redis is down
    console.error("Rate limit error (Fail-Open):", error);
  }

  return null;
}



