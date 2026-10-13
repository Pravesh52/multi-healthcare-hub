import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS, ROLES, VERIFICATION } from '../utils/constants.js';
import { todayIST } from '../utils/time.js';
import { recordAccess } from '../middlewares/audit.js';
import { notifyUser } from '../services/notify.service.js';
import { refund } from '../services/payment.service.js';
import { cancelReminder } from '../jobs/queues.js';
import { queueEvents } from '../services/queue.service.js';
import { issueTokens } from '../services/token.service.js';
import { getIO } from '../sockets/io.js';
import { recompute } from './review.controller.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Ends the session of a user right now: refresh token removed, open sockets closed
const endSessions = async (userId) => {
  await User.updateOne({ _id: userId }, { $unset: { refreshTokenHash: 1 } });
  getIO()?.in(`user:${userId}`).disconnectSockets(true);
};

// Cancels upcoming appointments that have not started. Frees the slots, refunds online payments.
const cancelUpcoming = async (filter, reason, { notify = true } = {}) => {
  const open = [ST.PENDING, ST.APPROVED];
  const notStarted = [QS.NOT_ARRIVED, QS.WAITING];

  const appts = await Appointment.find({
    ...filter,
    date: { $gte: todayIST() },
    status: { $in: open },
    queueStatus: { $in: notStarted },
  }).limit(1000);

  let cancelled = 0;
  for (const a of appts) {
    const updated = await Appointment.findOneAndUpdate(
      { _id: a._id, status: { $in: open }, queueStatus: { $in: notStarted } },
      { $set: { status: ST.CANCELLED, active: false, rejectReason: reason } },
      { new: true }
    );
    if (!updated) continue;
    cancelled++;

    await cancelReminder(a._id);

    if (a.payment?.status === 'paid' && a.payment.razorpayPaymentId) {
      try {
        await refund(a.payment.razorpayPaymentId, a.payment.amount);
        await Appointment.updateOne({ _id: a._id }, { $set: { 'payment.status': 'refunded' } });
      } catch (err) {
        logger.error(`Refund failed for appointment ${a._id}: ${err.message}`);
      }
    }

    if (notify) {
      await notifyUser(a.patient, {
        type: 'system',
        title: 'Appointment cancelled',
        message: `Your appointment on ${a.date} at ${a.slot} was cancelled. Please book another doctor. Reason: ${reason}`,
        data: { appointmentId: a._id },
      });
    }
    queueEvents.emit('changed', { doctorId: String(a.doctor), date: a.date });
  }
  return cancelled;
};

// ---------- Suspend / reinstate a doctor ----------
export const suspendDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  if (doctor.status !== VERIFICATION.VERIFIED) throw ApiError.conflict('Only a verified doctor can be suspended');

  doctor.status = VERIFICATION.SUSPENDED;
  doctor.rejectReason = req.body.reason;
  await doctor.save();

  const cancelled = await cancelUpcoming({ doctor: doctor._id }, 'The doctor is not available');
  await endSessions(doctor.user);

  recordAccess(req, {
    action: 'DOCTOR_SUSPENDED',
    resourceType: 'Doctor',
    resourceId: doctor._id,
    subject: doctor.user,
    meta: { reason: req.body.reason, cancelledAppointments: cancelled },
  });
  res.json({ success: true, message: 'Doctor suspended', cancelledAppointments: cancelled, doctor });
});

export const reinstateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  if (doctor.status !== VERIFICATION.SUSPENDED) throw ApiError.conflict('This doctor is not suspended');

  doctor.status = VERIFICATION.VERIFIED;
  doctor.rejectReason = undefined;
  await doctor.save();

  recordAccess(req, { action: 'DOCTOR_REINSTATED', resourceType: 'Doctor', resourceId: doctor._id, subject: doctor.user });
  res.json({ success: true, message: 'Doctor reinstated', doctor });
});

// ---------- Suspend / reinstate a clinic ----------
export const suspendClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id);
  if (!clinic) throw ApiError.notFound('Clinic not found');
  if (clinic.status !== VERIFICATION.VERIFIED) throw ApiError.conflict('Only a verified clinic can be suspended');

  clinic.status = VERIFICATION.SUSPENDED;
  clinic.rejectReason = req.body.reason;
  await clinic.save();

  const cancelled = await cancelUpcoming({ clinic: clinic._id }, 'The clinic is not available');
  await endSessions(clinic.owner);

  recordAccess(req, {
    action: 'CLINIC_SUSPENDED',
    resourceType: 'Clinic',
    resourceId: clinic._id,
    subject: clinic.owner,
    meta: { reason: req.body.reason, cancelledAppointments: cancelled },
  });
  res.json({ success: true, message: 'Clinic suspended', cancelledAppointments: cancelled, clinic });
});

