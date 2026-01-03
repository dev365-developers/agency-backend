// middleware/rateLimiter.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 3600000); // 1 hour

/**
 * Rate limiter middleware factory
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @param message - Custom error message
 */
export const createRateLimiter = (
  maxRequests: number = 5,
  windowMs: number = 24 * 60 * 60 * 1000, // 24 hours default
  message: string = 'Too many requests, please try again later'
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.auth?.userId;

    if (!userId) {
      // If no auth, allow the request to proceed (auth middleware will handle it)
      return next();
    }

    const key = `${userId}:${req.path}`;
    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Reset if window has passed
    if (store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Increment counter
    store[key].count++;

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const resetInHours = Math.ceil((store[key].resetTime - now) / 3600000);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: store[key].resetTime,
        message: `You have exceeded the limit of ${maxRequests} requests. Please try again in ${resetInHours} hour(s).`,
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - store[key].count).toString());
    res.setHeader('X-RateLimit-Reset', store[key].resetTime.toString());

    next();
  };
};

/**
 * Support request rate limiter
 * Limits users to 5 support requests per day
 */
export const supportRequestLimiter = createRateLimiter(
  5, // Max 5 requests
  24 * 60 * 60 * 1000, // Per 24 hours
  'You have reached the daily limit for support requests'
);

/**
 * General API rate limiter
 * Limits users to 100 requests per hour
 */
export const generalApiLimiter = createRateLimiter(
  100, // Max 100 requests
  60 * 60 * 1000, // Per hour
  'Too many API requests, please slow down'
);