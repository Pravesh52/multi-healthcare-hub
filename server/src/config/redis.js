import Redis from 'ioredis';
import { env } from './env.js';
import logger from '../utils/logger.js';

// maxRetriesPerRequest must be null for BullMQ to work later
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

export const connectRedis = async () => {
  await redis.ping();
  logger.info('Redis connected');
};