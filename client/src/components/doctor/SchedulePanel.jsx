import { Copy, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';
import { WEEKDAYS } from '@/utils/constants.js';

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MAX_BLOCKS_PER_DAY = 3;

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Returns { [day]: 'message' } for every day that has a problem
export const validateSchedule = (schedule, slotMinutes = 20) => {
  const errors = {};
  DAY_ORDER.forEach((day) => {
    const blocks = schedule.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      if (!b.start || !b.end) {
        errors[day] = 'Choose both the start and the end time.';
        break;
      }
      if (b.end <= b.start) {
        errors[day] = 'The end time must be after the start time.';
        break;
      }
      if (toMin(b.end) - toMin(b.start) < slotMinutes) {
        errors[day] = `Each time range must be at least ${slotMinutes} minutes long (one visit).`;
        break;
      }
      if (i > 0 && b.start < blocks[i - 1].end) {
        errors[day] = 'Time ranges on the same day must not overlap.';
        break;
      }
    }
  });
  return errors;
};

export default function SchedulePanel({ value = [], onChange, errors = {}, disabled = false }) {
  const blocksOf = (day) => value.filter((s) => s.day === day);
  const setDay = (day, blocks) => onChange([...value.filter((s) => s.day !== day), ...blocks.map((b) => ({ day, start: b.start, end: b.end }))]);

  const toggle = (day, on) => setDay(day, on ? [{ start: '09:00', end: '17:00' }] : []);
  const edit = (day, index, patch) => setDay(day, blocksOf(day).map((b, i) => (i === index ? { ...b, ...patch } : b)));
  const add = (day) => {
    const blocks = blocksOf(day);
    const last = blocks[blocks.length - 1];
    const start = last && last.end < '20:00' ? last.end : '17:00';
    setDay(day, [...blocks, { start, end: start < '20:00' ? '20:00' : '21:00' }]);
  };
  const remove = (day, index) => setDay(day, blocksOf(day).filter((_, i) => i !== index));

  const copyToAll = (day) => {
    const source = blocksOf(day);
    const working = DAY_ORDER.filter((d) => value.some((s) => s.day === d) || d === day);
    onChange(working.flatMap((d) => source.map((b) => ({ day: d, start: b.start, end: b.end }))));
  };

  return (
    <div className="space-y-3">
      {DAY_ORDER.map((day) => {
        const blocks = blocksOf(day);
        const on = blocks.length > 0;
        const id = `day-${day}`;
        return (
          <fieldset key={day} disabled={disabled} className={clsx('rounded-xl border p-3', errors[day] ? 'border-bad' : 'border-line')}>
            <legend className="sr-only">{WEEKDAYS[day]}</legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3">
                <input
                  id={id}
                  type="checkbox"
                  className="h-5 w-5 accent-[rgb(var(--c-brand))]"
                  checked={on}
                  onChange={(e) => toggle(day, e.target.checked)}
                />
                <span className="text-base font-bold">{WEEKDAYS[day]}</span>
                {!on && <span className="text-sm text-muted">Not sitting</span>}
              </label>
              {on && (
                <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyToAll(day)}>
                  Copy to all working days
                </Button>
              )}
            </div>

            {on && (
              <div className="mt-2 space-y-2">
                {blocks.map((b, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="label" htmlFor={`${id}-s-${i}`}>
                        From
                      </label>
                      <input id={`${id}-s-${i}`} type="time" className="input w-36" value={b.start} onChange={(e) => edit(day, i, { start: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`${id}-e-${i}`}>
                        To
                      </label>
                      <input id={`${id}-e-${i}`} type="time" className="input w-36" value={b.end} onChange={(e) => edit(day, i, { end: e.target.value })} />
                    </div>
                    {blocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(day, i)}
                        aria-label={`Remove time range ${i + 1} of ${WEEKDAYS[day]}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-bad hover:bg-bad-soft"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                {blocks.length < MAX_BLOCKS_PER_DAY && (
                  <Button size="sm" variant="outline" icon={Plus} onClick={() => add(day)}>
                    Add another time range
                  </Button>
                )}
              </div>
            )}

            {errors[day] && (
              <p role="alert" className="field-error">
                {errors[day]}
              </p>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}