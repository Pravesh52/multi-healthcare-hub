import mongoose from 'mongoose';
import { env } from '../config/env.js'; // also loads .env
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Review from '../models/Review.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';
import { todayIST, addDays, dayOfWeek } from '../utils/time.js';

if (env.isProd) {
  console.error('Seeding demo data in production is blocked.');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@multihealth.demo';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const DEMO_PASSWORD = 'Demo@12345';

const makeUser = async ({ name, email, role, password, gender }) => {
  let user = await User.findOne({ email });
  if (user) return user;
  user = new User({ name, email, role, gender, consentAt: new Date() });
  await user.setPassword(password);
  await user.save();
  return user;
};

const weekdays = [1, 2, 3, 4, 5, 6].map((day) => ({ day, start: '09:00', end: '17:00' }));

// Coordinates are [longitude, latitude] and only approximate for Umaria town
const demo = [
  {
    clinic: { name: 'Sharma Clinic', type: 'clinic', regNo: 'DEMO-CL-001', address: 'Station Road, Umaria', coords: [80.8392, 23.5238], open: '09:00', close: '17:00' },
    doctor: { name: 'Dr. Anita Sharma', email: 'anita.demo@multihealth.demo', gender: 'female', speciality: 'General Physician', qualification: 'MBBS', medRegNo: 'DEMO-MP-001', exp: 12, fees: 300 },
  },
  {
    clinic: { name: 'Jeevan Hospital', type: 'hospital', regNo: 'DEMO-CL-002', address: 'Civil Lines, Umaria', coords: [80.8450, 23.5280], open: '08:00', close: '20:00' },
    doctor: { name: 'Dr. Rakesh Pandey', email: 'rakesh.demo@multihealth.demo', gender: 'male', speciality: 'Pediatrician', qualification: 'MD Pediatrics', medRegNo: 'DEMO-MP-002', exp: 9, fees: 400 },
  },
  {
    clinic: { name: 'Smile Dental Care', type: 'clinic', regNo: 'DEMO-CL-003', address: 'Near Bus Stand, Umaria', coords: [80.8330, 23.5190], open: '10:00', close: '18:00' },
    doctor: { name: 'Dr. Sneha Tiwari', email: 'sneha.demo@multihealth.demo', gender: 'female', speciality: 'Dentist', qualification: 'BDS', medRegNo: 'DEMO-MP-003', exp: 7, fees: 250 },
  },
];

const PATIENTS = [
  { name: 'Ramesh Kumar', phone: '9111111101', age: 42, gender: 'male' },
  { name: 'Sunita Yadav', phone: '9111111102', age: 35, gender: 'female' },
  { name: 'Mohan Singh', phone: '9111111103', age: 58, gender: 'male' },
  { name: 'Geeta Devi', phone: '9111111104', age: 29, gender: 'female' },
  { name: 'Aman Verma', phone: '9111111105', age: 24, gender: 'male' },
];

const makePatient = async (p) =>
  (await User.findOne({ phone: p.phone })) ||
  User.create({ ...p, role: ROLES.PATIENT, consentAt: new Date() });

const seedVisits = async (doctor, clinic) => {
  const patients = [];
  for (const p of PATIENTS) patients.push(await makePatient(p));
  const ids = patients.map((p) => p._id);

  if (process.argv.includes('--fresh')) {
    await Review.deleteMany({ patient: { $in: ids } });
    await Prescription.deleteMany({ patient: { $in: ids } });
    await Appointment.deleteMany({ patient: { $in: ids } });
    console.log('Old demo visits removed');
  }

  if (await Appointment.exists({ doctor: doctor._id, patient: patients[0]._id })) {
    console.log('Demo visits already exist (use "npm run seed -- --fresh" to rebuild them)');
    return;
  }

  const today = todayIST();
  const at = (date, slot) => new Date(`${date}T${slot}:00+05:30`);
  const slots = ['09:00', '09:20', '09:40', '10:00', '10:20'];
  const payment = { mode: 'at_clinic', status: 'unpaid', amount: doctor.fees };
  const ratings = [];

  // ---- Last 10 days: completed visits and a few no-shows ----
  for (let d = 10; d >= 1; d--) {
    const date = addDays(today, -d);
    if (dayOfWeek(date) === 0) continue; // the doctor does not sit on Sundays

    const visits = 2 + (d % 4); // 2 to 5 visits that day
    for (let i = 0; i < visits; i++) {
      const patient = patients[(d + i) % patients.length];
      const slot = slots[i];
      const start = at(date, slot);
      const noShow = (d + i) % 7 === 0;
      const minutes = 8 + ((d * 3 + i * 5) % 9);

      const appt = await Appointment.create({
        patient: patient._id,
        doctor: doctor._id,
        clinic: clinic._id,
        date,
        slot,
        reason: 'Routine check-up',
        status: noShow ? 'no_show' : 'completed',
        queueStatus: noShow ? 'no_show' : 'completed',
        tokenNo: i + 1,
        approvedAt: new Date(start.getTime() - 24 * 3600 * 1000),
        ...(noShow
          ? {}
          : {
              checkedInAt: new Date(start.getTime() - 12 * 60000),
              startedAt: start,
              completedAt: new Date(start.getTime() + minutes * 60000),
              consultationMinutes: minutes,
            }),
        payment,
      });
      if (noShow) continue;

      if (i === 0) {
        await Prescription.create({
          appointment: appt._id,
          doctor: doctor._id,
          patient: patient._id,
          diagnosis: 'Seasonal viral fever',
          medicines: [
            { name: 'Paracetamol 500 mg', dosage: '1-0-1', duration: '3 days', notes: 'After food' },
            { name: 'Cetirizine 10 mg', dosage: '0-0-1', duration: '3 days' },
          ],
          advice: 'Drink plenty of water and take rest.',
          followUpDate: addDays(date, 7),
          followUpReminderSent: true, // old visit: no reminder needed
        });
      }

      if ((d + i) % 3 === 0) {
        const rating = 4 + ((d + i) % 2);
        ratings.push(rating);
        await Review.create({
          appointment: appt._id,
          patient: patient._id,
          doctor: doctor._id,
          clinic: clinic._id,
          rating,
          comment: rating === 5 ? 'Very kind doctor and a short wait.' : 'Good experience overall.',
        });
      }
    }
  }

  if (ratings.length) {
    const avg = Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10;
    await Doctor.updateOne({ _id: doctor._id }, { $set: { ratingAvg: avg, ratingCount: ratings.length } });
    await Clinic.updateOne({ _id: clinic._id }, { $set: { ratingAvg: avg, ratingCount: ratings.length } });
  }

  // ---- Today's queue ----
  const queueRows = [
    { p: 1, token: 1, slot: '09:00', queueStatus: 'waiting', checkedIn: true },
    { p: 2, token: 2, slot: '09:20', queueStatus: 'waiting', checkedIn: true },
    { p: 3, token: 3, slot: '09:40', queueStatus: 'not_arrived', checkedIn: false },
  ];
  for (const row of queueRows) {
    await Appointment.create({
      patient: patients[row.p]._id,
      doctor: doctor._id,
      clinic: clinic._id,
      date: today,
      slot: row.slot,
      reason: 'Check-up',
      status: 'approved',
      approvedAt: new Date(),
      tokenNo: row.token,
      queueStatus: row.queueStatus,
      ...(row.checkedIn ? { checkedInAt: new Date(Date.now() - (10 - row.token) * 60000) } : {}),
      payment,
    });
  }

  // ---- A pending request for tomorrow ----
  await Appointment.create({
    patient: patients[4]._id,
    doctor: doctor._id,
    clinic: clinic._id,
    date: addDays(today, 1),
    slot: '10:00',
    reason: 'Fever and cough for 3 days',
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    payment,
  });

  console.log('Demo visits ready: 10 days of history, today\'s queue, and one pending request');
};

const run = async () => {
  await connectDB();

  await makeUser({ name: 'Super Admin', email: ADMIN_EMAIL, role: ROLES.ADMIN, password: ADMIN_PASSWORD });
  console.log(`Admin ready: ${ADMIN_EMAIL}`);

  let first = null;

  for (const [i, d] of demo.entries()) {
    const owner = await makeUser({
      name: `${d.clinic.name} Owner`,
      email: `clinic${i + 1}.demo@multihealth.demo`,
      role: ROLES.CLINIC,
      password: DEMO_PASSWORD,
    });

    let clinic = await Clinic.findOne({ regNo: d.clinic.regNo });
    if (!clinic) {
      clinic = await Clinic.create({
        owner: owner._id,
        name: d.clinic.name,
        type: d.clinic.type,
        regNo: d.clinic.regNo,
        phone: `9000000${100 + i}`,
        address: d.clinic.address,
        state: 'Madhya Pradesh',
        district: 'Umaria',
        location: { type: 'Point', coordinates: d.clinic.coords },
        timings: { open: d.clinic.open, close: d.clinic.close, offDays: [0] },
        status: VERIFICATION.VERIFIED,
        verifiedAt: new Date(),
      });
    }

    const docUser = await makeUser({
      name: d.doctor.name,
      email: d.doctor.email,
      role: ROLES.DOCTOR,
      password: DEMO_PASSWORD,
      gender: d.doctor.gender,
    });

    let doctor = await Doctor.findOne({ user: docUser._id });
    if (!doctor) {
      doctor = await Doctor.create({
        user: docUser._id,
        clinic: clinic._id,
        gender: d.doctor.gender,
        speciality: d.doctor.speciality,
        qualification: d.doctor.qualification,
        medRegNo: d.doctor.medRegNo,
        experienceYears: d.doctor.exp,
        fees: d.doctor.fees,
        schedule: weekdays,
        status: VERIFICATION.VERIFIED,
        verifiedAt: new Date(),
      });
    }
    if (i === 0) first = { doctor, clinic };
    console.log(`Demo ready: ${d.clinic.name} + ${d.doctor.name}`);
  }

  if (first) await seedVisits(first.doctor, first.clinic);

  console.log('\nSeed done.');
  console.log(`Admin login   : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Demo logins   : clinic1.demo@multihealth.demo, anita.demo@multihealth.demo / ${DEMO_PASSWORD}`);
  console.log('Demo patients : 9111111101 to 9111111105 (log in with OTP, shown in this terminal)');
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});