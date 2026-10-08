import { EventEmitter } from 'events';
import Appointment from '../models/Appointment.js';
import { redis } from '../config/redis.js';
import ApiError from '../utils/ApiError.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS, PRIORITY } from '../utils/constants.js';
import { todayIST, nowMinutesIST, toHHmm } from '../utils/time.js';
import { notifyUser } from './notify.service.js';

const MAX_CALLED_SKIPS = 2; // skipped twice after being called => no show

// Step 7 will listen to this and push live updates through Socket.io
export const queueEvents = new EventEmitter();
const changed = (doctorId, date = todayIST()) =>
  queueEvents.emit('changed', { doctorId: String(doctorId), date });

// ---------- Reading the queue ----------
const avgConsultation = async (doctor) => {
  const recent = await Appointment.find({
    doctor: doctor._id,
    queueStatus: QS.COMPLETED,
    consultationMinutes: { $gt: 0 },
  })
    .sort({ completedAt: -1 })
    .limit(10)
    .select('consultationMinutes')
    .lean();

  if (!recent.length) return doctor.slotMinutes || 15;
  const avg = recent.reduce((sum, a) => sum + a.consultationMinutes, 0) / recent.length;
  return Math.max(1, Math.round(avg));
};

// Emergency first, then whoever checked in first
const sortWaiting = (list) =>
  list.sort((a, b) => {
    const rank = (x) => (x.priority === PRIORITY.EMERGENCY ? 0 : 1);
    return (
      rank(a) - rank(b) ||
      new Date(a.checkedInAt) - new Date(b.checkedInAt) ||
      a.tokenNo - b.tokenNo
    );
  });

export const getQueue = async (doctor, date = todayIST()) => {
  const [all, avg] = await Promise.all([
    Appointment.find({
      doctor: doctor._id,
      date,
      tokenNo: { $type: 'number' },
      status: { $in: [ST.APPROVED, ST.COMPLETED, ST.NO_SHOW] },
    })
      .populate('patient', 'name age gender phone')
      .lean(),
    avgConsultation(doctor),
  ]);

  const shape = (a) => ({
    appointmentId: a._id,
    tokenNo: a.tokenNo,
    patient: a.patient,
    slot: a.slot,
    reason: a.reason,
    priority: a.priority,
    isWalkIn: a.isWalkIn,
    skipCount: a.skipCount,
    checkedInAt: a.checkedInAt,
  });

  const serving = all.find((a) => a.queueStatus === QS.NOW_SERVING) || null;
  const waitingList = sortWaiting(
    all.filter((a) => a.status === ST.APPROVED && a.queueStatus === QS.WAITING)
  );
  const base = serving ? 1 : 0;

  return {
    avgMinutes: avg,
    paused: !!doctor.queuePaused,
    serving: serving && shape(serving),
    waiting: waitingList.map((a, i) => ({ ...shape(a), ahead: base + i, etaMinutes: (base + i) * avg })),
    notArrived: all
      .filter((a) => a.status === ST.APPROVED && a.queueStatus === QS.NOT_ARRIVED)
      .sort((a, b) => a.tokenNo - b.tokenNo)
      .map(shape),
    completedCount: all.filter((a) => a.queueStatus === QS.COMPLETED).length,
    noShowCount: all.filter((a) => a.status === ST.NO_SHOW).length,
    totalToday: all.length,
  };
};

