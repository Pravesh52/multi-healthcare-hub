import api, { data } from './api.js';

const upload = { timeout: 60000 }; // files take longer

export const sendOtp = (phone) => data(api.post('/auth/patient/send-otp', { phone }));
export const verifyOtp = (body) => data(api.post('/auth/patient/verify-otp', body));
export const login = (body) => data(api.post('/auth/login', body));
export const logout = () => data(api.post('/auth/logout'));
export const me = () => data(api.get('/auth/me'));

// formData must hold the text fields and the files
export const doctorSignup = (formData) => data(api.post('/auth/doctor/signup', formData, upload));
export const clinicSignup = (formData) => data(api.post('/auth/clinic/signup', formData, upload));
export const doctorResubmit = (formData) => data(api.post('/auth/doctor/resubmit', formData, upload));
export const clinicResubmit = (formData) => data(api.post('/auth/clinic/resubmit', formData, upload));