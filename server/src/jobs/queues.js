import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { slotDateTime } from '../utils/time.js';
import logger from '../utils/logger.js';

// BullMQ gets its own Redis connection (it needs maxRetriesPerRequest: null)
export const bullConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
bullConnection.on('error', (err) => logger.error(`BullMQ Redis error: ${err.message}`));

export const QUEUE_NAME = 'multihealth-jobs';

export const jobsQueue = new Queue(QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

const REMINDER_BEFORE_MS = 2 * 60 * 60 * 1000; // 2 hours before the slot
const reminderId = (appointmentId) => `reminder-${appointmentId}`; // ':' is not allowed in job ids

// Never throws: a queue problem must not break approving an appointment
export const scheduleReminder = async (appt) => {
  try {
    const delay = slotDateTime(appt.date, appt.slot).getTime() - REMINDER_BEFORE_MS - Date.now();
    if (delay <= 0) return false; // appointment is too close, no reminder needed
    await jobsQueue.add('reminder', { appointmentId: String(appt._id) }, { jobId: reminderId(appt._id), delay });
    return true;
  } catch (err) {
    logger.error(`Could not schedule reminder: ${err.message}`);
    return false;
  }
};

export const cancelReminder = async (appointmentId) => {
  try {
    const job = await jobsQueue.getJob(reminderId(appointmentId));
    if (job) await job.remove();
  } catch {
    /* job already running or finished: the reminder job re-checks the status anyway */
  }
};

// Repeating job: safe to call on every start, it does not create duplicates
export const scheduleRecurringJobs = async () => {
  await jobsQueue.upsertJobScheduler('expire-pending', { every: 10 * 60 * 1000 }, { name: 'expire-pending' });
};