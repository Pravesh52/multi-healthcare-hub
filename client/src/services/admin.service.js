import api, { data, cleanParams } from './api.js';

export const getStats = () => data(api.get('/admin/stats'));

// Doctors and clinics. kind = 'doctors' or 'clinics'
export const listApplications = (kind, status) => data(api.get(`/admin/${kind}`, { params: cleanParams({ status }) }));
export const verifyApplication = (kind, id) => data(api.patch(`/admin/${kind}/${id}/verify`));
export const rejectApplication = (kind, id, reason) => data(api.patch(`/admin/${kind}/${id}/reject`, { reason }));
export const suspendApplication = (kind, id, reason) => data(api.patch(`/admin/${kind}/${id}/suspend`, { reason }));
export const reinstateApplication = (kind, id) => data(api.patch(`/admin/${kind}/${id}/reinstate`));

// Private documents: returns a link that works for 5 minutes
export const getDoctorCertificate = (id) => data(api.get(`/admin/doctors/${id}/certificate`));
export const getClinicLicence = (id) => data(api.get(`/admin/clinics/${id}/licence`));

export const listUsers = (params) => data(api.get('/admin/users', { params: cleanParams(params) }));
export const disableUser = (id, reason) => data(api.patch(`/admin/users/${id}/disable`, { reason }));
export const enableUser = (id) => data(api.patch(`/admin/users/${id}/enable`));

export const listAllReviews = (params) => data(api.get('/admin/reviews', { params: cleanParams(params) }));
export const hideReview = (id, reason) => data(api.patch(`/admin/reviews/${id}/hide`, { reason }));
export const unhideReview = (id) => data(api.patch(`/admin/reviews/${id}/unhide`));

export const getAuditLogs = (params) => data(api.get('/admin/audit-logs', { params: cleanParams(params) }));

// Returns a fresh accessToken. The page must pass it to setAccessToken().
export const changeAdminPassword = (body) => data(api.post('/admin/password', body));