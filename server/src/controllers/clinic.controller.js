import Clinic from '../models/Clinic.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';
import { cached } from '../services/cache.service.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s) => new RegExp(`^${escape(s)}$`, 'i');
const contains = (s) => new RegExp(escape(s), 'i');

const PUBLIC_HIDE = '-licenceUrl -owner -rejectReason';

// Adds the list of verified doctors to each clinic (for the clinic cards)
const attachDoctors = async (clinics) => {
  const ids = clinics.map((c) => c._id);
  const doctors = await Doctor.find({ clinic: { $in: ids }, status: VERIFICATION.VERIFIED })
    .populate('user', 'name avatar')
    .select('user gender speciality fees clinic unavailableToday ratingAvg experienceYears photo')
    .lean();

  const byClinic = {};
  doctors.forEach((d) => (byClinic[String(d.clinic)] ||= []).push(d));
  return clinics.map((c) => ({ ...c, doctors: byClinic[String(c._id)] || [] }));
};

export const listClinics = asyncHandler(async (req, res) => {
  const key = `clinics:${JSON.stringify(req.query)}`;

  const body = await cached(key, 60, async () => {
    const { state, district, q, type, lat, lng, km, page, limit } = req.query;

    const match = { status: VERIFICATION.VERIFIED };
    if (state) match.state = exact(state);
    if (district) match.district = exact(district);
    if (type) match.type = type;
    if (q) match.name = contains(q);

    const skip = (page - 1) * limit;
    let clinics;
    let total;

    if (lat != null && lng != null) {
      // "Near me": nearest first, with distance in meters
      const result = await Clinic.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lng, lat] },
            distanceField: 'distanceMeters',
            maxDistance: km * 1000,
            spherical: true,
            query: match,
          },
        },
        { $project: { licenceUrl: 0, owner: 0, rejectReason: 0 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: limit }],
            count: [{ $count: 'n' }],
          },
        },
      ]);
      clinics = result[0].items;
      total = result[0].count[0]?.n || 0;
    } else {
      [clinics, total] = await Promise.all([
        Clinic.find(match).select(PUBLIC_HIDE).sort({ ratingAvg: -1, name: 1 }).skip(skip).limit(limit).lean(),
        Clinic.countDocuments(match),
      ]);
    }

    return {
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      clinics: await attachDoctors(clinics),
    };
  });

  res.json(body);
});

export const getClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOne({ _id: req.params.id, status: VERIFICATION.VERIFIED })
    .select(PUBLIC_HIDE)
    .lean();
  if (!clinic) throw ApiError.notFound('Clinic not found');
  const [withDoctors] = await attachDoctors([clinic]);
  res.json({ success: true, clinic: withDoctors });
});

// ---------- Clinic owner ----------
const getMyClinic = async (userId) => {
  const clinic = await Clinic.findOne({ owner: userId });
  if (!clinic) throw ApiError.notFound('Clinic profile not found');
  return clinic;
};

export const getMine = asyncHandler(async (req, res) => {
  res.json({ success: true, clinic: await getMyClinic(req.user._id) });
});

export const updateMine = asyncHandler(async (req, res) => {
  const clinic = await getMyClinic(req.user._id);
  const { phone, address, timings } = req.body;
  if (phone) clinic.phone = phone;
  if (address) clinic.address = address;
  if (timings) {
    if (timings.open) clinic.timings.open = timings.open;
    if (timings.close) clinic.timings.close = timings.close;
    if (timings.offDays) clinic.timings.offDays = timings.offDays;
  }
  await clinic.save();
  res.json({ success: true, clinic });
});

export const myDoctors = asyncHandler(async (req, res) => {
  const clinic = await getMyClinic(req.user._id);
  const doctors = await Doctor.find({ clinic: clinic._id }).populate('user', 'name email phone');
  res.json({ success: true, count: doctors.length, doctors });
});

export const addDoctor = asyncHandler(async (req, res) => {
  const clinic = await getMyClinic(req.user._id);

  const user = await User.findOne({ email: req.body.email, role: ROLES.DOCTOR });
  const doctor = user && (await Doctor.findOne({ user: user._id }));
  if (!doctor) throw ApiError.notFound('No doctor account found with this email');
  if (doctor.status !== VERIFICATION.VERIFIED) throw ApiError.badRequest('This doctor is not verified yet');
  if (doctor.clinic && String(doctor.clinic) !== String(clinic._id)) {
    throw ApiError.conflict('This doctor is already linked to another clinic');
  }

  doctor.clinic = clinic._id;
  await doctor.save();
  res.status(201).json({ success: true, message: 'Doctor added to your clinic', doctor });
});

export const removeDoctor = asyncHandler(async (req, res) => {
  const clinic = await getMyClinic(req.user._id);
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, clinic: clinic._id });
  if (!doctor) throw ApiError.notFound('Doctor not found in your clinic');

  doctor.clinic = undefined;
  await doctor.save();
  res.json({ success: true, message: 'Doctor removed from your clinic' });
});