import mongoose from 'mongoose';
import { APPOINTMENT_STATUS, QUEUE_STATUS, PRIORITY } from '../utils/constants.js';

const ACTIVE = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED];

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },

    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    slot: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // HH:mm
    reason: { type: String, trim: true, maxlength: 300 },
    reports: [String],
    isWalkIn: { type: Boolean, default: false },
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, // set when this request replaces an approved one
    rescheduleCount: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(APPOINTMENT_STATUS), default: APPOINTMENT_STATUS.PENDING },
    rejectReason: String,
    approvedAt: Date,
    expiresAt: Date, // auto-expire if the doctor never replies

    // true only while the slot is held (pending or approved). Used by the unique index.
    active: { type: Boolean, default: true },

    tokenNo: Number,
    receiptNo: String,

    payment: {
      mode: { type: String, enum: ['online', 'at_clinic'], default: 'at_clinic' },
      status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
      amount: Number,
      razorpayOrderId: String,
      razorpayPaymentId: String,
    },

    // Live queue
    queueStatus: { type: String, enum: Object.values(QUEUE_STATUS), default: QUEUE_STATUS.NOT_ARRIVED },
    priority: { type: String, enum: Object.values(PRIORITY), default: PRIORITY.NORMAL },
    skipCount: { type: Number, default: 0 },
    checkedInAt: Date,
    calledAt: Date,
    startedAt: Date,
    completedAt: Date,
    consultationMinutes: Number,
    followUpDate: String,
  },
  { timestamps: true }
);

// Same doctor + date + slot cannot be held by two active appointments (prevents double booking)
appointmentSchema.index(
  { doctor: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

// Token numbers are unique per doctor per day
appointmentSchema.index(
  { doctor: 1, date: 1, tokenNo: 1 },
  { unique: true, partialFilterExpression: { tokenNo: { $type: 'number' } } }
);

appointmentSchema.index({ doctor: 1, date: 1, queueStatus: 1 });
appointmentSchema.index({ clinic: 1, date: 1 });
appointmentSchema.index({ status: 1, expiresAt: 1 });

// Keep "active" in sync whenever we use save().
// Note: no "next" parameter. Newer Mongoose does not need it for synchronous hooks.
appointmentSchema.pre('save', function () {
  this.active = ACTIVE.includes(this.status);
});

// IMPORTANT: if you change status with findOneAndUpdate/updateOne, also set { active } yourself.
appointmentSchema.statics.isActiveStatus = (status) => ACTIVE.includes(status);

export default mongoose.model('Appointment', appointmentSchema);