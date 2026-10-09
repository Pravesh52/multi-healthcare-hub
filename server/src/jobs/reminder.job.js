import Appointment from '../models/Appointment.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS } from '../utils/constants.js';
import { notifyUser } from '../services/notify.service.js';

export const processReminder = async (job) => {
  const appt = await Appointment.findById(job.data.appointmentId)
    .populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } })
    .populate('clinic', 'name');

  if (!appt || appt.status !== ST.APPROVED || appt.queueStatus !== QS.NOT_ARRIVED) {
    return { skipped: true };
  }

  await notifyUser(
    appt.patient,
    {
      type: 'reminder',
      title: 'Appointment reminder',
      message: `Reminder: your appointment with ${appt.doctor.user.name} at ${appt.clinic.name} is on ${appt.date} at ${appt.slot} (token #${appt.tokenNo}). Please reach 10 minutes early. - MultiHealth Care Hub`,
      data: { appointmentId: appt._id },
    },
    { sms: true }
  );

  return { sent: true };
};