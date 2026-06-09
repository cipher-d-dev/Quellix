import type { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

interface RequestRecord {
  timestamps: number[];
}

const cache = new Map<string, RequestRecord>();

// Clean up expired records from cache every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of cache.entries()) {
    // We don't know the windowMs for all limits, but we can safely remove
    // keys whose latest request is older than 30 minutes.
    const latestRequest = record.timestamps[record.timestamps.length - 1];
    if (latestRequest && now - latestRequest > 30 * 60 * 1000) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // .unref() lets Node exit even if timer is running

/**
 * Creates an Express rate limiter middleware using an in-memory store.
 * Suitable for local development and preventing brute-force attacks on auth endpoints.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, message = "Too many requests. Please try again later." } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
    // Unique key combination of endpoint path + IP to avoid cross-endpoint pollution
    const key = `${req.path}:${ip}`;

    const now = Date.now();
    let record = cache.get(key);

    if (!record) {
      record = { timestamps: [] };
      cache.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((time) => now - time < windowMs);

    if (record.timestamps.length >= max) {
      // Return 429 Too Many Requests
      return res.status(429).json({
        success: false,
        error: message,
      });
    }

    // Record this request
    record.timestamps.push(now);
    return next();
  };
}

// Pre-defined rate limiters for critical endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 mins
  message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
});

export const totpVerifyRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 attempts per 5 mins to prevent brute-forcing
  message: "Too many verification attempts. Please try again after 5 minutes.",
});

export const webhookTestRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // 15 test fires per minute
  message: "Rate limit exceeded for webhook test fires. Please try again in a minute.",
});
