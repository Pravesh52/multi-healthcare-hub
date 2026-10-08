import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { queueEvents, getQueue } from '../services/queue.service.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const DEBOUNCE_MS = 150;
const timers = new Map();

const stateFor = (appt, mine) => {
  if (appt.status === ST.NO_SHOW) return 'no_show';
  if (appt.queueStatus === QS.COMPLETED) return 'completed';
  if (appt.queueStatus === QS.NOW_SERVING) return 'your_turn';
  if (appt.queueStatus === QS.WAITING) return mine?.ahead === 0 ? 'next' : 'waiting';
  return 'not_checked_in';
};

const broadcast = async (io, { doctorId, date }) => {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return;

  const queue = await getQueue(doctor, date);

  // Full queue: only doctor and their clinic
  io.to(`doctor:${doctorId}`).emit('queue:update', { doctorId, date, ...queue });

  // Each patient gets only their own status
  const appts = await Appointment.find({
    doctor: doctorId,
    date,
    tokenNo: { $type: 'number' },
    status: { $in: [ST.APPROVED, ST.COMPLETED, ST.NO_SHOW] },
  })
    .select('patient tokenNo status queueStatus')
    .lean();

  for (const a of appts) {
    const mine = queue.waiting.find((w) => String(w.appointmentId) === String(a._id));
    io.to(`user:${a.patient}`).emit('queue:status', {
      appointmentId: a._id,
      doctorId,
      date,
      tokenNo: a.tokenNo,
      state: stateFor(a, mine),
      ahead: mine ? mine.ahead : null,
      etaMinutes: mine ? mine.etaMinutes : null,
      nowServingToken: queue.serving?.tokenNo ?? null,
      paused: queue.paused,
    });
  }
};

export const registerQueueSocket = (io) => {
  queueEvents.on('changed', (evt) => {
    const key = `${evt.doctorId}:${evt.date}`;
    clearTimeout(timers.get(key));
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        broadcast(io, evt).catch((err) => logger.error(`Queue broadcast failed: ${err.message}`));
      }, DEBOUNCE_MS)
    );
  });
};