import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';
import { todayIST } from '../utils/time.js';
import { notifyUser } from '../services/notify.service.js';
import { verifyQr } from '../services/receipt.service.js';
import {
  getQueue,
  patientStatus,
  checkIn,
  callNext,
  markDone,
  skip,
  makeEmergency,
  setPaused,
  createWalkIn,
} from '../services/queue.service.js';

// Finds the doctor and makes sure this user is allowed to manage that doctor's queue
const resolveDoctor = async (user, idParam) => {
  if (user.role === ROLES.DOCTOR) {
    const doctor = await Doctor.findOne({ user: user._id });
    if (!doctor || (idParam !== 'me' && String(doctor._id) !== idParam)) {
      throw ApiError.forbidden('You can manage only your own queue');
    }
    return doctor;
  }

  // Clinic owner
  if (idParam === 'me') throw ApiError.badRequest('Please provide a doctor id');
  const clinic = await Clinic.findOne({ owner: user._id }).select('_id');
  if (!clinic) throw ApiError.forbidden('Clinic profile not found');
  const doctor = await Doctor.findOne({ _id: idParam, clinic: clinic._id });
  if (!doctor) throw ApiError.notFound('Doctor not found in your clinic');
  return doctor;
};

const loadAppt = async (user, id) => {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  await resolveDoctor(user, String(appt.doctor)); // throws if not allowed
  return appt;
};

// ---------- Doctor / Clinic views ----------
export const live = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctor(req.user, req.params.doctorId);
  const queue = await getQueue(doctor);
  res.json({ success: true, doctorId: doctor._id, date: todayIST(), ...queue });
});

export const callNextPatient = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctor(req.user, req.params.doctorId);
  const serving = await callNext(doctor);
  res.json({ success: true, message: `Token #${serving.tokenNo} called`, serving });
});

export const pause = asyncHandler(async (req, res) => {
  const doctor = await resolveDoctor(req.user, req.params.doctorId);
  await setPaused(doctor, req.body.paused);
  res.json({ success: true, message: req.body.paused ? 'Queue paused' : 'Queue resumed', paused: doctor.queuePaused });
});

// ---------- Check-in ----------
export const checkInByCode = asyncHandler(async (req, res) => {
  const id = verifyQr(req.body.code);
  if (!id) throw ApiError.badRequest('Invalid QR code');

  const appt = await loadAppt(req.user, id);
  const updated = await checkIn(appt);
  res.json({ success: true, message: `Token #${updated.tokenNo} checked in`, appointment: updated });
});

export const checkInById = asyncHandler(async (req, res) => {
  const appt = await loadAppt(req.user, req.params.id);
  const updated = await checkIn(appt);
  res.json({ success: true, message: `Token #${updated.tokenNo} checked in`, appointment: updated });
});

// ---------- Per-patient actions ----------
export const done = asyncHandler(async (req, res) => {
  const appt = await loadAppt(req.user, req.params.id);
  const updated = await markDone(appt);
  res.json({
    success: true,
    message: `Token #${updated.tokenNo} completed in ${updated.consultationMinutes} min`,
    appointment: updated,
  });
});

export const skipPatient = asyncHandler(async (req, res) => {
  const appt = await loadAppt(req.user, req.params.id);
  const { appointment, noShow } = await skip(appt);
  res.json({
    success: true,
    message: noShow ? 'Skipped twice. Marked as no-show' : 'Patient moved to the end of the queue',
    appointment,
  });
});

export const emergency = asyncHandler(async (req, res) => {
  const appt = await loadAppt(req.user, req.params.id);
  const updated = await makeEmergency(appt);
  res.json({ success: true, message: 'Marked as emergency. Moved to the front', appointment: updated });
});

// ---------- Walk-in (clinic) ----------
export const walkIn = asyncHandler(async (req, res) => {
  const { doctorId, name, phone, age, gender, reason, emergency: isEmergency } = req.body;

  const clinic = await Clinic.findOne({ owner: req.user._id, status: VERIFICATION.VERIFIED });
  if (!clinic) throw ApiError.forbidden('Your clinic is not verified');

  const doctor = await Doctor.findOne({ _id: doctorId, clinic: clinic._id, status: VERIFICATION.VERIFIED });
  if (!doctor) throw ApiError.notFound('Doctor not found in your clinic');

  const date = todayIST();
  if (doctor.unavailableToday || doctor.leaveDates.includes(date)) {
    throw ApiError.badRequest('The doctor is not available today');
  }

  let patient = await User.findOne({ phone });
  if (patient && patient.role !== ROLES.PATIENT) {
    throw ApiError.conflict('This phone number belongs to a non-patient account');
  }
  if (!patient) patient = await User.create({ name, phone, role: ROLES.PATIENT, age, gender });

  if (await Appointment.exists({ patient: patient._id, doctor: doctor._id, date, active: true })) {
    throw ApiError.conflict('This patient already has an appointment today with this doctor');
  }

  const appt = await createWalkIn({ doctor, patient, reason, emergency: isEmergency });

  await notifyUser(
    patient._id,
    {
      type: 'approved',
      title: 'Token issued',
      message: `Your token number is #${appt.tokenNo}. Please wait for your turn. - MultiHealth Care Hub`,
      data: { appointmentId: appt._id },
    },
    { sms: true }
  );

  res.status(201).json({ success: true, message: `Walk-in token #${appt.tokenNo} issued`, appointment: appt });
});

// ---------- Patient ----------
export const myStatus = asyncHandler(async (req, res) => {
  const items = await patientStatus(req.user._id);
  res.json({ success: true, date: todayIST(), appointments: items });
});