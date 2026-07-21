import type { Request, Response, NextFunction } from "express";
import { createClient } from "redis";

// ---------------------------------------------------------------------------
// Redis client — optional
//
// If REDIS_URL is set the limiter uses a Redis sorted-set sliding window.
// If it is not set (or the connection fails) we fall back to the in-process
// Map store so the server still starts in local dev without a Redis instance.
//
// The fallback is intentionally not production-safe: it resets on restart
// and doesn't scale across processes. Set REDIS_URL in production.
// ---------------------------------------------------------------------------

let redisClient: ReturnType<typeof createClient> | null = null;
let redisReady = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });

  redisClient.on("ready", () => {
    redisReady = true;
    console.log("[rate-limiter] Redis connected — using distributed store.");
  });

  redisClient.on("error", (err) => {
    redisReady = false;
    console.warn("[rate-limiter] Redis error — falling back to in-memory store:", err.message);
  });

  redisClient.connect().catch((err) => {
    redisReady = false;
    console.warn("[rate-limiter] Redis connect failed — falling back to in-memory store:", err.message);
  });
} else {
  console.warn(
    "[rate-limiter] REDIS_URL not set — using in-memory store. " +
    "This resets on restart and does not scale. Set REDIS_URL in production.",
  );
}

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------

interface RequestRecord {
  timestamps: number[];
}

const memoryCache = new Map<string, RequestRecord>();

// Prune stale entries every 5 minutes so the Map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryCache.entries()) {
    const latest = record.timestamps[record.timestamps.length - 1];
    if (latest && now - latest > 30 * 60 * 1000) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Redis sliding-window implementation
//
// Uses a sorted set per key:
//   ZADD  key <now_ms> <now_ms>        — add this request's timestamp
//   ZREMRANGEBYSCORE key 0 <window_start> — evict timestamps outside the window
//   ZCARD key                           — count requests in window
//   EXPIRE key <window_seconds>         — auto-clean up the key
//
// All four commands are pipelined in a single round-trip.
// ---------------------------------------------------------------------------

async function redisCheck(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  if (!redisClient || !redisReady) return false; // signal: use fallback

  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowSeconds = Math.ceil(windowMs / 1000);

    const pipeline = redisClient.multi();
    pipeline.zAdd(key, { score: now, value: String(now) });
    pipeline.zRemRangeByScore(key, 0, windowStart);
    pipeline.zCard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    // zCard result is the 3rd command (index 2)
    const count = results[2] as number;

    return count > max; // true = rate limited
  } catch (err) {
    console.warn("[rate-limiter] Redis pipeline error — falling back to memory:", (err as Error).message);
    return false; // fall through to memory store on error
  }
}

// ---------------------------------------------------------------------------
// In-memory sliding-window implementation (fallback)
// ---------------------------------------------------------------------------

function memoryCheck(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  let record = memoryCache.get(key);

  if (!record) {
    record = { timestamps: [] };
    memoryCache.set(key, record);
  }

  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= max) return true; // rate limited

  record.timestamps.push(now);
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Creates an Express rate-limiter middleware.
 *
 * Uses Redis sorted-set sliding window when REDIS_URL is configured and the
 * connection is healthy. Falls back to an in-process Map automatically.
 *
 * The external API is identical to the previous in-memory implementation so
 * all callers (sdkAuthRoutes, sdk2faRoutes, etc.) require no changes.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = "Too many requests. Please try again later.",
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
    // Scope the key to path + IP so limits don't bleed across endpoints
    const key = `qlx:rl:${req.path}:${ip}`;

    let isLimited: boolean;

    if (redisReady && redisClient) {
      isLimited = await redisCheck(key, windowMs, max);
      // If Redis errored mid-request, redisCheck returns false and we fall
      // through to the memory check below
      if (!redisReady) {
        isLimited = memoryCheck(key, windowMs, max);
      }
    } else {
      isLimited = memoryCheck(key, windowMs, max);
    }

    if (isLimited) {
      return res.status(429).json({ success: false, error: message });
    }

    return next();
  };
}

// ---------------------------------------------------------------------------
// Pre-built limiters — same names and configs as before so all import sites
// require zero changes.
// ---------------------------------------------------------------------------

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
});

export const totpVerifyRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: "Too many verification attempts. Please try again after 5 minutes.",
});

export const webhookTestRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  message: "Rate limit exceeded for webhook test fires. Please try again in a minute.",
});
