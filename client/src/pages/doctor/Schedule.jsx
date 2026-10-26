import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import SchedulePanel, { validateSchedule } from '@/components/doctor/SchedulePanel.jsx';
import Button from '@/components/common/Button.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Select } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getMyProfile, updateMyProfile } from '@/services/doctor.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDate, relativeDay, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60];
const MAX_LEAVES = 366;

export default function Schedule() {
  const queryClient = useQueryClient();
  const today = todayIST();

  const [schedule, setSchedule] = useState([]);
  const [slotMinutes, setSlotMinutes] = useState(20);
  const [errors, setErrors] = useState({});
  const [leaveDay, setLeaveDay] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    document.title = `Schedule - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['doc-profile'], queryFn: getMyProfile });
  const doctor = q.data?.doctor;

  useEffect(() => {
    if (!doctor) return;
    setSchedule((doctor.schedule || []).map(({ day, start, end }) => ({ day, start, end })));
    setSlotMinutes(doctor.slotMinutes || 20);
    setDirty(false);
    setErrors({});
  }, [doctor]);

  const save = useMutation({
    mutationFn: (body) => updateMyProfile(body),
    onSuccess: () => toast.success('Saved'),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['doc-profile'] }),
  });

  const saveTimings = () => {
    const found = validateSchedule(schedule, slotMinutes);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please fix the days marked in red.');
      return;
    }
    save.mutate({ schedule, slotMinutes });
  };

  const upcomingLeaves = (doctor?.leaveDates || []).filter((d) => d >= today).sort();

  const addLeave = () => {
    setLeaveError('');
    if (!leaveDay) return setLeaveError('Choose a day first.');
    if (leaveDay < today) return setLeaveError('Choose today or a day in the future.');
    if (upcomingLeaves.includes(leaveDay)) return setLeaveError('That day is already added.');
    if (upcomingLeaves.length >= MAX_LEAVES) return setLeaveError('You have added too many days.');
    save.mutate({ leaveDates: [...upcomingLeaves, leaveDay].sort() }, { onSuccess: () => setLeaveDay('') });
    return undefined;
  };

  const removeLeave = (day) => save.mutate({ leaveDates: upcomingLeaves.filter((d) => d !== day) });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My schedule</h1>
        <p className="text-muted">Patients can book only the days and times you set here.</p>
      </div>

      {/* Today */}
      <section className="card" aria-label="Today">
        <h2 className="text-xl font-bold">Today</h2>
        <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--c-brand))]"
            checked={!!doctor.unavailableToday}
            disabled={save.isPending}
            onChange={(e) => save.mutate({ unavailableToday: e.target.checked })}
          />
          <span className="font-semibold">I am not available today</span>
        </label>
        <p className={`mt-1 text-sm ${doctor.unavailableToday ? 'font-semibold text-warn' : 'text-muted'}`}>
          {doctor.unavailableToday
            ? 'Patients cannot book for today. This stays on until you turn it off yourself, even tomorrow.'
            : 'Turn this on if you cannot sit today. Remember to turn it off when you are back.'}
        </p>
      </section>

      {/* Weekly timings */}
      <section className="card space-y-4" aria-label="Weekly timings">
        <h2 className="text-xl font-bold">Weekly timings</h2>
        <SchedulePanel
          value={schedule}
          errors={errors}
          disabled={save.isPending}
          onChange={(v) => {
            setSchedule(v);
            setDirty(true);
          }}
        />

        <div className="max-w-xs">
          <Select
            label="Time for one visit"
            value={slotMinutes}
            onChange={(e) => {
              setSlotMinutes(Number(e.target.value));
              setDirty(true);
            }}
            hint="Patients see one slot every this many minutes. Appointments that are already booked keep their time."
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </div>

        {schedule.length === 0 && (
          <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">No day is selected. Patients cannot book you until you choose at least one day.</p>
        )}

        <Button loading={save.isPending && dirty} disabled={!dirty} onClick={saveTimings}>
          Save timings
        </Button>
      </section>

      {/* Days off */}
      <section className="card space-y-3" aria-label="Days off">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <CalendarOff size={22} className="text-brand" aria-hidden="true" /> Days off
        </h2>
        <p className="text-sm text-muted">
          Patients cannot book on these days. Appointments that are already approved are <b>not</b> cancelled by this, so please tell those
          patients yourself.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="leave-day" className="label">
              Choose a day
            </label>
            <input
              id="leave-day"
              type="date"
              min={today}
              className="input w-48"
              value={leaveDay}
              onChange={(e) => {
                setLeaveDay(e.target.value);
                setLeaveError('');
              }}
            />
          </div>
          <Button icon={Plus} onClick={addLeave} loading={save.isPending && !!leaveDay}>
            Add day off
          </Button>
        </div>
        {leaveError && (
          <p role="alert" className="field-error">
            {leaveError}
          </p>
        )}

        {upcomingLeaves.length === 0 ? (
          <p className="text-muted">No days off are added.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {upcomingLeaves.map((d) => (
              <li key={d} className="inline-flex items-center gap-1 rounded-full bg-soft py-1 pl-3 pr-1 text-sm font-semibold">
                {relativeDay(d)}
                {relativeDay(d) !== formatDate(d) && <span className="font-normal text-muted"> ({formatDate(d)})</span>}
                <button
                  type="button"
                  onClick={() => removeLeave(d)}
                  aria-label={`Remove ${formatDate(d)}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-bad hover:bg-bad-soft"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}