import mongoose from 'mongoose';
import { env } from '../config/env.js'; // also loads .env
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import { ROLES } from '../utils/constants.js';

const email = env.ADMIN_EMAIL.trim().toLowerCase();
const password = env.ADMIN_PASSWORD;

const fail = (msg) => {
  console.error(`Admin not created: ${msg}`);
  process.exit(1);
};

if (!email || !password) fail('set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
if (!/^\S+@\S+\.\S+$/.test(email)) fail('ADMIN_EMAIL is not a valid email');
if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail('ADMIN_PASSWORD must be at least 10 characters with letters and numbers');
}
if (password === 'Admin@12345') fail('please choose your own password, not the old demo one');

const run = async () => {
  await connectDB();

  let admin = await User.findOne({ email });
  if (admin && admin.role !== ROLES.ADMIN) fail('this email already belongs to a non-admin account');

  const created = !admin;
  if (!admin) admin = new User({ name: 'Admin', email, role: ROLES.ADMIN, consentAt: new Date() });

  await admin.setPassword(password); // running this again with a new password updates it
  admin.isActive = true;
  await admin.save();

  console.log(created ? `Admin created: ${email}` : `Admin updated: ${email}`);
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});