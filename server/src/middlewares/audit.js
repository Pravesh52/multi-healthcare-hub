import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// Usage: recordAccess(req, { action, resourceType, resourceId, subject })
// subject = the patient whose data was looked at
export const recordAccess = (req, { action, resourceType, resourceId, subject }) => {
  AuditLog.create({
    actor: req.user._id,
    role: req.user.role,
    action,
    resourceType,
    resourceId,
    subject,
    ip: req.ip,
  }).catch((err) => logger.error(`Audit log failed: ${err.message}`));
};