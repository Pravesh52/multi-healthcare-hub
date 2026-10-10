import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS, VERIFICATION } from '../utils/constants.js';
import { getDaySlots } from '../services/slot.service.js';
import { notifyUser } from '../services/notify.service.js';
import { queueEvents } from '../services/queue.service.js';
import { cancelReminder } from '../jobs/queues.js';
import { slotDateTime } from '../utils/time.js';

const HOUR = 60 * 60 * 1000;
const MAX_RESCHEDULES = 2;
const MIN_NOTICE_HOURS = 2;

// Called after the doctor approves a reschedule request: the old booking is cancelled and its slot is freed
export const finishReschedule = async (fresh) => {
  const old = await Appointment.findOneAndUpdate(
    {
      _id: fresh.rescheduledFrom,
      status: { $in: [ST.PENDING, ST.APPROVED] },
      queueStatus: QS.NOT_ARRIVED,
    },
    { $set: { status: ST.CANCELLED, active: false } },
    { new: true }
  );
  if (!old) return;

  await cancelReminder(old._id);
  queueEvents.emit('changed', { doctorId: String(old.doctor), date: old.date });
};

export const reschedule = asyncHandler(async (req, res) => {
  const { date, slot } = req.body;

  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appt) throw ApiError.notFound('Appointment not found');

  if (![ST.PENDING, ST.APPROVED].includes(appt.status)) {
    throw ApiError.conflict(`This appointment is already ${appt.status}`);
  }
  if (appt.queueStatus !== QS.NOT_ARRIVED) throw ApiError.conflict('This visit has already started');
  if (appt.rescheduleCount >= MAX_RESCHEDULES) {
    throw ApiError.badRequest(`An appointment can be rescheduled only ${MAX_RESCHEDULES} times. Please cancel and book again`);
  }
  if (date === appt.date && slot === appt.slot) throw ApiError.badRequest('Please choose a different slot');
  if (appt.payment?.status === 'paid') {
    throw ApiError.badRequest('This appointment is paid online. Please cancel it (you will be refunded) and book again');
  }

  if (appt.status === ST.APPROVED) {
    const hoursLeft = (slotDateTime(appt.date, appt.slot).getTime() - Date.now()) / HOUR;
    if (hoursLeft < MIN_NOTICE_HOURS) {
      throw ApiError.badRequest(`Approved appointments can be rescheduled only ${MIN_NOTICE_HOURS} hours before the slot`);
    }
    if (await Appointment.exists({ rescheduledFrom: appt._id, status: ST.PENDING })) {
      throw ApiError.conflict('A reschedule request for this appointment is already waiting for the doctor');
    }
  }

  const doctor = await Doctor.findOne({ _id: appt.doctor, status: VERIFICATION.VERIFIED }).populate(
    'clinic',
    'status timings name'
  );
  if (!doctor || !doctor.clinic || doctor.clinic.status !== VERIFICATION.VERIFIED) {
    throw ApiError.notFound('This doctor is not available for booking');
  }

  const day = await getDaySlots(doctor, date);
  if (!day.open) throw ApiError.badRequest(day.reason);
  const found = day.slots.find((s) => s.time === slot);
  if (!found) throw ApiError.badRequest('This is not a valid slot for this doctor');
  if (!found.available) throw ApiError.conflict('This slot is not available. Please choose another slot');

  if (
    await Appointment.exists({
      patient: req.user._id,
      doctor: doctor._id,
      date,
      active: true,
      _id: { $ne: appt._id },
    })
  ) {
    throw ApiError.conflict('You already have another appointment with this doctor on that day');
  }

  const expiresAt = new Date(Math.min(Date.now() + 24 * HOUR, slotDateTime(date, slot).getTime()));

  // ---------- Pending: simply move it to the new slot ----------
  if (appt.status === ST.PENDING) {
    let updated;
    try {
      updated = await Appointment.findOneAndUpdate(
        { _id: appt._id, patient: req.user._id, status: ST.PENDING, queueStatus: QS.NOT_ARRIVED },
        { $set: { date, slot, expiresAt }, $inc: { rescheduleCount: 1 } },
        { new: true }
      );
    } catch (err) {
      // The unique index stops two people from taking the same slot
      if (err.code === 11000) throw ApiError.conflict('Someone just booked this slot. Please choose another slot');
      throw err;
    }
    if (!updated) throw ApiError.conflict('This appointment was just updated. Please refresh');

    await notifyUser(doctor.user, {
      type: 'system',
      title: 'Requested slot changed',
      message: `${req.user.name} changed the requested slot to ${date} at ${slot}.`,
      data: { appointmentId: updated._id },
    });

    return res.json({
      success: true,
      message: 'Your request was moved to the new slot. Waiting for the doctor to approve.',
      appointment: updated,
    });
  }

  // ---------- Approved: ask for a new slot, keep the old one until the doctor approves ----------
  let child;
  try {
    child = await Appointment.create({
      patient: req.user._id,
      doctor: appt.doctor,
      clinic: appt.clinic,
      date,
      slot,
      reason: appt.reason,
      expiresAt,
      rescheduledFrom: appt._id,
      rescheduleCount: appt.rescheduleCount + 1,
      payment: { mode: appt.payment?.mode || 'at_clinic', status: 'unpaid', amount: doctor.fees },
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('Someone just booked this slot. Please choose another slot');
    throw err;
  }

  await notifyUser(doctor.user, {
    type: 'system',
    title: 'Reschedule request',
    message: `${req.user.name} asked to move the approved appointment of ${appt.date} ${appt.slot} to ${date} at ${slot}. Approving the new request cancels the old one.`,
    data: { appointmentId: child._id, oldAppointmentId: appt._id },
  });

  res.status(201).json({
    success: true,
    message: 'Reschedule request sent. Your current appointment stays until the doctor approves the new slot.',
    appointment: child,
    current: appt,
  });
});