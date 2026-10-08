import mongoose from 'mongoose';
import { env } from '../config/env.js'; // also loads .env
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Doctor from '../models/Doctor.js';
import { ROLES, VERIFICATION } from '../utils/constants.js';

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

const run = async () => {
  await connectDB();

  await makeUser({ name: 'Super Admin', email: ADMIN_EMAIL, role: ROLES.ADMIN, password: ADMIN_PASSWORD });
  console.log(`Admin ready: ${ADMIN_EMAIL}`);

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

    if (!(await Doctor.findOne({ user: docUser._id }))) {
      await Doctor.create({
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
    console.log(`Demo ready: ${d.clinic.name} + ${d.doctor.name}`);
  }

  console.log('\nSeed done.');
  console.log(`Admin login : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Demo logins : clinic1.demo@multihealth.demo, anita.demo@multihealth.demo / ${DEMO_PASSWORD}`);
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});