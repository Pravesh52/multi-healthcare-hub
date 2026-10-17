import api, { data, cleanParams, downloadFile } from './api.js';

export const listMyPrescriptions = (params) => data(api.get('/prescriptions/me', { params: cleanParams(params) }));
export const getPrescription = (appointmentId) => data(api.get(`/prescriptions/appointments/${appointmentId}`));
export const savePrescription = (appointmentId, body) =>
  data(api.put(`/prescriptions/appointments/${appointmentId}`, body));
export const downloadPrescriptionPdf = (appointmentId, date = 'visit') =>
  downloadFile(`/prescriptions/appointments/${appointmentId}/pdf`, `prescription-${date}.pdf`);