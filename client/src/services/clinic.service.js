import api, { data, cleanParams } from './api.js';

export const listClinics = (params) => data(api.get('/clinics', { params: cleanParams(params) }));
export const getClinic = (id) => data(api.get(`/clinics/${id}`));

// Clinic owner
export const getMyClinic = () => data(api.get('/clinics/me'));
export const updateMyClinic = (body) => data(api.patch('/clinics/me', body));
export const getMyDoctors = () => data(api.get('/clinics/me/doctors'));
export const addDoctor = (email) => data(api.post('/clinics/me/doctors', { email }));
export const removeDoctor = (doctorId) => data(api.delete(`/clinics/me/doctors/${doctorId}`));
export const addClinicPhoto = (formData) => data(api.post('/clinics/me/photos', formData, { timeout: 60000 }));
export const removeClinicPhoto = (index) => data(api.delete(`/clinics/me/photos/${index}`));