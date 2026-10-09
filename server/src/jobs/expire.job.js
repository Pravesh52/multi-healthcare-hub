import Appointment from '../models/Appointment.js';
import { APPOINTMENT_STATUS as ST, QUEUE_STATUS as QS } from '../utils/constants.js';
import { notifyUser } from '../services/notify.service.js';
import { todayIST } from '../utils/time.js';

export const processExpire = async () => {
  // 1) Requests the doctor never answered
  const stale = await Appointment.find({ status: ST.PENDING, expiresAt: { $lt: new Date() } }).limit(200);

  let expired = 0;
  for (const a of stale) {
    const updated = await Appointment.findOneAndUpdate(
      { _id: a._id, status: ST.PENDING }, // skip it if the doctor answered a moment ago
      { $set: { status: ST.EXPIRED, active: false } },
      { new: true }
    );
    if (!updated) continue;
    expired++;

    await notifyUser(
      a.patient,
      {
        type: 'system',
        title: 'Request expired',
        message: `The doctor did not reply to your request for ${a.date} at ${a.slot}. Please book another slot. - MultiHealth Care Hub`,
        data: { appointmentId: a._id },
      },
      { sms: true }
    );
  }

  // 2) Approved appointments of earlier days where the patient never came
  const missed = await Appointment.updateMany(
    { status: ST.APPROVED, date: { $lt: todayIST() }, queueStatus: QS.NOT_ARRIVED },
    { $set: { status: ST.NO_SHOW, active: false, queueStatus: QS.NO_SHOW } }
  );

  return { expired, noShow: missed.modifiedCount };
};