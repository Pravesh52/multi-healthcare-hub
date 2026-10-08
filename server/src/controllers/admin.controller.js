import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';

const logAction = (req, action, resourceType, resourceId, meta) =>
  AuditLog.create({
    actor: req.user._id,
    role: req.user.role,
    action,
    resourceType,
    resourceId,
    ip: req.ip,
    meta,
  }).catch(() => {}); // a logging problem must never break the real action

const statusFilter = (q) =>
  Object.values(VERIFICATION).includes(q.status) ? q.status : VERIFICATION.PENDING;

export const getStats = asyncHandler(async (req, res) => {
  const [patients, doctorsVerified, doctorsPending, clinicsVerified, clinicsPending, appointments] =
    await Promise.all([
      User.countDocuments({ role: ROLES.PATIENT }),
      Doctor.countDocuments({ status: VERIFICATION.VERIFIED }),
      Doctor.countDocuments({ status: VERIFICATION.PENDING }),
      Clinic.countDocuments({ status: VERIFICATION.VERIFIED }),
      Clinic.countDocuments({ status: VERIFICATION.PENDING }),
      Appointment.countDocuments(),
    ]);
  res.json({
    success: true,
    stats: { patients, doctorsVerified, doctorsPending, clinicsVerified, clinicsPending, appointments },
  });
});

// ---------- Doctors ----------
export const listDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ status: statusFilter(req.query) })
    .populate('user', 'name email phone')
    .populate('clinic', 'name district')
    .sort({ createdAt: 1 });
  res.json({ success: true, count: doctors.length, doctors });
});

const setDoctorStatus = (status) =>
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) throw ApiError.notFound('Doctor not found');

    doctor.status = status;
    if (status === VERIFICATION.VERIFIED) {
      doctor.verifiedAt = new Date();
      doctor.rejectReason = undefined;
    } else {
      doctor.rejectReason = req.body.reason;
    }
    await doctor.save();

    await logAction(req, `DOCTOR_${status.toUpperCase()}`, 'Doctor', doctor._id, { reason: req.body.reason });
    res.json({ success: true, message: `Doctor ${status}`, doctor });
  });

export const verifyDoctor = setDoctorStatus(VERIFICATION.VERIFIED);
export const rejectDoctor = setDoctorStatus(VERIFICATION.REJECTED);

// ---------- Clinics ----------
export const listClinics = asyncHandler(async (req, res) => {
  const clinics = await Clinic.find({ status: statusFilter(req.query) })
    .populate('owner', 'name email')
    .sort({ createdAt: 1 });
  res.json({ success: true, count: clinics.length, clinics });
});

const setClinicStatus = (status) =>
  asyncHandler(async (req, res) => {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) throw ApiError.notFound('Clinic not found');

    clinic.status = status;
    if (status === VERIFICATION.VERIFIED) {
      clinic.verifiedAt = new Date();
      clinic.rejectReason = undefined;
    } else {
      clinic.rejectReason = req.body.reason;
    }
    await clinic.save();

    await logAction(req, `CLINIC_${status.toUpperCase()}`, 'Clinic', clinic._id, { reason: req.body.reason });
    res.json({ success: true, message: `Clinic ${status}`, clinic });
  });

export const verifyClinic = setClinicStatus(VERIFICATION.VERIFIED);
export const rejectClinic = setClinicStatus(VERIFICATION.REJECTED);