// What a patient sees for today's appointments (no other patient's details)
export const patientStatus = async (patientId) => {
  const date = todayIST();
  const appts = await Appointment.find({
    patient: patientId,
    date,
    status: { $in: [ST.APPROVED, ST.COMPLETED] },
    tokenNo: { $type: 'number' },
  })
    .populate({
      path: 'doctor',
      select: 'user slotMinutes queuePaused speciality',
      populate: { path: 'user', select: 'name' },
    })
    .populate('clinic', 'name')
    .sort({ slot: 1 });

  const result = [];
  for (const a of appts) {
    const q = await getQueue(a.doctor, date);
    const mine = q.waiting.find((w) => String(w.appointmentId) === String(a._id));

    let state = 'not_checked_in';
    if (a.queueStatus === QS.COMPLETED) state = 'completed';
    else if (a.queueStatus === QS.NOW_SERVING) state = 'your_turn';
    else if (a.queueStatus === QS.WAITING) state = mine?.ahead === 0 ? 'next' : 'waiting';

    result.push({
      appointmentId: a._id,
      tokenNo: a.tokenNo,
      date: a.date,
      slot: a.slot,
      doctorName: a.doctor.user.name,
      clinicName: a.clinic.name,
      state,
      ahead: mine ? mine.ahead : null,
      etaMinutes: mine ? mine.etaMinutes : null,
      nowServingToken: q.serving?.tokenNo ?? null,
      paused: q.paused,
    });
  }
  return result;
};

// ---------- Actions ----------
export const checkIn = async (appt) => {
  if (appt.status !== ST.APPROVED) throw ApiError.conflict('Only an approved appointment can be checked in');
  if (appt.date !== todayIST()) throw ApiError.badRequest('Check-in is possible only on the appointment day');
  if (appt.queueStatus !== QS.NOT_ARRIVED) throw ApiError.conflict('This patient is already checked in');

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: ST.APPROVED, queueStatus: QS.NOT_ARRIVED },
    { $set: { queueStatus: QS.WAITING, checkedInAt: new Date() } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This patient was just checked in. Please refresh');

  changed(appt.doctor, appt.date);
  return updated;
};

export const callNext = async (doctor) => {
  if (doctor.queuePaused) throw ApiError.conflict('The queue is paused. Resume it first');

  const date = todayIST();
  const lockKey = `lock:queue:${doctor._id}:${date}`;

  // The lock makes sure two Call Next clicks at the same moment cannot serve two patients
  const locked = await redis.set(lockKey, '1', 'EX', 5, 'NX');
  if (!locked) throw ApiError.conflict('Another action is in progress. Please try again');

  try {
    if (await Appointment.exists({ doctor: doctor._id, date, queueStatus: QS.NOW_SERVING })) {
      throw ApiError.conflict('Press Done for the current patient first');
    }

    const waiting = sortWaiting(
      await Appointment.find({
        doctor: doctor._id,
        date,
        status: ST.APPROVED,
        queueStatus: QS.WAITING,
      }).lean()
    );
    if (!waiting.length) throw ApiError.notFound('No patient is waiting');

    const now = new Date();
    const next = await Appointment.findOneAndUpdate(
      { _id: waiting[0]._id, status: ST.APPROVED, queueStatus: QS.WAITING },
      { $set: { queueStatus: QS.NOW_SERVING, calledAt: now, startedAt: now } },
      { new: true }
    ).populate('patient', 'name');
    if (!next) throw ApiError.conflict('This patient was just updated. Please try again');

    await notifyUser(
      next.patient._id,
      {
        type: 'your_turn',
        title: 'It is your turn',
        message: `It is your turn (token #${next.tokenNo}). Please go inside. - MultiHealth Care Hub`,
        data: { appointmentId: next._id },
      },
      { sms: true }
    );

    if (waiting[1]) {
      await notifyUser(waiting[1].patient, {
        type: 'queue_update',
        title: 'You are next',
        message: `You are next in line (token #${waiting[1].tokenNo}). Please be ready.`,
        data: { appointmentId: waiting[1]._id },
      });
    }

    changed(doctor._id, date);
    return next;
  } finally {
    await redis.del(lockKey);
  }
};

