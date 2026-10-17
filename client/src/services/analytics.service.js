import api, { data, cleanParams } from './api.js';

export const getClinicAnalytics = (params) => data(api.get('/clinics/me/analytics', { params: cleanParams(params) }));
export const getDoctorAnalytics = (params) => data(api.get('/doctors/me/analytics', { params: cleanParams(params) }));