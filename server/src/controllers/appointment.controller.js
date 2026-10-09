import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS, ROLES, VERIFICATION } from '../utils/constants.js';
import { getDaySlots } from '../services/slot.service.js';
import { notifyUser } from '../services/notify.service.js';
import { todayIST, slotDateTime } from '../utils/time.js';
import { queueEvents } from '../services/queue.service.js';
import { scheduleReminder, cancelReminder } from '../jobs/queues.js';
import { refund } from '../services/payment.service.js';
import logger from '../utils/logger.js';


const HOUR = 60 * 60 * 1000;
const MAX_PENDING_PER_PATIENT = 5;
const MIN_CANCEL_NOTICE_HOURS = 2;

const patientView = [
  { path: 'doctor', select: 'speciality fees user', populate: { path: 'user', select: 'name' } },
  { path: 'clinic', select: 'name address phone' },
];

// Only a verified doctor of a verified clinic can be booked
const findBookableDoctor = async (id) => {
  const doctor = await Doctor.findOne({ _id: id, status: VERIFICATION.VERIFIED }).populate(
    'clinic',
    'status timings name'
  );
  if (!doctor || !doctor.clinic || doctor.clinic.status !== VERIFICATION.VERIFIED) {
    throw ApiError.notFound('This doctor is not available for booking');
  }
  return doctor;
};

const myDoctor = async (userId) => {
  const doctor = await Doctor.findOne({ user: userId });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');
  return doctor;
};

// ---------- Slots (public) ----------
export const getSlots = asyncHandler(async (req, res) => {
  const doctor = await findBookableDoctor(req.params.id);
  const day = await getDaySlots(doctor, req.query.date);
  res.json({
    success: true,
    doctor: { id: doctor._id, fees: doctor.fees, slotMinutes: doctor.slotMinutes },
    date: req.query.date,
    ...day,
  });
});

// ---------- Patient: request an appointment ----------
export const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, slot, reason, paymentMode } = req.body;

  const doctor = await findBookableDoctor(doctorId);

  const day = await getDaySlots(doctor, date);
  if (!day.open) throw ApiError.badRequest(day.reason);

  const found = day.slots.find((s) => s.time === slot);
  if (!found) throw ApiError.badRequest('This is not a valid slot for this doctor');
  if (!found.available) throw ApiError.conflict('This slot is not available. Please choose another slot');

  if (await Appointment.exists({ patient: req.user._id, doctor: doctor._id, date, active: true })) {
    throw ApiError.conflict('You already have an appointment with this doctor on this day');
  }

  const pending = await Appointment.countDocuments({ patient: req.user._id, status: ST.PENDING });
  if (pending >= MAX_PENDING_PER_PATIENT) {
    throw ApiError.tooMany('You have too many pending requests. Please wait for the doctors to reply');
  }

  // The doctor gets up to 24 hours to reply, but never beyond the slot time
  const expiresAt = new Date(Math.min(Date.now() + 24 * HOUR, slotDateTime(date, slot).getTime()));

  let appointment;
  try {
    appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctor._id,
      clinic: doctor.clinic._id,
      date,
      slot,
      reason,
      expiresAt,
      payment: { mode: paymentMode, status: 'unpaid', amount: doctor.fees },
    });
  } catch (err) {
    // The unique index stops two people from taking the same slot at the same moment
    if (err.code === 11000) throw ApiError.conflict('Someone just booked this slot. Please choose another slot');
    throw err;
  }

  await notifyUser(doctor.user, {
    type: 'request_sent',
    title: 'New appointment request',
    message: `${req.user.name} requested ${date} at ${slot}.`,
    data: { appointmentId: appointment._id },
  });

  res.status(201).json({
    success: true,
    message: 'Request sent. You will get your receipt once the doctor approves.',
    appointment,
  });
});

// ---------- Patient: my appointments ----------
export const listMine = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const filter = { patient: req.user._id };
  if (status) filter.status = status;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ date: -1, slot: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(patientView),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), appointments });
});

// ---------- Patient: cancel ----------
export const cancel = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appt) throw ApiError.notFound('Appointment not found');

  if (![ST.PENDING, ST.APPROVED].includes(appt.status)) {
    throw ApiError.conflict(`This appointment is already ${appt.status}`);
  }
  if ([QUEUE_STATUS.NOW_SERVING, QUEUE_STATUS.COMPLETED].includes(appt.queueStatus)) {
    throw ApiError.conflict('This visit has already started');
  }
  if (appt.status === ST.APPROVED) {
    const hoursLeft = (slotDateTime(appt.date, appt.slot).getTime() - Date.now()) / HOUR;
    if (hoursLeft < MIN_CANCEL_NOTICE_HOURS) {
      throw ApiError.badRequest(
        `Approved appointments can be cancelled only ${MIN_CANCEL_NOTICE_HOURS} hours before the slot`
      );
    }
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: { $in: [ST.PENDING, ST.APPROVED] } },
    { $set: { status: ST.CANCELLED, active: false } }, // active:false frees the slot for others
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This appointment was just updated. Please refresh');

    await cancelReminder(appt._id);

  // If the patient already paid online, give the money back
  if (appt.payment?.status === 'paid' && appt.payment.razorpayPaymentId) {
    try {
      await refund(appt.payment.razorpayPaymentId, appt.payment.amount);
      await Appointment.updateOne({ _id: appt._id }, { $set: { 'payment.status': 'refunded' } });
    } catch (err) {
      logger.error(`Refund failed for appointment ${appt._id}: ${err.message}`);
    }
  }

  const doctor = await Doctor.findById(appt.doctor).select('user');
  if (doctor) {
    await notifyUser(doctor.user, {
      type: 'system',
      title: 'Appointment cancelled',
      message: `${req.user.name} cancelled the appointment on ${appt.date} at ${appt.slot}.`,
      data: { appointmentId: appt._id },
    });
  }

    queueEvents.emit('changed', { doctorId: String(appt.doctor), date: appt.date });

  res.json({ success: true, message: 'Appointment cancelled', appointment: updated });
});

