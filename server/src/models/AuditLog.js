import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // who did it
    role: String,
    action: { type: String, required: true }, // e.g. "VIEW_PRESCRIPTION", "DOCTOR_VERIFIED"
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // whose data was looked at (the patient)
    ip: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ subject: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);