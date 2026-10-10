import mongoose from 'mongoose';
import { VERIFICATION } from '../utils/constants.js';

const scheduleSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    start: { type: String, required: true }, // HH:mm
    end: { type: String, required: true },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', index: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    speciality: { type: String, required: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    medRegNo: { type: String, required: true, trim: true, unique: true },
    experienceYears: { type: Number, min: 0, default: 0 },
    fees: { type: Number, min: 0, required: true },
    slotMinutes: { type: Number, default: 20, min: 5, max: 120 },
    bio: { type: String, maxlength: 500 },
        photo: String, // public link (shown in search)
    photoPublicId: String,
    certificate: { publicId: String, format: String, uploadedAt: Date }, // private, only admin can open

    schedule: [scheduleSchema],
    leaveDates: [String], // 'YYYY-MM-DD'
    unavailableToday: { type: Boolean, default: false },
    queuePaused: { type: Boolean, default: false },

    status: { type: String, enum: Object.values(VERIFICATION), default: VERIFICATION.PENDING },
    rejectReason: String,
    verifiedAt: Date,

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.index({ clinic: 1, status: 1 });
doctorSchema.index({ speciality: 1, status: 1 });

export default mongoose.model('Doctor', doctorSchema);