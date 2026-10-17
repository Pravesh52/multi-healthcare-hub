import api, { data, cleanParams } from './api.js';

// Patient
export const createAppointment = (body) => data(api.post('/appointments', body));
export const listMyAppointments = (params) => data(api.get('/appointments/me', { params: cleanParams(params) }));
export const cancelAppointment = (id) => data(api.patch(`/appointments/${id}/cancel`));
export const rescheduleAppointment = (id, body) => data(api.patch(`/appointments/${id}/reschedule`, body));

// Doctor
export const listDoctorAppointments = (params) => data(api.get('/appointments/doctor', { params: cleanParams(params) }));
export const approveAppointment = (id) => data(api.patch(`/appointments/${id}/approve`));
export const rejectAppointment = (id, reason) => data(api.patch(`/appointments/${id}/reject`, { reason }));

export const getAppointment = (id) => data(api.get(`/appointments/${id}`));