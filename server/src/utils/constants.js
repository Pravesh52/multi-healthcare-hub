export const ROLES = Object.freeze({
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  CLINIC: 'clinic',
  ADMIN: 'admin',
});

export const VERIFICATION = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
});

export const QUEUE_STATUS = Object.freeze({
  NOT_ARRIVED: 'not_arrived',
  WAITING: 'waiting',
  NOW_SERVING: 'now_serving',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  NO_SHOW: 'no_show',
});

export const PRIORITY = Object.freeze({ NORMAL: 'normal', EMERGENCY: 'emergency' });