export const reinstateClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id);
  if (!clinic) throw ApiError.notFound('Clinic not found');
  if (clinic.status !== VERIFICATION.SUSPENDED) throw ApiError.conflict('This clinic is not suspended');

  clinic.status = VERIFICATION.VERIFIED;
  clinic.rejectReason = undefined;
  await clinic.save();

  recordAccess(req, { action: 'CLINIC_REINSTATED', resourceType: 'Clinic', resourceId: clinic._id, subject: clinic.owner });
  res.json({ success: true, message: 'Clinic reinstated', clinic });
});

// ---------- Users ----------
export const listUsers = asyncHandler(async (req, res) => {
  const { role, active, q, page, limit } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (active !== undefined) filter.isActive = active;
  if (q) {
    const rx = new RegExp(escape(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), users });
});

export const disableUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== ROLES.PATIENT) {
    throw ApiError.badRequest('Only patient accounts can be disabled here. For a doctor or a clinic, use Suspend');
  }
  if (!user.isActive) throw ApiError.conflict('This account is already disabled');

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  const cancelled = await cancelUpcoming({ patient: user._id }, 'Account disabled', { notify: false });
  await endSessions(user._id);

  recordAccess(req, {
    action: 'USER_DISABLED',
    resourceType: 'User',
    resourceId: user._id,
    subject: user._id,
    meta: { reason: req.body.reason, cancelledAppointments: cancelled },
  });
  res.json({ success: true, message: 'Account disabled', cancelledAppointments: cancelled });
});

export const enableUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== ROLES.PATIENT) throw ApiError.badRequest('Only patient accounts are handled here');
  if (user.isActive) throw ApiError.conflict('This account is already active');

  user.isActive = true;
  await user.save({ validateBeforeSave: false });

  recordAccess(req, { action: 'USER_ENABLED', resourceType: 'User', resourceId: user._id, subject: user._id });
  res.json({ success: true, message: 'Account enabled' });
});

// ---------- Reviews ----------
export const listReviews = asyncHandler(async (req, res) => {
  const { hidden, rating, page, limit } = req.query;

  const filter = {};
  if (hidden === true) filter.hidden = true;
  if (hidden === false) filter.hidden = { $ne: true };
  if (rating) filter.rating = rating;

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('patient', 'name')
      .populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } })
      .populate('clinic', 'name')
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), reviews });
});

const setHidden = (hidden) =>
  asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found');
    if (!!review.hidden === hidden) throw ApiError.conflict(hidden ? 'This review is already hidden' : 'This review is not hidden');

    review.hidden = hidden;
    review.hiddenReason = hidden ? req.body.reason : undefined;
    review.hiddenAt = hidden ? new Date() : undefined;
    await review.save();

    await Promise.all([recompute(Doctor, 'doctor', review.doctor), recompute(Clinic, 'clinic', review.clinic)]);

    recordAccess(req, {
      action: hidden ? 'REVIEW_HIDDEN' : 'REVIEW_UNHIDDEN',
      resourceType: 'Review',
      resourceId: review._id,
      subject: review.patient,
      meta: hidden ? { reason: req.body.reason } : undefined,
    });
    res.json({ success: true, message: hidden ? 'Review hidden' : 'Review is visible again', review });
  });

export const hideReview = setHidden(true);
export const unhideReview = setHidden(false);

// ---------- Audit log ----------
export const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, actor, subject, from, to, page, limit } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (actor) filter.actor = actor;
  if (subject) filter.subject = subject;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999+05:30`);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name role email')
      .populate('subject', 'name role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), logs: items });
});

// ---------- Admin: change own password ----------
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await User.findById(req.user._id).select('+passwordHash');
  if (!(await admin.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  if (currentPassword === newPassword) throw ApiError.badRequest('The new password must be different');

  await admin.setPassword(newPassword);
  // Issues fresh tokens and saves, so every other open session of this admin ends
  const accessToken = await issueTokens(admin, res);

  recordAccess(req, { action: 'ADMIN_PASSWORD_CHANGED', resourceType: 'User', resourceId: admin._id, subject: admin._id });
  res.json({ success: true, message: 'Password changed', accessToken });
});