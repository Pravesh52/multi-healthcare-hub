import mongoose from 'mongoose';
import { env } from '../config/env.js'; // also loads .env
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Clinic from '../models/Clinic.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import Review from '../models/Review.js';
import Receipt from '../models/Receipt.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

const OLD_ADMIN = 'admin@multihealth.demo';
const DEMO_EMAILS = [1, 2, 3].map((n) => `clinic${n}.demo@multihealth.demo`).concat([
  'anita.demo@multihealth.demo',
  'rakesh.demo@multihealth.demo',
  'sneha.demo@multihealth.demo',
]);
const DEMO_PHONES = ['9111111101', '9111111102', '9111111103', '9111111104', '9111111105'];

const confirmed = process.argv.includes('--yes');
const keepEmail = env.ADMIN_EMAIL.trim().toLowerCase();

const run = async () => {
  await connectDB();

  // The old default admin is removed only when a different admin is set in .env
  const emails = OLD_ADMIN === keepEmail ? DEMO_EMAILS : [...DEMO_EMAILS, OLD_ADMIN];
  if (!keepEmail) console.log('Note: ADMIN_EMAIL is not set, so the old demo admin is kept for now.');

  const users = await User.find({
    email: { $ne: keepEmail || null },
    $or: [
      { email: { $in: keepEmail ? emails : DEMO_EMAILS } },
      { phone: { $in: DEMO_PHONES } },
    ],
  }).select('_id');
  const userIds = users.map((u) => u._id);

  const clinics = await Clinic.find({ $or: [{ regNo: /^DEMO-CL-/ }, { owner: { $in: userIds } }] }).select('_id');
  const clinicIds = clinics.map((c) => c._id);

  const doctors = await Doctor.find({ $or: [{ medRegNo: /^DEMO-MP-/ }, { user: { $in: userIds } }] }).select('_id');
  const doctorIds = doctors.map((d) => d._id);

  const appts = await Appointment.find({
    $or: [{ doctor: { $in: doctorIds } }, { clinic: { $in: clinicIds } }, { patient: { $in: userIds } }],
  }).select('_id');
  const apptIds = appts.map((a) => a._id);

  const plan = [
    ['Users', User, { _id: { $in: userIds } }],
    ['Clinics', Clinic, { _id: { $in: clinicIds } }],
    ['Doctors', Doctor, { _id: { $in: doctorIds } }],
    ['Appointments', Appointment, { _id: { $in: apptIds } }],
    ['Receipts', Receipt, { appointment: { $in: apptIds } }],
    [
      'Prescriptions',
      Prescription,
      { $or: [{ appointment: { $in: apptIds } }, { doctor: { $in: doctorIds } }, { patient: { $in: userIds } }] },
    ],
    [
      'Reviews',
      Review,
      {
        $or: [
          { appointment: { $in: apptIds } },
          { doctor: { $in: doctorIds } },
          { clinic: { $in: clinicIds } },
          { patient: { $in: userIds } },
        ],
      },
    ],
    ['Notifications', Notification, { user: { $in: userIds } }],
    [
      'Audit logs',
      AuditLog,
      { $or: [{ actor: { $in: userIds } }, { subject: { $in: userIds } }, { resourceId: { $in: [...clinicIds, ...doctorIds, ...apptIds] } }] },
    ],
  ];

  console.log(confirmed ? 'Deleting demo data:' : 'Preview (nothing is deleted yet):');
  for (const [label, Model, filter] of plan) {
    const n = confirmed ? (await Model.deleteMany(filter)).deletedCount : await Model.countDocuments(filter);
    console.log(`  ${label.padEnd(14)} ${n}`);
  }
  if (!confirmed) console.log('\nIf this looks right, run it again with --yes to delete.');

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Cleanup failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});