// ---------- Doctor: my requests / schedule ----------
export const listForDoctor = asyncHandler(async (req, res) => {
  const doctor = await myDoctor(req.user._id);
  const { status, date, page, limit } = req.query;

  const filter = { doctor: doctor._id };
  if (status) filter.status = status;
  if (date) filter.date = date;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ date: 1, slot: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('patient', 'name age gender phone'),
    Appointment.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), appointments });
});

// ---------- Doctor: approve ----------
export const approve = asyncHandler(async (req, res) => {
  const doctor = await myDoctor(req.user._id);
  const appt = await Appointment.findOne({ _id: req.params.id, doctor: doctor._id });
  if (!appt) throw ApiError.notFound('Appointment not found');

  if (appt.status !== ST.PENDING) throw ApiError.conflict(`This request is already ${appt.status}`);

  if (appt.expiresAt && appt.expiresAt < new Date()) {
    await Appointment.updateOne({ _id: appt._id, status: ST.PENDING }, { $set: { status: ST.EXPIRED, active: false } });
    throw ApiError.badRequest('This request has expired');
  }
  if (appt.date < todayIST()) throw ApiError.badRequest('The date of this appointment has passed');

  // Next token for this doctor on this day. If two approvals collide, the unique index makes one retry.
  let updated = null;
  for (let attempt = 0; attempt < 5 && !updated; attempt++) {
    const last = await Appointment.findOne({
      doctor: doctor._id,
      date: appt.date,
      tokenNo: { $type: 'number' },
    })
      .sort({ tokenNo: -1 })
      .select('tokenNo')
      .lean();
    const tokenNo = (last?.tokenNo || 0) + 1;

    try {
      updated = await Appointment.findOneAndUpdate(
        { _id: appt._id, status: ST.PENDING },
        {
          $set: {
            status: ST.APPROVED,
            active: true,
            tokenNo,
            approvedAt: new Date(),
            queueStatus: QUEUE_STATUS.NOT_ARRIVED,
          },
        },
        { new: true }
      );
      if (!updated) throw ApiError.conflict('This request was just handled. Please refresh');
    } catch (err) {
      if (err.code === 11000 && attempt < 4) continue; // token taken by a parallel approval
      throw err;
    }
  }

  await notifyUser(
    appt.patient,
    {
      type: 'approved',
      title: 'Appointment approved',
      message: `Your appointment with ${req.user.name} on ${appt.date} at ${appt.slot} is approved. Token #${updated.tokenNo}. - MultiHealth Care Hub`,
      data: { appointmentId: appt._id, tokenNo: updated.tokenNo },
    },
    { sms: true }
  );

    await scheduleReminder(updated);

    queueEvents.emit('changed', { doctorId: String(doctor._id), date: appt.date });

  res.json({ success: true, message: `Approved. Token #${updated.tokenNo}`, appointment: updated });
});

// ---------- Doctor: reject ----------
export const reject = asyncHandler(async (req, res) => {
  const doctor = await myDoctor(req.user._id);
  const appt = await Appointment.findOne({ _id: req.params.id, doctor: doctor._id });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.status !== ST.PENDING) throw ApiError.conflict(`This request is already ${appt.status}`);

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: ST.PENDING },
    { $set: { status: ST.REJECTED, active: false, rejectReason: req.body.reason } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This request was just handled. Please refresh');

  await notifyUser(
    appt.patient,
    {
      type: 'rejected',
      title: 'Appointment not accepted',
      message: `Your request for ${appt.date} at ${appt.slot} was not accepted. Reason: ${req.body.reason}. Please book another slot. - MultiHealth Care Hub`,
      data: { appointmentId: appt._id },
    },
    { sms: true }
  );

  res.json({ success: true, message: 'Request rejected', appointment: updated });
});

// ---------- One appointment (only people connected to it) ----------
export const canView = async (user, appt) => {
  if (user.role === ROLES.ADMIN) return true;
  if (user.role === ROLES.PATIENT) return String(appt.patient) === String(user._id);
  if (user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ user: user._id }).select('_id');
    return !!doctor && String(appt.doctor) === String(doctor._id);
  }
  if (user.role === ROLES.CLINIC) {
    const clinic = await Clinic.findOne({ owner: user._id }).select('_id');
    return !!clinic && String(appt.clinic) === String(clinic._id);
  }
  return false;
};

export const getOne = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  // Same message for "missing" and "not yours", so ids cannot be guessed
  if (!appt || !(await canView(req.user, appt))) throw ApiError.notFound('Appointment not found');

  await appt.populate([...patientView, { path: 'patient', select: 'name age gender phone' }]);
  res.json({ success: true, appointment: appt });
});