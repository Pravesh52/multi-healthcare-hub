import { redis } from '../config/redis.js';

const PREFIX = 'cache:';

// Returns the cached value, or runs loader() once and keeps the result for ttlSec seconds
export const cached = async (key, ttlSec, loader) => {
  try {
    const hit = await redis.get(PREFIX + key);
    if (hit) return JSON.parse(hit);
  } catch {
    /* Redis problem: fall through to the database */
  }

  const value = await loader();

  try {
    await redis.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSec);
  } catch {
    /* ignore */
  }
  return value;
};

// Deletes every cached value whose key starts with prefix
export const invalidate = async (prefix) => {
  try {
    const stream = redis.scanStream({ match: `${PREFIX}${prefix}*`, count: 100 });
    for await (const keys of stream) {
      if (keys.length) await redis.del(keys);
    }
  } catch {
    /* ignore */
  }
};