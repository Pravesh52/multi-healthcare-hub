import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { redis, connectRedis } from './config/redis.js';
import logger from './utils/logger.js';

const server = http.createServer(app);

const start = async () => {
  await connectDB();
  await connectRedis();
  server.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
};

start().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

const shutdown = (signal) => {
  logger.warn(`${signal} received. Shutting down...`);
  server.close(async () => {
    await mongoose.connection.close();
    redis.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error(`Unhandled rejection: ${err?.message || err}`));

export { server };