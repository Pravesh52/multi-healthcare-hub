import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import ApiError from '../utils/ApiError.js';

const makeLimiter = ({ windowMs, limit, prefix, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // if Redis has a problem, don't block everyone
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    handler: (req, res, next) => next(ApiError.tooMany(message)),
  });

// 10 OTP requests per hour per IP
export const otpLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  prefix: 'otp',
  message: 'Too many OTP requests. Please try again after an hour',
});

// 10 login/signup attempts per 15 minutes per IP
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  prefix: 'auth',
  message: 'Too many attempts. Please try again after 15 minutes',
});