import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['request_sent', 'approved', 'rejected', 'reminder', 'your_turn', 'queue_update', 'follow_up', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ['in_app', 'sms', 'email'], default: 'in_app' },
    data: mongoose.Schema.Types.Mixed, // e.g. { appointmentId }
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);