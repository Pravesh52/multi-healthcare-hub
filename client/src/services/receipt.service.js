import api, { data, downloadFile } from './api.js';

export const getReceipt = (appointmentId) => data(api.get(`/receipts/${appointmentId}`));
export const downloadReceiptPdf = (appointmentId, receiptNo = 'receipt') =>
  downloadFile(`/receipts/${appointmentId}/pdf`, `receipt-${receiptNo}.pdf`);