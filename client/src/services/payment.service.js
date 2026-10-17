import api, { data } from './api.js';

export const createPaymentOrder = (appointmentId) => data(api.post('/payments/order', { appointmentId }));
export const verifyPayment = (body) => data(api.post('/payments/verify', body));