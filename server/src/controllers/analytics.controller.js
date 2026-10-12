import mongoose from 'mongoose';
import Clinic from '../models/Clinic.js';
import Doctor from '../models/Doctor.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getAnalytics } from '../services/analytics.service.js';

export const clinicAnalytics = asyncHandler(async (req, res) => {
  const { from, to, doctorId } = req.query;

  const clinic = await Clinic.findOne({ owner: req.user._id }).select('_id');
  if (!clinic) throw ApiError.notFound('Clinic profile not found');

  const match = { clinic: clinic._id };
  if (doctorId) {
    if (!(await Doctor.exists({ _id: doctorId, clinic: clinic._id }))) {
      throw ApiError.notFound('Doctor not found in your clinic');
    }
    match.doctor = new mongoose.Types.ObjectId(doctorId);
  }

  res.json({ success: true, ...(await getAnalytics({ match, from, to })) });
});

export const doctorAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const doctor = await Doctor.findOne({ user: req.user._id }).select('_id');
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  res.json({ success: true, ...(await getAnalytics({ match: { doctor: doctor._id }, from, to })) });
});