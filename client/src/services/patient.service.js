import api, { data, cleanParams } from './api.js';

export const getPatientProfile = () => data(api.get('/patients/me'));
export const updatePatientProfile = (body) => data(api.patch('/patients/me', body));
export const getAccessLog = (params) => data(api.get('/patients/me/access-log', { params: cleanParams(params) }));