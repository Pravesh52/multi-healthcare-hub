const TZ = 'Asia/Kolkata';

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// "2026-10-08"
export const todayIST = () => dateFmt.format(new Date());

// Minutes since midnight in IST (e.g. 10:30 -> 630)
export const nowMinutesIST = () => {
  const parts = timeFmt.formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
};

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const toHHmm = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// 0 = Sunday ... 6 = Saturday
export const dayOfWeek = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const isValidDate = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
};

// The real moment a slot starts (IST is UTC+05:30)
export const slotDateTime = (date, slot) => new Date(`${date}T${slot}:00+05:30`);