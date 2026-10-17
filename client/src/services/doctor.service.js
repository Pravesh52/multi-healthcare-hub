import api, { data, cleanParams } from './api.js';

export const listDoctors = (params) => data(api.get('/doctors', { params: cleanParams(params) }));
export const getDoctor = (id) => data(api.get(`/doctors/${id}`));
export const getSlots = (id, date) => data(api.get(`/doctors/${id}/slots`, { params: { date } }));

// Doctor (own)
export const getMyProfile = () => data(api.get('/doctors/me/profile'));
export const updateMyProfile = (body) => data(api.patch('/doctors/me', body));
export const uploadMyPhoto = (formData) => data(api.post('/doctors/me/photo', formData, { timeout: 60000 }));