import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadBuffer, deleteAsset, signedDocUrl } from '../services/upload.service.js';

const MAX_CLINIC_PHOTOS = 5;
const LINK_SECONDS = 300;

// ---------- Doctor: own photo ----------
export const uploadDoctorPhoto = asyncHandler(async (req, res) => {
  const file = req.files?.photo?.[0];
  if (!file) throw ApiError.badRequest('Please choose a photo');

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  const uploaded = await uploadBuffer(file.buffer, { folder: 'doctor-photos' });
  const oldId = doctor.photoPublicId;

  doctor.photo = uploaded.secure_url;
  doctor.photoPublicId = uploaded.public_id;
  try {
    await doctor.save();
  } catch (err) {
    await deleteAsset(uploaded.public_id);
    throw err;
  }

  await deleteAsset(oldId);
  res.json({ success: true, photo: doctor.photo });
});

// ---------- Clinic: photos ----------
const myClinic = async (userId) => {
  const clinic = await Clinic.findOne({ owner: userId });
  if (!clinic) throw ApiError.notFound('Clinic profile not found');
  return clinic;
};

export const addClinicPhoto = asyncHandler(async (req, res) => {
  const file = req.files?.photo?.[0];
  if (!file) throw ApiError.badRequest('Please choose a photo');

  const clinic = await myClinic(req.user._id);
  if (clinic.photos.length >= MAX_CLINIC_PHOTOS) {
    throw ApiError.badRequest(`You can add up to ${MAX_CLINIC_PHOTOS} photos. Remove one first`);
  }

  const uploaded = await uploadBuffer(file.buffer, { folder: 'clinic-photos' });
  clinic.photos.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
  try {
    await clinic.save();
  } catch (err) {
    await deleteAsset(uploaded.public_id);
    throw err;
  }

  res.status(201).json({ success: true, photos: clinic.photos });
});

export const removeClinicPhoto = asyncHandler(async (req, res) => {
  const clinic = await myClinic(req.user._id);
  const index = req.params.index;
  if (index >= clinic.photos.length) throw ApiError.notFound('Photo not found');

  const [removed] = clinic.photos.splice(index, 1);
  await clinic.save();
  await deleteAsset(removed.publicId);

  res.json({ success: true, photos: clinic.photos });
});

// ---------- Admin: see a private document ----------
const viewDocument = ({ Model, key, resourceType, action }) =>
  asyncHandler(async (req, res) => {
    const record = await Model.findById(req.params.id).select(key);
    const doc = record?.[key];
    if (!doc?.publicId) throw ApiError.notFound('No document uploaded');

    // Every look at a private document is written down
    await AuditLog.create({
      actor: req.user._id,
      role: req.user.role,
      action,
      resourceType,
      resourceId: record._id,
      ip: req.ip,
    }).catch(() => {});

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      url: signedDocUrl(doc.publicId, doc.format, LINK_SECONDS),
      format: doc.format,
      expiresInSeconds: LINK_SECONDS,
    });
  });

export const doctorCertificate = viewDocument({
  Model: Doctor,
  key: 'certificate',
  resourceType: 'Doctor',
  action: 'VIEW_DOCTOR_CERTIFICATE',
});

export const clinicLicence = viewDocument({
  Model: Clinic,
  key: 'licence',
  resourceType: 'Clinic',
  action: 'VIEW_CLINIC_LICENCE',
});