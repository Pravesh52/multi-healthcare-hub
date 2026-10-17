import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Clinic from '../models/Clinic.js';
import Appointment from '../models/Appointment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ROLES, VERIFICATION, APPOINTMENT_STATUS } from '../utils/constants.js';
import { cached } from '../services/cache.service.js';
import { getIO } from '../sockets/io.js';

// Doctors who have the app open right now (counted by person, not by browser tab)
const countDoctorsOnline = async () => {
  const io = getIO();
  if (!io) return 0;
  try {
    const sockets = await io.in('role:doctor').fetchSockets();
    return new Set(sockets.map((s) => s.data?.user?.id).filter(Boolean)).size;
  } catch {
    return 0;
  }
};

export const publicStats = asyncHandler(async (req, res) => {
  const counts = await cached('stats:public', 60, async () => {
    const clinicIds = await Clinic.distinct('_id', { status: VERIFICATION.VERIFIED });
    const [patients, doctors, visits] = await Promise.all([
      User.countDocuments({ role: ROLES.PATIENT, isActive: true }),
      Doctor.countDocuments({ status: VERIFICATION.VERIFIED, clinic: { $in: clinicIds } }),
      Appointment.countDocuments({ status: APPOINTMENT_STATUS.COMPLETED }),
    ]);
    return { patients, doctors, clinics: clinicIds.length, visits };
  });

  res.json({ success: true, ...counts, doctorsOnline: await countDoctorsOnline() });
});