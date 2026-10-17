import clsx from 'clsx';
import { APPOINTMENT_STATUS, TONE_BADGE } from '@/utils/constants.js';

export default function Badge({ tone = 'info', className = '', children }) {
  return <span className={clsx('badge', TONE_BADGE[tone] || TONE_BADGE.info, className)}>{children}</span>;
}

export function StatusBadge({ status, map = APPOINTMENT_STATUS, className = '' }) {
  const s = map[status] || { label: String(status || ''), tone: 'info' };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}