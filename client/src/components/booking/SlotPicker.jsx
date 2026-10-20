import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { getSlots } from '@/services/doctor.service.js';
import { addDays, formatDate, formatTime, todayIST } from '@/utils/formatDate.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { WEEKDAYS } from '@/utils/constants.js';

const DAYS_AHEAD = 30;

const monthShort = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });

export default function SlotPicker({
  doctorId,
  schedule = [],
  leaveDates = [],
  unavailableToday = false,
  clinicOffDays = [],
  value, // { date, slot }
  onChange,
}) {
  const stripRef = useRef(null);
  const today = todayIST();

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)).map((date) => {
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        let reason = '';
        if (!schedule.some((s) => s.day === dow)) reason = 'The doctor does not sit on this day';
        else if (leaveDates.includes(date)) reason = 'The doctor is on leave';
        else if (clinicOffDays.includes(dow)) reason = 'The clinic is closed on this day';
        else if (date === today && unavailableToday) reason = 'The doctor is not available today';
        return { date, dow, reason };
      }),
    [today, schedule, leaveDates, clinicOffDays, unavailableToday]
  );

  // Choose the first open day by itself
  useEffect(() => {
    if (value.date) return;
    const first = days.find((d) => !d.reason);
    if (first) onChange({ date: first.date, slot: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, value.date]);

  const slotsQ = useQuery({
    queryKey: ['slots', doctorId, value.date],
    queryFn: () => getSlots(doctorId, value.date),
    enabled: !!value.date,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // The chosen slot was taken by someone else
  useEffect(() => {
    if (!value.slot || !slotsQ.data?.slots) return;
    const found = slotsQ.data.slots.find((s) => s.time === value.slot);
    if (!found || !found.available) {
      onChange({ date: value.date, slot: '' });
      toast.error('That slot was just taken. Please choose another.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsQ.data]);

  const scrollStrip = (dir) => stripRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  const noOpenDay = days.every((d) => d.reason);

  const slots = slotsQ.data?.slots || [];
  const groups = [
    { label: 'Morning', items: slots.filter((s) => Number(s.time.slice(0, 2)) < 12) },
    { label: 'Afternoon', items: slots.filter((s) => Number(s.time.slice(0, 2)) >= 12 && Number(s.time.slice(0, 2)) < 17) },
    { label: 'Evening', items: slots.filter((s) => Number(s.time.slice(0, 2)) >= 17) },
  ].filter((g) => g.items.length);
  const freeCount = slots.filter((s) => s.available).length;

  if (noOpenDay) {
    return (
      <p className="rounded-xl bg-warn-soft p-3 text-sm font-medium text-warn">
        This doctor has no open day in the next {DAYS_AHEAD} days. Please check again later.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="label !mb-0 text-base">Choose a day</h3>
        <div className="hidden gap-1 md:flex">
          <button type="button" onClick={() => scrollStrip(-1)} aria-label="Earlier days" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-soft">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scrollStrip(1)} aria-label="Later days" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-soft">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div ref={stripRef} className="scrollbar-none -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Days">
        {days.map((d) => {
          const selected = d.date === value.date;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!!d.reason}
              aria-pressed={selected}
              title={d.reason || formatDate(d.date)}
              onClick={() => onChange({ date: d.date, slot: '' })}
              className={clsx(
                'flex min-h-[68px] w-[60px] shrink-0 flex-col items-center justify-center rounded-xl border-2 text-center transition-colors',
                selected ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft',
                d.reason && 'cursor-not-allowed opacity-40 hover:bg-card'
              )}
            >
              <span className="text-xs font-semibold">{d.date === today ? 'Today' : WEEKDAYS[d.dow].slice(0, 3)}</span>
              <span className="text-xl font-bold leading-tight">{Number(d.date.slice(8))}</span>
              <span className="text-xs">{monthShort(d.date)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <h3 className="label text-base">
          Choose a time{value.date && <span className="font-normal text-muted"> · {formatDate(value.date)}</span>}
        </h3>

        {slotsQ.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : slotsQ.isError ? (
          <ErrorState message={getErrorMessage(slotsQ.error)} onRetry={() => slotsQ.refetch()} className="!py-4" />
        ) : slotsQ.data && !slotsQ.data.open ? (
          <p className="rounded-xl bg-warn-soft p-3 text-sm font-medium text-warn">{slotsQ.data.reason}</p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.label} className="mb-3">
                <p className="mb-1 text-sm font-semibold text-muted">{g.label}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {g.items.map((s) => {
                    const selected = s.time === value.slot;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        aria-pressed={selected}
                        onClick={() => onChange({ date: value.date, slot: s.time })}
                        className={clsx(
                          'min-h-[44px] rounded-lg border-2 px-1 text-sm font-semibold transition-colors',
                          selected ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft',
                          !s.available && 'cursor-not-allowed line-through opacity-40 hover:bg-card'
                        )}
                      >
                        {formatTime(s.time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted">
              {freeCount} {freeCount === 1 ? 'slot' : 'slots'} available. Slot availability refreshes by itself.
            </p>
          </>
        )}
      </div>
    </div>
  );
}