import crypto from 'crypto';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { sendSms } from './sms.service.js';
import ApiError from '../utils/ApiError.js';

const OTP_TTL_SEC = 300; // 5 minutes
const COOLDOWN_SEC = 30;
const MAX_TRIES = 5;

const otpKey = (phone) => `otp:code:${phone}`;
const triesKey = (phone) => `otp:tries:${phone}`;
const coolKey = (phone) => `otp:cool:${phone}`;

// Only the hash is stored in Redis, never the real OTP
const hashOtp = (phone, otp) =>
  crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${phone}:${otp}`).digest('hex');

export const sendOtp = async (phone) => {
  const ok = await redis.set(coolKey(phone), '1', 'EX', COOLDOWN_SEC, 'NX');
  if (!ok) throw ApiError.tooMany(`Please wait ${COOLDOWN_SEC} seconds before requesting another OTP`);

  const otp = String(crypto.randomInt(100000, 1000000));
  await redis.set(otpKey(phone), hashOtp(phone, otp), 'EX', OTP_TTL_SEC);
  await redis.del(triesKey(phone));

  await sendSms(phone, `Your MultiHealth Care Hub OTP is ${otp}. It is valid for 5 minutes. Do not share it.`);
};

export const verifyOtpCode = async (phone, otp) => {
  const stored = await redis.get(otpKey(phone));
  if (!stored) throw ApiError.badRequest('OTP expired or not requested. Please request a new OTP');

  const tries = await redis.incr(triesKey(phone));
  if (tries === 1) await redis.expire(triesKey(phone), OTP_TTL_SEC);
  if (tries > MAX_TRIES) {
    await redis.del(otpKey(phone));
    throw ApiError.tooMany('Too many wrong attempts. Please request a new OTP');
  }

  const a = Buffer.from(stored);
  const b = Buffer.from(hashOtp(phone, otp));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw ApiError.badRequest('Incorrect OTP');
  }

  await redis.del(otpKey(phone), triesKey(phone)); // one-time use
};