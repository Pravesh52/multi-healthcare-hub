import api, { data, cleanParams } from './api.js';

export const createReview = (body) => data(api.post('/reviews', body));
export const getDoctorReviews = (id, params) => data(api.get(`/reviews/doctors/${id}`, { params: cleanParams(params) }));
export const getClinicReviews = (id, params) => data(api.get(`/reviews/clinics/${id}`, { params: cleanParams(params) }));