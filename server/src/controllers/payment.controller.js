import Appointment from '../models/Appointment.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';
import { APPOINTMENT_STATUS as ST } from '../utils/constants.js';
import {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  markPaid,
} from '../services/payment.service.js';

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.body.appointmentId, patient: req.user._id });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.status !== ST.APPROVED) throw ApiError.badRequest('You can pay only after the doctor approves');
  if (appt.payment.status === 'paid') throw ApiError.conflict('This appointment is already paid');
  if (!(appt.payment.amount > 0)) throw ApiError.badRequest('This appointment has no fee to pay');

  let orderId = appt.payment.razorpayOrderId;
  if (!orderId) {
    const order = await createOrder(appt, appt.payment.amount);
    orderId = order.id;
    await Appointment.updateOne(
      { _id: appt._id },
      { $set: { 'payment.razorpayOrderId': orderId, 'payment.mode': 'online' } }
    );
  }

  res.json({
    success: true,
    keyId: env.RAZORPAY_KEY_ID, // public key, safe to send
    appointmentId: appt._id,
    order: { id: orderId, amount: Math.round(appt.payment.amount * 100), currency: 'INR' },
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const appt = await Appointment.findOne({ _id: appointmentId, patient: req.user._id });
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.payment.razorpayOrderId !== razorpay_order_id) throw ApiError.badRequest('Order does not match');

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw ApiError.badRequest('Payment verification failed');
  }

  const updated = await markPaid({ orderId: razorpay_order_id, paymentId: razorpay_payment_id });
  res.json({
    success: true,
    message: updated?.payment.status === 'refunded' ? 'Appointment was cancelled. Amount refunded' : 'Payment successful',
    payment: updated?.payment,
  });
});

// Razorpay calls this. The body arrives as raw bytes (see app.js), needed for the signature check.
export const webhook = asyncHandler(async (req, res) => {
  const raw = req.body;
  const signature = req.headers['x-razorpay-signature'];

  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, signature)) {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  const event = JSON.parse(raw.toString('utf8'));
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) {
      try {
        await markPaid({ orderId: p.order_id, paymentId: p.id, amountPaise: p.amount });
      } catch (err) {
        logger.error(`Webhook processing failed: ${err.message}`);
        throw err; // non-2xx makes Razorpay retry later
      }
    }
  }
  res.json({ success: true, received: true });
});