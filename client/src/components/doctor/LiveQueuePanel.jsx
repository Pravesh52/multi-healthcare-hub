import { useEffect, useState } from 'react';
import { BellRing, Check, Coffee, FileText, Megaphone, Phone, Play, RefreshCw, Siren, SkipForward, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { useLiveQueue } from '@/hooks/useLiveQueue.js';
import useSocket from '@/hooks/useSocket.js';
import { callNext, checkInById, makeEmergency, markDone, setPaused, skipPatient } from '@/services/queue.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatTime, timeAgo } from '@/utils/formatDate.js';

const SINCE_KEY = 'mh_serving_since';
const sinceFor = (id) => {
  try {
    const key = `${SINCE_KEY}_${id}`;
    let t = Number(sessionStorage.getItem(key));
    if (!t) {
      t = Date.now();
      sessionStorage.setItem(key, String(t));
    }
    return t;
  } catch {
    return Date.now();
  }
};

// Time spent with the current patient. The real consultation time is measured by the server.
function ServingTimer({ id }) {
  const [start, setStart] = useState(() => sinceFor(id));
  const [now, setNow] = useState(Date.now());
  useEffect(() => setStart(sinceFor(id)), [id]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - start) / 1000));
  return (
    <span className="tabular-nums">
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

const about = (p) =>
  [p?.age ? `${p.age} yrs` : null, p?.gender ? p.gender[0].toUpperCase() + p.gender.slice(1) : null].filter(Boolean).join(', ');

function Tile({ label, value, tone = '' }) {
  return (
    <div className="card !p-3 text-center">
      <p className={clsx('text-2xl font-bold tabular-nums', tone)}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function TokenBox({ n, className = '' }) {
  return (
    <span
      className={clsx(
        'flex shrink-0 flex-col items-center justify-center rounded-xl bg-[#F2B632] px-3 py-1.5 text-[#12303A]',
        className
      )}
    >
      <span className="text-[10px] font-bold leading-none">TOKEN</span>
      <span className="text-2xl font-bold leading-tight tabular-nums">{n}</span>
    </span>
  );
}

// isDoctor: only the doctor can press Done and write a prescription (the receptionist cannot)
export default function LiveQueuePanel({ doctorId = 'me', isDoctor = true, onPrescription, onAction }) {
  const { queue, loading, error, refresh } = useLiveQueue(doctorId);
  const { connected } = useSocket();
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'skip' | 'emergency', item, serving }
  const [lastDone, setLastDone] = useState(null);

  // One action at a time, so a double tap can never do something twice
  const run = async (key, fn, okMessage) => {
    if (busy) return undefined;
    setBusy(key);
    try {
      const d = await fn();
      if (okMessage) toast.success(typeof okMessage === 'function' ? okMessage(d) : okMessage);
      onAction?.();
      return d;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return undefined;
    } finally {
      setBusy('');
      refresh();
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (error && !queue) return <ErrorState message={error} onRetry={refresh} />;
  if (!queue) return null;

  const { serving, waiting = [], notArrived = [], paused } = queue;
  const next = waiting[0];

  const doCallNext = () => {
    setLastDone(null);
    run('next', () => callNext(doctorId), (d) => `Token #${d.serving.tokenNo} called`);
  };

  const doDone = async () => {
    const d = await run(`done-${serving.appointmentId}`, () => markDone(serving.appointmentId), (r) => r.message);
    if (d) setLastDone({ appointmentId: serving.appointmentId, name: serving.patient?.name, tokenNo: serving.tokenNo });
  };

  const confirmRun = async () => {
    const { type, item } = confirm;
    const fn = type === 'skip' ? () => skipPatient(item.appointmentId) : () => makeEmergency(item.appointmentId);
    await run(`${type}-${item.appointmentId}`, fn, (d) => d.message);
    setConfirm(null);
  };

  const confirmText = () => {
    if (!confirm) return '';
    const name = confirm.item.patient?.name || `token #${confirm.item.tokenNo}`;
    if (confirm.type === 'emergency') return `${name} will move to the front of the queue as an emergency.`;
    if (confirm.serving) {
      return confirm.item.skipCount >= 1
        ? `${name} was already skipped once after being called. Skipping again marks the patient as a no-show.`
        : `${name} will go back to the waiting list. If the patient is skipped twice after being called, they are marked as a no-show.`;
    }
    return `${name} will move to the end of the waiting list.`;
  };

  let callLabel = 'Call next patient';
  let callBlock = '';
  if (serving) {
    callBlock = isDoctor ? 'Press Done for the current patient first' : 'The doctor must press Done first';
  } else if (paused) {
    callBlock = 'The queue is on a break. Resume it first';
  } else if (!next) {
    callBlock = 'Nobody is waiting yet';
  }
  if (next && !serving && !paused) callLabel = `Call token #${next.tokenNo}: ${next.patient?.name || 'next patient'}`;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span role="status" className={clsx('inline-flex items-center gap-2 text-sm font-semibold', connected ? 'text-ok' : 'text-warn')}>
          <span className={connected ? 'live-dot' : 'inline-block h-2.5 w-2.5 rounded-full bg-warn'} />
          {connected ? 'Live updates are on' : 'Reconnecting...'}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant={paused ? 'primary' : 'outline'}
            icon={paused ? Play : Coffee}
            loading={busy === 'pause'}
            onClick={() =>
              run('pause', () => setPaused(doctorId, !paused), paused ? 'Queue resumed' : 'Queue paused. Patients can see the break.')
            }
          >
            {paused ? 'Resume queue' : 'Take a break'}
          </Button>
        </div>
      </div>

      {paused && (
        <p role="status" className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">
          The queue is on a break. You cannot call the next patient until you resume. Patients see that the doctor is on a break.
        </p>
      )}

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Waiting" value={waiting.length} tone="text-warn" />
        <Tile label="Not arrived yet" value={notArrived.length} />
        <Tile label="Completed today" value={queue.completedCount} tone="text-ok" />
        <Tile label="No-show" value={queue.noShowCount} tone={queue.noShowCount ? 'text-bad' : ''} />
      </div>
      <p className="-mt-2 text-xs text-muted">Average visit: about {queue.avgMinutes} minutes. Waiting time shown to patients is based on this.</p>

      {/* Banner after Done */}
      {lastDone && !serving && (
        <div className="card flex flex-wrap items-center justify-between gap-2 border-ok bg-ok-soft">
          <p className="font-semibold">
            Token #{lastDone.tokenNo} {lastDone.name ? `(${lastDone.name}) ` : ''}is done.
            {isDoctor && onPrescription ? ' Write a prescription?' : ''}
          </p>
          <div className="flex gap-2">
            {isDoctor && onPrescription && (
              <Button size="sm" icon={FileText} onClick={() => onPrescription({ appointmentId: lastDone.appointmentId, name: lastDone.name })}>
                Write prescription
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={X} onClick={() => setLastDone(null)} aria-label="Dismiss" />
          </div>
        </div>
      )}

      {/* Now serving */}
      <section aria-label="Now serving">
        {serving ? (
          <div className="card border-2 border-ok bg-ok-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-bold text-ok">
                <BellRing size={18} aria-hidden="true" /> NOW SERVING
              </p>
              <p className="text-sm font-semibold">
                Time with patient: <ServingTimer id={serving.appointmentId} />
              </p>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <TokenBox n={serving.tokenNo} className="px-4 py-2" />
              <div className="min-w-0">
                <p className="break-words text-xl font-bold">{serving.patient?.name}</p>
                <p className="text-sm text-muted">{about(serving.patient)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {serving.priority === 'emergency' && <Badge tone="bad">Emergency</Badge>}
                  {serving.isWalkIn && <Badge tone="info">Walk-in</Badge>}
                  {serving.patient?.phone && (
                    <a href={`tel:${serving.patient.phone}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                      <Phone size={14} aria-hidden="true" /> {serving.patient.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
            {serving.reason && <p className="mt-3 break-words text-sm">Reason: {serving.reason}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {isDoctor ? (
                <Button variant="ok" icon={Check} loading={busy.startsWith('done')} disabled={!!busy && !busy.startsWith('done')} onClick={doDone}>
                  Done
                </Button>
              ) : (
                <p className="rounded-lg bg-card p-2 text-sm">Only the doctor can press Done.</p>
              )}
              {isDoctor && onPrescription && (
                <Button
                  variant="outline"
                  icon={FileText}
                  onClick={() => onPrescription({ appointmentId: serving.appointmentId, name: serving.patient?.name })}
                >
                  Write prescription
                </Button>
              )}
              <Button
                variant="danger"
                icon={SkipForward}
                disabled={!!busy}
                onClick={() => setConfirm({ type: 'skip', item: serving, serving: true })}
              >
                Skip
              </Button>
            </div>
          </div>
        ) : (
          <div className="card text-center">
            <p className="text-lg font-bold">No patient inside</p>
            <p className="text-sm text-muted">Call the next patient when you are ready.</p>
          </div>
        )}

        <div className="mt-3">
          <Button
            block
            icon={Megaphone}
            className="min-h-[52px] text-lg"
            loading={busy === 'next'}
            disabled={!!callBlock || (!!busy && busy !== 'next')}
            onClick={doCallNext}
          >
            {callBlock ? 'Call next patient' : callLabel}
          </Button>
          {callBlock && <p className="mt-1 text-center text-sm text-muted">{callBlock}.</p>}
        </div>
      </section>

      {/* Waiting */}
      <section aria-label="Waiting list">
        <h2 className="mb-2 text-xl font-bold">
          Waiting <span className="text-base font-normal text-muted">({waiting.length})</span>
        </h2>
        {waiting.length === 0 ? (
          <div className="card text-center text-muted">Nobody is waiting. Patients appear here after they check in at the reception.</div>
        ) : (
          <ol className="space-y-2">
            {waiting.map((w, i) => (
              <li key={w.appointmentId} className={clsx('card', i === 0 && 'border-warn')}>
                <div className="flex items-start gap-3">
                  <TokenBox n={w.tokenNo} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <span className="break-words">{w.patient?.name}</span>
                      {i === 0 && <Badge tone="warn">Next</Badge>}
                      {w.priority === 'emergency' && <Badge tone="bad">Emergency</Badge>}
                      {w.isWalkIn && <Badge tone="info">Walk-in</Badge>}
                      {w.skipCount > 0 && <Badge tone="info">Skipped {w.skipCount}x</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {about(w.patient)}
                      {w.checkedInAt ? ` · here ${timeAgo(w.checkedInAt).replace(' ago', '')}` : ''}
                    </p>
                    {w.reason && <p className="mt-0.5 break-words text-sm">Reason: {w.reason}</p>}
                    <p className="mt-0.5 text-xs text-muted">
                      {w.ahead === 0 ? 'First in line' : `${w.ahead} ahead`}
                      {w.etaMinutes > 0 ? ` · about ${w.etaMinutes} min` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {w.priority !== 'emergency' && (
                    <Button size="sm" variant="outline" icon={Siren} disabled={!!busy} onClick={() => setConfirm({ type: 'emergency', item: w })}>
                      Emergency
                    </Button>
                  )}
                  {waiting.length > 1 && (
                    <Button size="sm" variant="outline" icon={SkipForward} disabled={!!busy} onClick={() => setConfirm({ type: 'skip', item: w })}>
                      Skip
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Not arrived */}
      <section aria-label="Not arrived yet">
        <h2 className="mb-2 text-xl font-bold">
          Not arrived yet <span className="text-base font-normal text-muted">({notArrived.length})</span>
        </h2>
        {notArrived.length === 0 ? (
          <div className="card text-center text-muted">Everyone with an appointment today has arrived.</div>
        ) : (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
            {notArrived.map((n) => (
              <li key={n.appointmentId} className="card flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <TokenBox n={n.tokenNo} />
                  <div className="min-w-0">
                    <p className="break-words font-bold">{n.patient?.name}</p>
                    <p className="text-sm text-muted">
                      {about(n.patient)} · slot {formatTime(n.slot)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    icon={UserCheck}
                    loading={busy === `in-${n.appointmentId}`}
                    disabled={!!busy && busy !== `in-${n.appointmentId}`}
                    onClick={() => run(`in-${n.appointmentId}`, () => checkInById(n.appointmentId), (d) => d.message)}
                  >
                    Check in
                  </Button>
                  <Button size="sm" variant="outline" icon={Siren} disabled={!!busy} onClick={() => setConfirm({ type: 'emergency', item: n })}>
                    Emergency
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Patients are normally checked in by scanning the QR code of their receipt. Use Check in if they forgot it.</p>
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'emergency' ? 'Mark as emergency?' : 'Skip this patient?'}
        message={confirmText()}
        confirmLabel={confirm?.type === 'emergency' ? 'Yes, emergency' : 'Yes, skip'}
        tone={confirm?.type === 'skip' ? 'danger' : 'primary'}
        loading={!!confirm && busy.startsWith(confirm.type)}
        onConfirm={confirmRun}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}