const TZ = 'Asia/Kolkata';
const fmt = (date, options) => new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...options }).format(date);

// Today's date in India as "2026-10-08"
export const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  );

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// "2026-10-08" -> "08 Oct 2026"
export const formatDate = (date) =>
  date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

// "2026-10-08" -> "Thu, 08 Oct"
export const formatDayShort = (date) =>
  date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
        timeZone: 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : '';

// "2026-10-08" -> "Today", "Tomorrow", "Yesterday" or the date
export const relativeDay = (date) => {
  const today = todayIST();
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatDate(date);
};

// "14:30" -> "2:30 PM"
export const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// A full timestamp from the server (ISO) -> "08 Oct 2026, 2:30 PM"
export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const day = fmt(d, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return `${day}, ${time}`;
};

// "5 min ago", "2 hr ago", "3 days ago"
export const timeAgo = (iso) => {
  if (!iso) return '';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return fmt(new Date(iso), { day: '2-digit', month: 'short', year: 'numeric' });
};