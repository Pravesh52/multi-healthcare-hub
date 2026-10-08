import Appointment from '../models/Appointment.js';
import {
  todayIST,
  nowMinutesIST,
  toMinutes,
  toHHmm,
  dayOfWeek,
  addDays,
} from '../utils/time.js';

export const MAX_ADVANCE_DAYS = 30;

const closed = (reason) => ({ open: false, reason, slots: [] });

// All slot start times from the doctor's weekly schedule, e.g. ["09:00","09:20",...]
const generateSlotTimes = (doctor, date) => {
  const day = dayOfWeek(date);
  const step = doctor.slotMinutes || 20;
  const times = new Set();

  doctor.schedule
    .filter((s) => s.day === day)
    .forEach((block) => {
      const end = toMinutes(block.end);
      for (let t = toMinutes(block.start); t + step <= end; t += step) {
        times.add(toHHmm(t));
      }
    });

  return [...times].sort();
};

// doctor.clinic should be populated (we need its off days)
export const getDaySlots = async (doctor, date) => {
  const today = todayIST();

  if (date < today) return closed('This date has already passed');
  if (date > addDays(today, MAX_ADVANCE_DAYS)) {
    return closed(`You can book up to ${MAX_ADVANCE_DAYS} days in advance`);
  }
  if (doctor.leaveDates.includes(date)) return closed('The doctor is on leave on this date');
  if (date === today && doctor.unavailableToday) return closed('The doctor is not available today');
  if (doctor.clinic?.timings?.offDays?.includes(dayOfWeek(date))) {
    return closed('The clinic is closed on this day');
  }

  const times = generateSlotTimes(doctor, date);
  if (!times.length) return closed('The doctor does not sit on this day');

  // Slots held by a pending or approved appointment
  const booked = new Set(await Appointment.distinct('slot', { doctor: doctor._id, date, active: true }));
  const nowMin = nowMinutesIST();

  const slots = times.map((time) => ({
    time,
    available: !booked.has(time) && (date !== today || toMinutes(time) > nowMin),
  }));

  return { open: true, reason: null, slots };
};