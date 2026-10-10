import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APPOINTMENT_STATUS as ST } from '../utils/constants.js';

// Rating is always recalculated from the reviews, so it can never drift out of sync
const recompute = async (Model, field, id) => {
  const [r] = await Review.aggregate([
    { $match: { [field]: new mongoose.Types.ObjectId(String(id)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Model.updateOne(
    { _id: id },
    { $set: { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.count : 0 } }
  );
};

export const createReview = asyncHandler(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;

  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.status !== ST.COMPLETED) {
    throw ApiError.badRequest('You can review only after your visit is completed');
  }

  let review;
  try {
    review = await Review.create({
      appointment: appt._id,
      patient: req.user._id,
      doctor: appt.doctor,
      clinic: appt.clinic,
      rating,
      comment,
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You have already reviewed this visit');
    throw err;
  }

  await Promise.all([recompute(Doctor, 'doctor', appt.doctor), recompute(Clinic, 'clinic', appt.clinic)]);

  res.status(201).json({ success: true, message: 'Thank you for your feedback', review });
});

const listFor = (field) =>
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const filter = { [field]: req.params.id };

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patient', 'name')
        .lean(),
      Review.countDocuments(filter),
    ]);

    const reviews = items.map((r) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      name: (r.patient?.name || 'Patient').split(' ')[0], // first name only, for privacy
      createdAt: r.createdAt,
    }));

    res.json({ success: true, total, page, pages: Math.ceil(total / limit), reviews });
  });

export const listForDoctor = listFor('doctor');
export const listForClinic = listFor('clinic');