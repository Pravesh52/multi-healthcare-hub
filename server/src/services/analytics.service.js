import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { APPOINTMENT_STATUS as ST } from '../utils/constants.js';
import { addDays } from '../utils/time.js';

const REAL = [ST.APPROVED, ST.COMPLETED, ST.NO_SHOW]; // bookings that were really going to happen
const round1 = (n) => Math.round(n * 10) / 10;
const pick = (list, key) => list.find((x) => x._id === key)?.count || 0;
const flag = (status) => ({ $cond: [{ $eq: ['$status', status] }, 1, 0] });

// match must already contain ObjectIds (e.g. { clinic: clinicId })
export const getAnalytics = async ({ match, from, to }) => {
  const [r] = await Appointment.aggregate([
    { $match: { ...match, date: { $gte: from, $lte: to } } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        daily: [
          { $match: { status: { $in: REAL } } },
          {
            $group: {
              _id: '$date',
              booked: { $sum: 1 },
              completed: { $sum: flag(ST.COMPLETED) },
              noShow: { $sum: flag(ST.NO_SHOW) },
            },
          },
        ],
        hours: [
          { $match: { status: { $in: REAL } } },
          { $group: { _id: { $substrBytes: ['$slot', 0, 2] }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        sources: [{ $match: { status: { $in: REAL } } }, { $group: { _id: '$isWalkIn', count: { $sum: 1 } } }],
        consult: [
          { $match: { status: ST.COMPLETED, consultationMinutes: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$consultationMinutes' } } },
        ],
        wait: [
          { $match: { status: ST.COMPLETED, checkedInAt: { $type: 'date' }, startedAt: { $type: 'date' } } },
          { $project: { minutes: { $divide: [{ $subtract: ['$startedAt', '$checkedInAt'] }, 60000] } } },
          { $match: { minutes: { $gte: 0 } } },
          { $group: { _id: null, avg: { $avg: '$minutes' } } },
        ],
        money: [
          {
            $group: {
              _id: null,
              onlinePaid: {
                $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, { $ifNull: ['$payment.amount', 0] }, 0] },
              },
              completedFees: {
                $sum: { $cond: [{ $eq: ['$status', ST.COMPLETED] }, { $ifNull: ['$payment.amount', 0] }, 0] },
              },
            },
          },
        ],
        doctors: [
          { $match: { status: ST.COMPLETED } },
          { $group: { _id: '$doctor', completed: { $sum: 1 } } },
          { $sort: { completed: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);

  const completed = pick(r.byStatus, ST.COMPLETED);
  const noShow = pick(r.byStatus, ST.NO_SHOW);
  const approved = pick(r.byStatus, ST.APPROVED);
  const finished = completed + noShow;

  const totals = {
    appointments: r.byStatus.reduce((sum, x) => sum + x.count, 0),
    booked: approved + completed + noShow,
    pending: pick(r.byStatus, ST.PENDING),
    approved,
    completed,
    noShow,
    cancelled: pick(r.byStatus, ST.CANCELLED),
    rejected: pick(r.byStatus, ST.REJECTED),
    expired: pick(r.byStatus, ST.EXPIRED),
  };

  // Every day in the range, so a chart has no gaps
  const dailyMap = new Map(r.daily.map((d) => [d._id, d]));
  const daily = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const x = dailyMap.get(d);
    daily.push({ date: d, booked: x?.booked || 0, completed: x?.completed || 0, noShow: x?.noShow || 0 });
  }

  const hours = r.hours.map((h) => ({ hour: h._id, label: `${h._id}:00-${h._id}:59`, count: h.count }));
  const peak = hours.reduce((best, h) => (!best || h.count > best.count ? h : best), null);

  const docs = await Doctor.find({ _id: { $in: r.doctors.map((d) => d._id) } })
    .populate('user', 'name')
    .select('user speciality')
    .lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  return {
    range: { from, to },
    totals,
    rates: { noShowRate: finished ? round1((noShow / finished) * 100) : 0 },
    avgConsultationMinutes: r.consult[0] ? round1(r.consult[0].avg) : 0,
    avgWaitMinutes: r.wait[0] ? round1(r.wait[0].avg) : 0,
    sources: { online: pick(r.sources, false), walkIn: pick(r.sources, true) },
    money: { onlinePaid: r.money[0]?.onlinePaid || 0, completedFees: r.money[0]?.completedFees || 0 },
    daily,
    hours,
    peakHour: peak,
    doctors: r.doctors.map((d) => ({
      doctorId: d._id,
      name: byId.get(String(d._id))?.user?.name || 'Unknown',
      speciality: byId.get(String(d._id))?.speciality,
      completed: d.completed,
    })),
  };
};