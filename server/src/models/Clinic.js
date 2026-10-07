import mongoose from 'mongoose';
import { VERIFICATION } from '../utils/constants.js';

const clinicSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['clinic', 'hospital', 'lab'], default: 'clinic' },
    regNo: { type: String, required: true, trim: true, unique: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true },

    // GeoJSON: coordinates are [longitude, latitude]
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) =>
            v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },

    timings: {
      open: { type: String, default: '09:00' }, // HH:mm
      close: { type: String, default: '17:00' },
      offDays: { type: [Number], default: [] }, // 0 = Sunday ... 6 = Saturday
    },

    photos: [String],
    licenceUrl: String,

    status: { type: String, enum: Object.values(VERIFICATION), default: VERIFICATION.PENDING },
    rejectReason: String,
    verifiedAt: Date,

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

clinicSchema.index({ location: '2dsphere' }); // "near me" search
clinicSchema.index({ state: 1, district: 1, status: 1 });

export default mongoose.model('Clinic', clinicSchema);