import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { redis, connectRedis } from './config/redis.js';
import { initSocket } from './sockets/index.js';
import { startWorkers } from './jobs/worker.js';
import logger from './utils/logger.js';

const server = http.createServer(app);
const io = initSocket(server);

const start = async () => {
  await connectDB();
  await connectRedis();
  server.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info('Socket.io ready');
  });
  if (env.runJobs) await startWorkers();
};

start().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  process.exit(1);
});

const shutdown = (signal) => {
  logger.warn(`${signal} received. Shutting down...`);
  io.close(async () => {
    await mongoose.connection.close();
    redis.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error(`Unhandled rejection: ${err?.message || err}`));

export { server, io };