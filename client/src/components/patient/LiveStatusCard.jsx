import { useEffect, useRef } from 'react';
import { BellRing, CircleCheck, Hourglass, QrCode } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import { QUEUE_STATE } from '@/utils/constants.js';
import { formatTime } from '@/utils/formatDate.js';

const STYLE = {
  your_turn: 'border-ok bg-ok-soft',
  next: 'border-warn bg-warn-soft',
  waiting: 'border-line',
  not_checked_in: 'border-line',
  completed: 'border-line',
};

const describe = (item) => {
  const ahead = item.ahead ?? 0;
  switch (item.state) {
    case 'your_turn':
      return { Icon: BellRing, title: 'It is your turn', text: 'Please go inside now.' };
    case 'next':
      return { Icon: Hourglass, title: 'You are next', text: 'Please be ready near the doctor\u2019s room.' };
    case 'waiting':
      return {
        Icon: Hourglass,
        title: ahead === 1 ? '1 person is ahead of you' : `${ahead} people are ahead of you`,
        text: item.etaMinutes > 0 ? `Estimated wait: about ${item.etaMinutes} minutes.` : 'Please stay nearby.',
      };
    case 'completed':
      return { Icon: CircleCheck, title: 'Your visit is complete', text: 'Thank you. You can now rate your visit.' };
    default:
      return {
        Icon: QrCode,
        title: 'You are not checked in yet',
        text: 'Reach the clinic and show the QR code of your receipt at the reception. You join the queue after check-in.',
      };
  }
};

export default function LiveStatusCard({ item, onReceipt }) {
  const prev = useRef(item.state);

  // A short vibration when the turn comes (on phones that support it)
  useEffect(() => {
    if (prev.current !== 'your_turn' && item.state === 'your_turn') {
      try {
        navigator.vibrate?.([300, 150, 300]);
      } catch {
        /* not supported */
      }
    }
    prev.current = item.state;
  }, [item.state]);

  const { Icon, title, text } = describe(item);
  const s = QUEUE_STATE[item.state] || QUEUE_STATE.not_checked_in;

  return (
    <article className={clsx('card border-2', STYLE[item.state])}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{item.doctorName}</h3>
          <p className="text-sm text-muted">
            {item.clinicName} · {formatTime(item.slot)}
          </p>
        </div>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0 rounded-2xl bg-[#F2B632] px-5 py-3 text-center text-[#12303A]">
          <p className="text-xs font-bold">TOKEN</p>
          <p className="text-4xl font-bold leading-none tabular-nums">{item.tokenNo}</p>
        </div>
        <div className="min-w-0" aria-live="polite">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Icon size={22} className="shrink-0" aria-hidden="true" />
            {title}
          </p>
          <p className="mt-0.5 text-muted">{text}</p>
        </div>
      </div>

      {item.nowServingToken != null && item.state !== 'completed' && item.state !== 'your_turn' && (
        <p className="mt-3 text-sm text-muted">
          Now serving: <b className="text-ink">token #{item.nowServingToken}</b>
        </p>
      )}
      {item.paused && item.state !== 'completed' && (
        <p role="status" className="mt-3 rounded-lg bg-warn-soft p-2 text-sm font-medium text-warn">
          The doctor has paused the queue for a short break. Your wait may be a little longer.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {item.state === 'not_checked_in' && (
          <Button size="sm" icon={QrCode} onClick={() => onReceipt?.(item.appointmentId)}>
            Show my receipt and QR
          </Button>
        )}
        {item.state === 'completed' && (
          <>
            <Button size="sm" to="/patient/appointments?status=completed">
              Rate your visit
            </Button>
            <Button size="sm" variant="outline" to="/patient/prescriptions">
              My prescriptions
            </Button>
          </>
        )}
      </div>
    </article>
  );
}