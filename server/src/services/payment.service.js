import crypto from 'crypto';
import { getRazorpay } from '../config/razorpay.js';
import { env } from '../config/env.js';
import Appointment from '../models/Appointment.js';
import { APPOINTMENT_STATUS as ST } from '../utils/constants.js';
import { notifyUser } from './notify.service.js';
import logger from '../utils/logger.js';

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Signature sent by Razorpay Checkout after a payment: HMAC(order_id|payment_id)
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, String(signature || ''));
};

// Signature header of a webhook: HMAC of the raw request body
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqual(expected, String(signature || ''));
};

export const createOrder = (appt, amountRupees) =>
  getRazorpay().orders.create({
    amount: Math.round(amountRupees * 100), // Razorpay works in paise
    currency: 'INR',
    receipt: `appt_${appt._id}`,
    notes: { appointmentId: String(appt._id) },
  });

export const refund = (paymentId, amountRupees) =>
  getRazorpay().payments.refund(paymentId, { amount: Math.round(amountRupees * 100) });

// Safe to call many times for the same payment (verify API and webhook can both arrive)
export const markPaid = async ({ orderId, paymentId, amountPaise }) => {
  const appt = await Appointment.findOne({ 'payment.razorpayOrderId': orderId });
  if (!appt) return null;
  if (appt.payment.status === 'paid') return appt;

  if (amountPaise != null && amountPaise !== Math.round(appt.payment.amount * 100)) {
    logger.error(`Payment amount mismatch for appointment ${appt._id}`);
    return null;
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, 'payment.status': 'unpaid' },
    { $set: { 'payment.status': 'paid', 'payment.razorpayPaymentId': paymentId, 'payment.mode': 'online' } },
    { new: true }
  );
  if (!updated) return Appointment.findById(appt._id); // someone else just did it

  // Paid after the appointment was cancelled: give the money back
  if (![ST.APPROVED, ST.COMPLETED].includes(updated.status)) {
    try {
      await refund(paymentId, updated.payment.amount);
      return Appointment.findByIdAndUpdate(updated._id, { $set: { 'payment.status': 'refunded' } }, { new: true });
    } catch (err) {
      logger.error(`Auto refund failed for ${updated._id}: ${err.message}`);
      return updated;
    }
  }

  await notifyUser(updated.patient, {
    type: 'system',
    title: 'Payment received',
    message: `We received Rs. ${updated.payment.amount} for your appointment on ${updated.date} at ${updated.slot}. Thank you.`,
    data: { appointmentId: updated._id },
  });
  return updated;
};