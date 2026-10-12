import { Worker } from 'bullmq';
import { pathToFileURL } from 'url';
import logger from '../utils/logger.js';
import { bullConnection, QUEUE_NAME, scheduleRecurringJobs } from './queues.js';
import { processReminder } from './reminder.job.js';
import { processExpire } from './expire.job.js';
import { processFollowUps } from './followup.job.js';

const QUIET = ['expire-pending', 'follow-up-reminders']; // logged only when they actually did something

export const startWorkers = async () => {
  await scheduleRecurringJobs();

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case 'reminder':
          return processReminder(job);
        case 'expire-pending':
          return processExpire(job);
        case 'follow-up-reminders':
          return processFollowUps(job);
        default:
          logger.warn(`Unknown job: ${job.name}`);
      }
    },
    {
      connection: bullConnection,
      concurrency: 5,
      drainDelay: 30, // wait longer when the queue is empty (saves Redis commands)
      stalledInterval: 120000,
    }
  );

  worker.on('completed', (job, result) => {
    if (!QUIET.includes(job.name) || result?.expired || result?.noShow || result?.sent) {
      logger.info(`Job done: ${job.name} ${JSON.stringify(result)}`);
    }
  });
  worker.on('failed', (job, err) => logger.error(`Job failed: ${job?.name} - ${err.message}`));
  worker.on('error', (err) => logger.error(`Worker error: ${err.message}`));

  logger.info('Background jobs started');
  return worker;
};

// Runs by itself when started with: npm run worker
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB } = await import('../config/db.js');
  await connectDB();
  await startWorkers();
}