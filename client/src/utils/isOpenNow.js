const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Day of the week (0 = Sunday) and minutes since midnight, in India
export const getIndiaNow = (now = new Date()) => {
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { day: DAYS[p.weekday], minutes: Number(p.hour) * 60 + Number(p.minute) };
};

// timings = { open: '09:00', close: '17:00', offDays: [0] }
export const isOpenNow = (timings, now = new Date()) => {
  if (!timings?.open || !timings?.close) return { open: false, label: 'Timings not set', closedToday: false };

  const { day, minutes } = getIndiaNow(now);
  if ((timings.offDays || []).includes(day)) return { open: false, label: 'Closed today', closedToday: true };

  const open = minutes >= toMinutes(timings.open) && minutes < toMinutes(timings.close);
  return { open, label: open ? 'Open now' : 'Closed now', closedToday: false };
};