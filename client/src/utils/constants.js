export const APP_NAME = 'MultiHealth Care Hub';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
export const SUPPORT_PHONE = (import.meta.env.VITE_SUPPORT_PHONE || '').replace(/\s+/g, '');

export const ROLES = { PATIENT: 'patient', DOCTOR: 'doctor', CLINIC: 'clinic', ADMIN: 'admin' };

// Where each role lands after login. The admin login page is also at /admin (shown when not logged in).
export const ROLE_HOME = {
  patient: '/patient',
  doctor: '/doctor',
  clinic: '/clinic',
  admin: '/admin',
};

// tone: ok (green), warn (amber), bad (red), info (blue)
export const APPOINTMENT_STATUS = {
  pending: { label: 'Pending approval', tone: 'warn' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  expired: { label: 'Expired', tone: 'bad' },
  completed: { label: 'Completed', tone: 'info' },
  no_show: { label: 'No-show', tone: 'bad' },
};

export const VERIFICATION_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  verified: { label: 'Verified', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'bad' },
  suspended: { label: 'Suspended', tone: 'bad' },
};

// What a patient sees about their place in the queue
export const QUEUE_STATE = {
  not_checked_in: { label: 'Not checked in', tone: 'info' },
  waiting: { label: 'Waiting', tone: 'warn' },
  next: { label: 'You are next', tone: 'warn' },
  your_turn: { label: 'Your turn', tone: 'ok' },
  completed: { label: 'Completed', tone: 'info' },
  no_show: { label: 'No-show', tone: 'bad' },
};

export const TONE_BADGE = {
  ok: 'badge-ok',
  warn: 'badge-warn',
  bad: 'badge-bad',
  info: 'badge-info',
};

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// 0 = Sunday, the same as the backend
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];