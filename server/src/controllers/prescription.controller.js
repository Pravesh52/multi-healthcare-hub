import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS, ROLES } from '../utils/constants.js';
import { notifyUser } from '../services/notify.service.js';
import { buildPrescriptionData, renderPrescriptionPdf } from '../services/prescription.service.js';

const LOCK_AFTER_MS = 24 * 60 * 60 * 1000; // a prescription cannot be edited after 24 hours

// ---------- Doctor: write or update ----------
export const savePrescription = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  const appt = await Appointment.findOne({ _id: req.params.appointmentId, doctor: doctor._id });
  if (!appt) throw ApiError.notFound('Appointment not found');

  const allowed = appt.status === ST.COMPLETED || appt.queueStatus === QS.NOW_SERVING;
  if (!allowed) {
    throw ApiError.conflict('You can write a prescription only for a patient who is being served or whose visit is complete');
  }

  const { diagnosis, medicines, advice, followUpDate } = req.body;
  if (followUpDate && followUpDate < appt.date) {
    throw ApiError.badRequest('Follow-up date cannot be before the visit date');
  }

  let rx = await Prescription.findOne({ appointment: appt._id });
  const isNew = !rx;

  if (rx) {
    if (Date.now() - rx.createdAt.getTime() > LOCK_AFTER_MS) {
      throw ApiError.conflict('This prescription is locked. It can be edited only within 24 hours of writing');
    }
    rx.set({ diagnosis, medicines, advice, followUpDate });
    await rx.save();
  } else {
    try {
      rx = await Prescription.create({
        appointment: appt._id,
        doctor: doctor._id,
        patient: appt.patient,
        diagnosis,
        medicines,
        advice,
        followUpDate,
      });
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict('A prescription already exists for this visit. Please retry');
      throw err;
    }
  }

  await Appointment.updateOne({ _id: appt._id }, { $set: { followUpDate: followUpDate || null } });

  if (isNew) {
    await notifyUser(appt.patient, {
      type: 'system',
      title: 'Prescription added',
      message: 'Your doctor added a prescription for your visit. You can view and download it.',
      data: { appointmentId: appt._id, prescriptionId: rx._id },
    });
  }

  res.status(isNew ? 201 : 200).json({
    success: true,
    message: isNew ? 'Prescription saved' : 'Prescription updated',
    prescription: await buildPrescriptionData(rx),
  });
});

// ---------- Only that patient and that doctor can read it ----------
const loadAllowed = async (user, appointmentId) => {
  const rx = await Prescription.findOne({ appointment: appointmentId });
  let ok = false;

  if (rx) {
    if (user.role === ROLES.PATIENT) {
      ok = String(rx.patient) === String(user._id);
    } else if (user.role === ROLES.DOCTOR) {
      const doctor = await Doctor.findOne({ user: user._id }).select('_id');
      ok = !!doctor && String(rx.doctor) === String(doctor._id);
    }
  }

  // Same message for "missing" and "not yours"
  if (!ok) throw ApiError.notFound('Prescription not found');
  return rx;
};

export const getPrescription = asyncHandler(async (req, res) => {
  const rx = await loadAllowed(req.user, req.params.appointmentId);
  res.json({ success: true, prescription: await buildPrescriptionData(rx) });
});

export const downloadPdf = asyncHandler(async (req, res) => {
  const rx = await loadAllowed(req.user, req.params.appointmentId);
  const data = await buildPrescriptionData(rx);
  const pdf = await renderPrescriptionPdf(data);

  const mode = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${mode}; filename="prescription-${data.appointment.date}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  res.end(pdf);
});

// ---------- Patient: all my prescriptions ----------
export const listMine = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const filter = { patient: req.user._id };

  const [items, total] = await Promise.all([
    Prescription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'doctor', select: 'speciality user', populate: { path: 'user', select: 'name' } })
      .populate('appointment', 'date slot tokenNo')
      .lean(),
    Prescription.countDocuments(filter),
  ]);

  const prescriptions = items.map((r) => ({
    id: r._id,
    appointmentId: r.appointment._id,
    date: r.appointment.date,
    doctorName: r.doctor.user.name,
    speciality: r.doctor.speciality,
    diagnosis: r.diagnosis,
    medicineCount: r.medicines.length,
    followUpDate: r.followUpDate,
  }));

  res.json({ success: true, total, page, pages: Math.ceil(total / limit), prescriptions });
});