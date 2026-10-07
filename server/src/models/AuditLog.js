import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    role: String,
    action: { type: String, required: true }, // e.g. "VIEW_PATIENT", "APPROVE_DOCTOR"
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    ip: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);