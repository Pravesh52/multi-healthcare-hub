import { z } from 'zod';

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const email = z.string().trim().toLowerCase().email('Enter a valid email');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const gender = z.enum(['male', 'female', 'other']);
const consent = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((v) => v === true || v === 'true')
  .refine((v) => v === true, 'You must accept the privacy policy');
const name = z.string().trim().min(2, 'Name is too short').max(80);

export const sendOtpSchema = z.object({ body: z.object({ phone }) });

export const verifyOtpSchema = z.object({
  body: z.object({
    phone,
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
    // Only needed the first time (new patient)
    name: name.optional(),
    age: z.coerce.number().int().min(0).max(120).optional(),
    gender: gender.optional(),
    consent: z.boolean().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email, password: z.string().min(1, 'Password is required') }),
});

export const doctorSignupSchema = z.object({
  body: z.object({
    name,
    email,
    password,
    phone: phone.optional(),
    gender,
    speciality: z.string().trim().min(2),
    qualification: z.string().trim().min(2),
    medRegNo: z.string().trim().min(3, 'Enter your medical registration number'),
    experienceYears: z.coerce.number().int().min(0).max(70).default(0),
    fees: z.coerce.number().min(0).max(100000),
    consent,
  }),
});

export const clinicSignupSchema = z.object({
  body: z.object({
    name, // owner name
    email,
    password,
    clinicName: z.string().trim().min(2).max(120),
    type: z.enum(['clinic', 'hospital', 'lab']).default('clinic'),
    regNo: z.string().trim().min(3, 'Enter your clinic registration number'),
    phone,
    address: z.string().trim().min(5),
    state: z.string().trim().min(2),
    district: z.string().trim().min(2),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    openTime: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
    consent,
  }),
});

export const resubmitSchema = z.object({
  body: z.object({ email, password: z.string().min(1, 'Password is required') }),
});