import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';
import { env } from '../config/env.js';
import { sendOtp as sendOtpCode, verifyOtpCode } from '../services/otp.service.js';
import {
  REFRESH_COOKIE,
  issueTokens,
  hashToken,
  verifyRefreshToken,
  clearRefreshCookie,
} from '../services/token.service.js';

// ---------- Patient: OTP ----------
export const sendOtp = asyncHandler(async (req, res) => {
  await sendOtpCode(req.body.phone);
  res.json({
    success: true,
    message: env.otpDevMode ? 'OTP generated. Check the server terminal (dev mode)' : 'OTP sent to your mobile',
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, name, age, gender, consent } = req.body;

  let user = await User.findOne({ phone });
  if (user && user.role !== ROLES.PATIENT) {
    throw ApiError.forbidden('This number belongs to a non-patient account');
  }

  // New patient needs a few extra details. We check this BEFORE using up the OTP.
  if (!user) {
    if (!name) throw new ApiError(422, 'New patient: please provide your name', { code: 'SIGNUP_REQUIRED' });
    if (consent !== true) throw ApiError.badRequest('You must accept the privacy policy to sign up');
  }

  await verifyOtpCode(phone, otp);

  const isNew = !user;
  if (isNew) {
    user = await User.create({ name, phone, role: ROLES.PATIENT, age, gender, consentAt: new Date() });
  }
  if (!user.isActive) throw ApiError.forbidden('Your account is disabled');

  const accessToken = await issueTokens(user, res);
  res.status(isNew ? 201 : 200).json({ success: true, accessToken, user, isNew });
});

// ---------- Doctor signup ----------
export const doctorSignup = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gender, speciality, qualification, medRegNo, experienceYears, fees } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict('This email is already registered');
  if (await Doctor.exists({ medRegNo })) throw ApiError.conflict('This medical registration number is already registered');

  const user = new User({ name, email, phone, gender, role: ROLES.DOCTOR, consentAt: new Date() });
  await user.setPassword(password);
  await user.save();

  try {
    await Doctor.create({ user: user._id, gender, speciality, qualification, medRegNo, experienceYears, fees });
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // don't leave a half-created account
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Signup received. Your account will be active after admin verification of your documents.',
  });
});

// ---------- Clinic signup ----------
export const clinicSignup = asyncHandler(async (req, res) => {
  const b = req.body;

  if (await User.exists({ email: b.email })) throw ApiError.conflict('This email is already registered');
  if (await Clinic.exists({ regNo: b.regNo })) throw ApiError.conflict('This registration number is already registered');

  const user = new User({ name: b.name, email: b.email, role: ROLES.CLINIC, consentAt: new Date() });
  await user.setPassword(b.password);
  await user.save();

  try {
    await Clinic.create({
      owner: user._id,
      name: b.clinicName,
      type: b.type,
      regNo: b.regNo,
      phone: b.phone,
      address: b.address,
      state: b.state,
      district: b.district,
      pincode: b.pincode,
      location: { type: 'Point', coordinates: [b.lng, b.lat] },
      timings: { open: b.openTime, close: b.closeTime },
    });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Signup received. Your clinic will be listed after admin verification.',
  });
});

// ---------- Doctor / Clinic / Admin login (email + password) ----------
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user && user.role !== ROLES.PATIENT && (await user.comparePassword(password));
  if (!valid) throw ApiError.unauthorized('Invalid email or password'); // same message for both cases on purpose
  if (!user.isActive) throw ApiError.forbidden('Your account is disabled');

  if (user.role === ROLES.DOCTOR) {
    const doc = await Doctor.findOne({ user: user._id });
    if (!doc || doc.status !== VERIFICATION.VERIFIED) {
      const why = doc?.status === VERIFICATION.REJECTED ? ` Reason: ${doc.rejectReason || 'not provided'}` : '';
      throw ApiError.forbidden(`Your doctor account is ${doc?.status || 'not found'}.${why}`);
    }
  }
  if (user.role === ROLES.CLINIC) {
    const clinic = await Clinic.findOne({ owner: user._id });
    if (!clinic || clinic.status !== VERIFICATION.VERIFIED) {
      const why = clinic?.status === VERIFICATION.REJECTED ? ` Reason: ${clinic.rejectReason || 'not provided'}` : '';
      throw ApiError.forbidden(`Your clinic account is ${clinic?.status || 'not found'}.${why}`);
    }
  }

  const accessToken = await issueTokens(user, res);
  res.json({ success: true, accessToken, user });
});

// ---------- Get a new access token using the refresh cookie ----------
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No session found. Please login');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Session expired. Please login again');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(token)) {
    if (user) {
      user.refreshTokenHash = undefined; // token reuse: kill the session
      await user.save({ validateBeforeSave: false });
    }
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Session invalid. Please login again');
  }

  const accessToken = await issueTokens(user, res); // rotates the refresh token too
  res.json({ success: true, accessToken, user });
});

// ---------- Logout ----------
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne({ _id: payload.sub }, { $unset: { refreshTokenHash: 1 } });
    } catch {
      /* token already invalid, nothing to clean */
    }
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// ---------- Who am I ----------
export const me = asyncHandler(async (req, res) => {
  let profile = null;
  if (req.user.role === ROLES.DOCTOR) profile = await Doctor.findOne({ user: req.user._id });
  if (req.user.role === ROLES.CLINIC) profile = await Clinic.findOne({ owner: req.user._id });
  res.json({ success: true, user: req.user, profile });
});