import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// Usage: recordAccess(req, { action, resourceType, resourceId, subject, meta })
// subject = the person whose data was looked at or changed
export const recordAccess = (req, { action, resourceType, resourceId, subject, meta }) => {
  AuditLog.create({
    actor: req.user._id,
    role: req.user.role,
    action,
    resourceType,
    resourceId,
    subject,
    ip: req.ip,
    meta,
  }).catch((err) => logger.error(`Audit log failed: ${err.message}`));
};