export const markDone = async (appt) => {
  if (appt.queueStatus !== QS.NOW_SERVING) {
    throw ApiError.conflict('This patient is not being served right now');
  }

  const now = new Date();
  const started = appt.startedAt || appt.calledAt || now;
  const minutes = Math.max(0.1, Math.round(((now - started) / 60000) * 10) / 10);

  const done = await Appointment.findOneAndUpdate(
    { _id: appt._id, queueStatus: QS.NOW_SERVING },
    {
      $set: {
        status: ST.COMPLETED,
        active: false,
        queueStatus: QS.COMPLETED,
        completedAt: now,
        consultationMinutes: minutes,
      },
    },
    { new: true }
  );
  if (!done) throw ApiError.conflict('This visit was just completed. Please refresh');

  await notifyUser(appt.patient, {
    type: 'system',
    title: 'Visit complete',
    message: 'Your visit is complete. You can now rate your experience.',
    data: { appointmentId: appt._id },
  });

  changed(appt.doctor, appt.date);
  return done;
};

export const skip = async (appt) => {
  if (appt.status !== ST.APPROVED || ![QS.WAITING, QS.NOW_SERVING].includes(appt.queueStatus)) {
    throw ApiError.conflict('Only a waiting or called patient can be skipped');
  }

  const wasCalled = appt.queueStatus === QS.NOW_SERVING;
  const skips = appt.skipCount + (wasCalled ? 1 : 0);
  const noShow = wasCalled && skips >= MAX_CALLED_SKIPS;

  const update = noShow
    ? { $set: { status: ST.NO_SHOW, active: false, queueStatus: QS.NO_SHOW, skipCount: skips } }
    : {
        $set: { queueStatus: QS.WAITING, checkedInAt: new Date(), skipCount: skips }, // goes to the bottom
        ...(wasCalled && { $unset: { calledAt: 1, startedAt: 1 } }),
      };

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: ST.APPROVED, queueStatus: { $in: [QS.WAITING, QS.NOW_SERVING] } },
    update,
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This patient was just updated. Please refresh');

  changed(appt.doctor, appt.date);
  return { appointment: updated, noShow };
};

export const makeEmergency = async (appt) => {
  if (appt.status !== ST.APPROVED || ![QS.NOT_ARRIVED, QS.WAITING].includes(appt.queueStatus)) {
    throw ApiError.conflict('Only a patient who is not yet called can be marked as emergency');
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: ST.APPROVED, queueStatus: { $in: [QS.NOT_ARRIVED, QS.WAITING] } },
    { $set: { priority: PRIORITY.EMERGENCY, queueStatus: QS.WAITING, checkedInAt: appt.checkedInAt || new Date() } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This patient was just updated. Please refresh');

  changed(appt.doctor, appt.date);
  return updated;
};

export const setPaused = async (doctor, paused) => {
  doctor.queuePaused = paused;
  await doctor.save();
  changed(doctor._id);
  return doctor;
};

// Patient came straight to the clinic (no online booking)
export const createWalkIn = async ({ doctor, patient, reason, emergency }) => {
  const date = todayIST();
  const baseMin = nowMinutesIST();

  // Token and slot are unique. If another request took them first, we simply try the next one.
  for (let attempt = 0; attempt < 8; attempt++) {
    const last = await Appointment.findOne({ doctor: doctor._id, date, tokenNo: { $type: 'number' } })
      .sort({ tokenNo: -1 })
      .select('tokenNo')
      .lean();
    const tokenNo = (last?.tokenNo || 0) + 1;
    const slot = toHHmm((baseMin + attempt) % 1440);
    const now = new Date();

    try {
      const appt = await Appointment.create({
        patient: patient._id,
        doctor: doctor._id,
        clinic: doctor.clinic,
        date,
        slot,
        reason,
        isWalkIn: true,
        status: ST.APPROVED,
        approvedAt: now,
        tokenNo,
        queueStatus: QS.WAITING,
        checkedInAt: now,
        priority: emergency ? PRIORITY.EMERGENCY : PRIORITY.NORMAL,
        payment: { mode: 'at_clinic', status: 'unpaid', amount: doctor.fees },
      });
      changed(doctor._id, date);
      return appt;
    } catch (err) {
      if (err.code !== 11000 || attempt === 7) throw err;
    }
  }
};