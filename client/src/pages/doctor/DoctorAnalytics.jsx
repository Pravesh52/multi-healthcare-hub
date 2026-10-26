import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CircleCheck, Hourglass, Timer, UserX } from 'lucide-react';
import clsx from 'clsx';
import DailyChart from '@/components/charts/DailyChart.jsx';
import HourChart from '@/components/charts/HourChart.jsx';
import StatCard from '@/components/common/StatCard.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input } from '@/components/common/FormField.jsx';
import { getDoctorAnalytics } from '@/services/analytics.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { addDays, formatDate, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const PRESETS = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Choose dates' },
];

const dayCount = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

export default function DoctorAnalytics() {
  const today = todayIST();
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);

  useEffect(() => {
    document.title = `Analytics - ${APP_NAME}`;
  }, []);

  const range =
    preset === 'custom'
      ? { from, to }
      : { from: addDays(today, -(PRESETS.find((p) => p.key === preset).days - 1)), to: today };

  let rangeError = '';
  if (preset === 'custom') {
    if (!from || !to) rangeError = 'Choose both dates.';
    else if (from > to) rangeError = '"From" must not be after "To".';
    else if (dayCount(from, to) > 366) rangeError = 'You can look at 366 days at most.';
  }

  const q = useQuery({
    queryKey: ['doc-analytics', range.from, range.to],
    queryFn: () => getDoctorAnalytics(range),
    enabled: !rangeError,
  });
  const d = q.data;

  const sourceTotal = d ? d.sources.online + d.sources.walkIn : 0;
  const onlinePct = sourceTotal ? Math.round((d.sources.online / sourceTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
        <p className="text-muted">How your visits are going. {d ? `${formatDate(d.range.from)} to ${formatDate(d.range.to)}` : ''}</p>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Time period">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={preset === p.key}
            onClick={() => setPreset(p.key)}
            className={clsx(
              'min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold',
              preset === p.key ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="grid max-w-md gap-3 xs:grid-cols-2">
          <Input label="From" type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} error={rangeError} />
        </div>
      )}

      {q.isError ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={CalendarCheck} label="Bookings" value={d?.totals.booked} loading={q.isLoading} hint="approved, done or missed" />
            <StatCard icon={CircleCheck} label="Visits completed" value={d?.totals.completed} loading={q.isLoading} tone="ok" />
            <StatCard
              icon={UserX}
              label="No-show rate"
              value={d ? `${d.rates.noShowRate}%` : undefined}
              loading={q.isLoading}
              tone={d?.rates.noShowRate >= 20 ? 'bad' : 'brand'}
              hint={d ? `${d.totals.noShow} did not come` : undefined}
            />
            <StatCard icon={Timer} label="Average visit" value={d ? `${d.avgConsultationMinutes} min` : undefined} loading={q.isLoading} />
            <StatCard icon={Hourglass} label="Average wait" value={d ? `${d.avgWaitMinutes} min` : undefined} loading={q.isLoading} tone="warn" hint="check-in to call" />
          </section>

          <section className="card" aria-label="Patients per day">
            <h2 className="text-xl font-bold">Patients per day</h2>
            <div className="mt-3">{d ? <DailyChart data={d.daily} /> : <div className="h-64 animate-pulse rounded-lg bg-soft" />}</div>
          </section>

          <section className="card" aria-label="Busy hours">
            <h2 className="text-xl font-bold">Busy hours</h2>
            <p className="text-sm text-muted">
              {d?.peakHour ? `Your busiest hour is ${Number(d.peakHour.hour) % 12 || 12} ${Number(d.peakHour.hour) >= 12 ? 'PM' : 'AM'}.` : 'The hour of the day when most patients come.'}
            </p>
            <div className="mt-3">{d ? <HourChart data={d.hours} /> : <div className="h-60 animate-pulse rounded-lg bg-soft" />}</div>
          </section>

          {d && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="card" aria-label="How patients came">
                <h2 className="text-xl font-bold">How patients came</h2>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-soft" role="img" aria-label={`${onlinePct} percent booked online`}>
                  <div className="h-full bg-brand" style={{ width: `${onlinePct}%` }} />
                </div>
                <p className="mt-2 text-sm">
                  <b>{d.sources.online}</b> booked online · <b>{d.sources.walkIn}</b> walked in
                </p>
              </div>

              <div className="card" aria-label="Fees">
                <h2 className="text-xl font-bold">Fees (an estimate)</h2>
                <p className="mt-2 text-sm">
                  Fees of completed visits: <b>₹{d.money.completedFees.toLocaleString('en-IN')}</b>
                </p>
                <p className="text-sm">
                  Paid online: <b>₹{d.money.onlinePaid.toLocaleString('en-IN')}</b>
                </p>
                <p className="mt-2 text-xs text-muted">
                  This is only the fee listed on each visit. Cash taken at the clinic is not recorded, so this is not your actual income.
                </p>
              </div>

              <div className="card lg:col-span-2" aria-label="All appointments">
                <h2 className="text-xl font-bold">All requests in this period</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Waiting for reply', d.totals.pending],
                    ['Approved, not finished', d.totals.approved],
                    ['Cancelled', d.totals.cancelled],
                    ['Rejected', d.totals.rejected],
                    ['Expired', d.totals.expired],
                    ['No-show', d.totals.noShow],
                    ['Completed', d.totals.completed],
                    ['Total', d.totals.appointments],
                  ].map(([label, n]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted">{label}</dt>
                      <dd className="text-xl font-bold tabular-nums">{n}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}