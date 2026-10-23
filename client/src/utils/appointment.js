const HOUR = 60 * 60 * 1000;

export const MIN_NOTICE_HOURS = 2;
export const MAX_RESCHEDULES = 2;

// The real moment a slot starts (India time)
export const slotStart = (date, slot) => new Date(`${date}T${slot}:00+05:30`);
export const hoursUntil = (date, slot) => (slotStart(date, slot).getTime() - Date.now()) / HOUR;

// Returns a sentence when the patient cannot change this appointment, or '' when they can
export const changeBlockReason = (appt) => {
  if (!['pending', 'approved'].includes(appt.status)) return 'This appointment can no longer be changed.';
  if (appt.isWalkIn) return 'A walk-in visit cannot be changed.';
  if (appt.queueStatus && appt.queueStatus !== 'not_arrived') {
    return 'You are already checked in, so this appointment cannot be changed.';
  }
  const hours = hoursUntil(appt.date, appt.slot);
  if (appt.status === 'approved' && hours < MIN_NOTICE_HOURS) {
    return `An approved appointment can be changed only ${MIN_NOTICE_HOURS} hours or more before the slot.`;
  }
  if (appt.status === 'pending' && hours <= 0) return 'The time of this request has passed.';
  return '';
};

export const rescheduleBlockReason = (appt) => {
  const base = changeBlockReason(appt);
  if (base) return base;
  if ((appt.rescheduleCount || 0) >= MAX_RESCHEDULES) {
    return `An appointment can be rescheduled only ${MAX_RESCHEDULES} times. Please cancel it and book again.`;
  }
  if (appt.payment?.status === 'paid') {
    return 'You paid online. Please cancel it (you will be refunded) and book again.';
  }
  return '';
};

// The server has no "did I review this" call, so this browser remembers it
const KEY = 'mh_reviewed';
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};
export const isReviewed = (id) => read().includes(String(id));
export const markReviewed = (id) => {
  try {
    const list = read();
    if (!list.includes(String(id))) {
      list.push(String(id));
      localStorage.setItem(KEY, JSON.stringify(list.slice(-200)));
    }
  } catch {
    /* storage can be blocked */
  }
};