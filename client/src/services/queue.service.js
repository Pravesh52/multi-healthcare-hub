import api, { data } from './api.js';

export const getLiveQueue = (doctorId = 'me') => data(api.get(`/queue/doctors/${doctorId}/live`));
export const callNext = (doctorId = 'me') => data(api.patch(`/queue/doctors/${doctorId}/call-next`));
export const setPaused = (doctorId = 'me', paused) => data(api.patch(`/queue/doctors/${doctorId}/pause`, { paused }));

export const checkInByCode = (code) => data(api.post('/queue/check-in', { code }));
export const checkInById = (appointmentId) => data(api.patch(`/queue/appointments/${appointmentId}/check-in`));
export const markDone = (appointmentId) => data(api.patch(`/queue/appointments/${appointmentId}/done`));
export const skipPatient = (appointmentId) => data(api.patch(`/queue/appointments/${appointmentId}/skip`));
export const makeEmergency = (appointmentId) => data(api.patch(`/queue/appointments/${appointmentId}/emergency`));

export const addWalkIn = (body) => data(api.post('/queue/walk-in', body));

// Patient: where am I in today's queue?
export const getMyQueueStatus = () => data(api.get('/queue/me'));