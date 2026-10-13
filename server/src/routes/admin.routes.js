import { Router } from 'express';
import { z } from 'zod';
import protect from '../middlewares/auth.js';
import authorize from '../middlewares/rbac.js';
import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { ROLES } from '../utils/constants.js';
import {
  getStats,
  listDoctors,
  verifyDoctor,
  rejectDoctor,
  listClinics,
  verifyClinic,
  rejectClinic,
} from '../controllers/admin.controller.js';
import { doctorCertificate, clinicLicence } from '../controllers/upload.controller.js';
import {
  suspendDoctor,
  reinstateDoctor,
  suspendClinic,
  reinstateClinic,
  listUsers,
  disableUser,
  enableUser,
  listReviews,
  hideReview,
  unhideReview,
  listAuditLogs,
  changePassword,
} from '../controllers/adminManage.controller.js';

const router = Router();
router.use(protect, authorize(ROLES.ADMIN));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const reason = z.string().trim().min(3, 'Please give a reason').max(300);

const reasonSchema = z.object({ body: z.object({ reason }) });
const idReasonSchema = z.object({ params: z.object({ id: objectId }), body: z.object({ reason }) });
const idSchema = z.object({ params: z.object({ id: objectId }) });

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);
const boolQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

const usersSchema = z.object({
  query: z.object({
    role: z.enum(Object.values(ROLES)).optional(),
    active: boolQuery,
    q: z.string().trim().max(60).optional(),
    page,
    limit,
  }),
});

const reviewsSchema = z.object({
  query: z.object({
    hidden: boolQuery,
    rating: z.coerce.number().int().min(1).max(5).optional(),
    page,
    limit,
  }),
});

const auditSchema = z.object({
  query: z.object({
    action: z.string().trim().max(60).optional(),
    actor: objectId.optional(),
    subject: objectId.optional(),
    from: date.optional(),
    to: date.optional(),
    page,
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
});

const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(64, 'Password is too long')
      .regex(/[A-Za-z]/, 'Password must contain a letter')
      .regex(/\d/, 'Password must contain a number'),
  }),
});

router.get('/stats', getStats);

// Doctors
router.get('/doctors', listDoctors); // ?status=pending|verified|rejected|suspended
router.patch('/doctors/:id/verify', verifyDoctor);
router.patch('/doctors/:id/reject', validate(reasonSchema), rejectDoctor);
router.patch('/doctors/:id/suspend', validate(idReasonSchema), suspendDoctor);
router.patch('/doctors/:id/reinstate', validate(idSchema), reinstateDoctor);

// Clinics
router.get('/clinics', listClinics);
router.patch('/clinics/:id/verify', verifyClinic);
router.patch('/clinics/:id/reject', validate(reasonSchema), rejectClinic);
router.patch('/clinics/:id/suspend', validate(idReasonSchema), suspendClinic);
router.patch('/clinics/:id/reinstate', validate(idSchema), reinstateClinic);

// Private documents (a 5 minute link; every look is recorded in the audit log)
router.get('/doctors/:id/certificate', doctorCertificate);
router.get('/clinics/:id/licence', clinicLicence);

// Users
router.get('/users', validate(usersSchema), listUsers);
router.patch('/users/:id/disable', validate(idReasonSchema), disableUser);
router.patch('/users/:id/enable', validate(idSchema), enableUser);

// Reviews
router.get('/reviews', validate(reviewsSchema), listReviews);
router.patch('/reviews/:id/hide', validate(idReasonSchema), hideReview);
router.patch('/reviews/:id/unhide', validate(idSchema), unhideReview);

// Audit log
router.get('/audit-logs', validate(auditSchema), listAuditLogs);

// Admin's own password
router.post('/password', authLimiter, validate(passwordSchema), changePassword);

export default router;