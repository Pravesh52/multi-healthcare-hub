import Prescription from '../models/Prescription.js';
import Appointment from '../models/Appointment.js';
import { notifyUser } from '../services/notify.service.js';
import { todayIST, addDays } from '../utils/time.js';

export const processFollowUps = async () => {
  const today = todayIST();
  const tomorrow = addDays(today, 1);

  const due = await Prescription.find({
    followUpDate: { $gte: today, $lte: tomorrow },
    followUpReminderSent: { $ne: true },
  })
    .populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } })
    .limit(500);

  let sent = 0;
  for (const rx of due) {
    // Claim it first, so two runs can never send the same reminder twice
    const claimed = await Prescription.findOneAndUpdate(
      { _id: rx._id, followUpReminderSent: { $ne: true } },
      { $set: { followUpReminderSent: true } }
    );
    if (!claimed) continue;

    // Already booked for that day? Then no reminder is needed
    const booked = await Appointment.exists({
      patient: rx.patient,
      doctor: rx.doctor._id,
      date: rx.followUpDate,
      active: true,
    });
    if (booked) continue;

    await notifyUser(rx.patient, {
      type: 'follow_up',
      title: 'Follow-up visit',
      message: `${rx.doctor.user.name} asked you to come for a follow-up on ${rx.followUpDate}. Please book a slot.`,
      data: { prescriptionId: rx._id, appointmentId: rx.appointment, doctorId: rx.doctor._id },
    });
    sent++;
  }

  return { sent };
};