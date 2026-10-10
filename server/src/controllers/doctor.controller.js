import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s) => new RegExp(`^${escape(s)}$`, 'i');
const contains = (s) => new RegExp(escape(s), 'i');

const PUBLIC_HIDE = '-certificate -photoPublicId -medRegNo -rejectReason';
const CLINIC_FIELDS = 'name type address state district timings location phone';

export const listDoctors = asyncHandler(async (req, res) => {
  const { state, district, speciality, gender, maxFees, clinic, q, page, limit } = req.query;

  // Only doctors of verified clinics are public
  const clinicMatch = { status: VERIFICATION.VERIFIED };
  if (state) clinicMatch.state = exact(state);
  if (district) clinicMatch.district = exact(district);
  if (clinic) clinicMatch._id = clinic;
  const clinicIds = await Clinic.distinct('_id', clinicMatch);

  const filter = { status: VERIFICATION.VERIFIED, clinic: { $in: clinicIds } };
  if (speciality) filter.speciality = contains(speciality);
  if (gender) filter.gender = gender;
  if (maxFees != null) filter.fees = { $lte: maxFees };
  if (q) {
    const userIds = await User.distinct('_id', { role: ROLES.DOCTOR, name: contains(q) });
    filter.$or = [{ speciality: contains(q) }, { user: { $in: userIds } }];
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .select(PUBLIC_HIDE)
      .populate('user', 'name avatar')
      .populate('clinic', CLINIC_FIELDS)
      .sort({ ratingAvg: -1, experienceYears: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Doctor.countDocuments(filter),
  ]);

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), doctors });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ _id: req.params.id, status: VERIFICATION.VERIFIED })
    .select(PUBLIC_HIDE)
    .populate('user', 'name avatar')
    .populate('clinic', CLINIC_FIELDS);
  if (!doctor || !doctor.clinic) throw ApiError.notFound('Doctor not found');
  res.json({ success: true, doctor });
});

// ---------- Doctor (own profile) ----------
export const myProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).populate('clinic', CLINIC_FIELDS);
  if (!doctor) throw ApiError.notFound('Doctor profile not found');
  res.json({ success: true, doctor });
});

export const updateMe = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  const allowed = ['fees', 'slotMinutes', 'experienceYears', 'bio', 'schedule', 'leaveDates', 'unavailableToday'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) doctor[key] = req.body[key];
  });
  await doctor.save();

  res.json({ success: true, doctor });
});