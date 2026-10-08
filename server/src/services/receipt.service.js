import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import Receipt from '../models/Receipt.js';
import Appointment from '../models/Appointment.js';
import { env } from '../config/env.js';

// ---------- QR signing ----------
const sign = (id) =>
  crypto.createHmac('sha256', `${env.JWT_ACCESS_SECRET}:qr`).update(String(id)).digest('hex').slice(0, 24);

export const signQr = (appointmentId) => `${appointmentId}.${sign(appointmentId)}`;

// Returns the appointment id if the QR is genuine, otherwise null
export const verifyQr = (code) => {
  const [id, sig] = String(code || '').split('.');
  if (!/^[a-f\d]{24}$/i.test(id || '') || !sig) return null;
  const good = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return good.length === given.length && crypto.timingSafeEqual(good, given) ? id : null;
};

// ---------- Receipt record ----------
const makeReceiptNo = (appt) =>
  `MH${appt.date.slice(2).replace(/-/g, '')}-${String(appt.tokenNo).padStart(3, '0')}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;

// Creates the receipt the first time, and returns the same one every time after
export const ensureReceipt = async (appt) => {
  const existing = await Receipt.findOne({ appointment: appt._id });
  if (existing) return existing;

  for (let i = 0; i < 4; i++) {
    const receiptNo = makeReceiptNo(appt);
    try {
      const receipt = await Receipt.create({
        appointment: appt._id,
        receiptNo,
        qrData: signQr(appt._id),
      });
      await Appointment.updateOne({ _id: appt._id }, { $set: { receiptNo } });
      return receipt;
    } catch (err) {
      if (err.code !== 11000) throw err;
      const again = await Receipt.findOne({ appointment: appt._id });
      if (again) return again; // created by a parallel request
    }
  }
  throw new Error('Could not generate a receipt number');
};

export const buildReceiptData = async (appt, receipt) => {
  await appt.populate([
    { path: 'patient', select: 'name age gender phone' },
    { path: 'doctor', select: 'speciality fees user', populate: { path: 'user', select: 'name' } },
    { path: 'clinic', select: 'name address phone' },
  ]);

  return {
    receipt: { receiptNo: receipt.receiptNo, qrData: receipt.qrData, generatedAt: receipt.generatedAt },
    appointment: {
      id: appt._id,
      date: appt.date,
      slot: appt.slot,
      tokenNo: appt.tokenNo,
      status: appt.status,
      reason: appt.reason,
      isWalkIn: appt.isWalkIn,
      payment: appt.payment,
    },
    patient: { name: appt.patient.name, age: appt.patient.age, phone: appt.patient.phone },
    doctor: { name: appt.doctor.user.name, speciality: appt.doctor.speciality },
    clinic: { name: appt.clinic.name, address: appt.clinic.address, phone: appt.clinic.phone },
  };
};

// ---------- PDF ----------
const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const renderReceiptPdf = async (d) => {
  const qr = await QRCode.toBuffer(d.receipt.qrData, { width: 240, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 28 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const pay = d.appointment.payment || {};

    // Header
    doc.rect(0, 0, W, 66).fill('#0B7285');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('MultiHealth Care Hub', 28, 17);
    doc.font('Helvetica').fontSize(10).text('Appointment Receipt', 28, 40);
    doc.fontSize(9).text(`Receipt No: ${d.receipt.receiptNo}`, 0, 30, { width: W - 28, align: 'right' });

    // Token box
    doc.rect(28, 84, 96, 62).fill('#F2B632');
    doc.fillColor('#12303A').font('Helvetica').fontSize(9).text('TOKEN', 28, 91, { width: 96, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(32).text(String(d.appointment.tokenNo), 28, 103, { width: 96, align: 'center' });

    doc.fillColor('#12303A').font('Helvetica-Bold').fontSize(13)
      .text(d.clinic.name, 140, 88, { width: W - 168 });
    doc.font('Helvetica').fontSize(9).fillColor('#566F78')
      .text(d.clinic.address, 140, doc.y + 2, { width: W - 168 })
      .text(`Phone: ${d.clinic.phone}`, 140, doc.y + 2, { width: W - 168 });

    // Details
    const rows = [
      ['Doctor', `${d.doctor.name} (${d.doctor.speciality})`],
      ['Date', fmtDate(d.appointment.date)],
      ['Time', d.appointment.isWalkIn ? 'Walk-in' : fmtTime(d.appointment.slot)],
      ['Patient', `${d.patient.name}${d.patient.age ? `, ${d.patient.age} yrs` : ''}`],
      ['Phone', d.patient.phone || '-'],
      ['Fee', `Rs. ${pay.amount ?? '-'} (${pay.status === 'paid' ? 'Paid online' : 'Pay at clinic'})`],
      ['Status', String(d.appointment.status).toUpperCase()],
    ];

    doc.y = 166;
    rows.forEach(([label, value]) => {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor('#566F78').text(label, 28, y, { width: 70 });
      doc.font('Helvetica-Bold').fillColor('#12303A').text(value, 104, y, { width: W - 132 });
      doc.moveDown(0.5);
    });

    // QR + instructions
    const qy = doc.y + 8;
    doc.moveTo(28, qy).lineTo(W - 28, qy).dash(3, { space: 3 }).strokeColor('#BFD3D0').stroke().undash();
    doc.image(qr, 28, qy + 12, { width: 112 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#12303A')
      .text('Show this QR at the reception', 156, qy + 18, { width: W - 184 });
    doc.font('Helvetica').fontSize(9).fillColor('#566F78')
      .text('Please reach 10 minutes early and carry your old reports and prescriptions.', 156, doc.y + 4, { width: W - 184 });

    doc.font('Helvetica').fontSize(8).fillColor('#8A9BA0')
      .text('This is a computer generated receipt. It is valid only for the approved appointment.', 28, 548, {
        width: W - 56,
        align: 'center',
      });

    doc.end();
  });
};