/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting using Redis.
 * Falls back to in-memory store if Redis is unavailable.
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { AuthenticatedRequest } from './auth';

// Redis client (lazy initialization)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry, fall back to memory
      });
      redis.on('error', () => {
        console.warn('Redis connection error, falling back to memory store');
        redis = null;
      });
    } catch {
      console.warn('Failed to connect to Redis, using memory store');
    }
  }
  return redis;
}

// In-memory fallback store
const memoryStore: Map<string, { count: number; resetTime: number }> = new Map();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip rate limiting for certain requests
    if (skip(req)) {
      next();
      return;
    }

    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const redisClient = getRedis();

      if (redisClient) {
        // Use Redis sliding window
        const result = await redisRateLimit(redisClient, key, now, windowStart, max);
        setRateLimitHeaders(res, result.remaining, result.resetTime, max);

        if (result.limited) {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests, please try again later',
              retryAfter: Math.ceil((result.resetTime - now) / 1000),
            },
          });
          return;
        }
      } else {
        // Use in-memory fallback
        const result = memoryRateLimit(key, now, windowMs, max);
        setRateLimitHeaders(res, result.remaining, result.resetTime, max);

        if (result.limited) {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests, please try again later',
              retryAfter: Math.ceil((result.resetTime - now) / 1000),
            },
          });
          return;
        }
      }

      next();
    } catch (error) {
      // On error, allow the request (fail open for availability)
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Default key generator - uses user ID or IP
 */
function defaultKeyGenerator(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.user?.uid || req.ip || 'anonymous';
}

/**
 * Redis-based rate limiting using sorted sets
 */
async function redisRateLimit(
  client: Redis,
  key: string,
  now: number,
  windowStart: number,
  max: number
): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
  const pipeline = client.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Add current request
  pipeline.zadd(key, now.toString(), `${now}-${Math.random()}`);

  // Count requests in window
  pipeline.zcard(key);

  // Set expiry on the key
  pipeline.expire(key, Math.ceil((now - windowStart) / 1000) + 1);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  return {
    limited: count > max,
    remaining: Math.max(0, max - count),
    resetTime: now + (now - windowStart),
  };
}

/**
 * In-memory rate limiting fallback
 */
function memoryRateLimit(
  key: string,
  now: number,
  windowMs: number,
  max: number
): { limited: boolean; remaining: number; resetTime: number } {
  const record = memoryStore.get(key);

  if (!record || record.resetTime < now) {
    // New window
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: max - 1, resetTime: now + windowMs };
  }

  // Existing window
  record.count++;
  memoryStore.set(key, record);

  return {
    limited: record.count > max,
    remaining: Math.max(0, max - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Set rate limit headers
 */
function setRateLimitHeaders(
  res: Response,
  remaining: number,
  resetTime: number,
  limit: number
): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
}

/**
 * Specific rate limiters for different endpoints
 */
export const rateLimiters = {
  // Orders: 10 per minute
  orders: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => `orders:${(req as AuthenticatedRequest).user?.uid || req.ip}`,
  }),

  // Location updates: 2 per second
  location: rateLimit({
    windowMs: 1000,
    max: 2,
    keyGenerator: (req) => `location:${(req as AuthenticatedRequest).user?.uid || req.ip}`,
  }),

  // Authentication: 5 per minute
  auth: rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => `auth:${req.ip}`,
  }),

  // General API: 100 per minute
  general: rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),
};
