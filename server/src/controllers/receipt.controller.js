import Appointment from '../models/Appointment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APPOINTMENT_STATUS as ST } from '../utils/constants.js';
import { canView } from './appointment.controller.js';
import { ensureReceipt, buildReceiptData, renderReceiptPdf } from '../services/receipt.service.js';

const load = async (req) => {
  const appt = await Appointment.findById(req.params.appointmentId);
  // Same message for "missing" and "not yours"
  if (!appt || !(await canView(req.user, appt))) throw ApiError.notFound('Appointment not found');

  if (![ST.APPROVED, ST.COMPLETED].includes(appt.status)) {
    throw ApiError.forbidden('The receipt is available only after the doctor approves the appointment');
  }
  const receipt = await ensureReceipt(appt);
  return buildReceiptData(appt, receipt);
};

export const getReceipt = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await load(req)) });
});

export const downloadPdf = asyncHandler(async (req, res) => {
  const data = await load(req);
  const pdf = await renderReceiptPdf(data);

  const mode = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${mode}; filename="receipt-${data.receipt.receiptNo}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.end(pdf);
});