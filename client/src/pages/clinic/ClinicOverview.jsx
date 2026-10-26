import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { CalendarCheck, CircleCheck, ClipboardList, Hourglass, QrCode, TriangleAlert, UserPlus } from 'lucide-react';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';
import StatCard from '@/components/common/StatCard.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getMyClinic, getMyDoctors } from '@/services/clinic.service.js';
import { getClinicAnalytics } from '@/services/analytics.service.js';
import { getLiveQueue } from '@/services/queue.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDate, formatTime, todayIST } from '@/utils/formatDate.js';
import { isOpenNow } from '@/utils/isOpenNow.js';
import { APP_NAME } from '@/utils/constants.js';

export default function ClinicOverview() {
  const today = todayIST();

  useEffect(() => {
    document.title = `Clinic dashboard - ${APP_NAME}`;
  }, []);

  const clinicQ = useQuery({ queryKey: ['clinic-me'], queryFn: getMyClinic });
  const doctorsQ = useQuery({ queryKey: ['clinic-doctors'], queryFn: getMyDoctors });
  const todayQ = useQuery({
    queryKey: ['clinic-analytics', 'today', today],
    queryFn: () => getClinicAnalytics({ from: today, to: today }),
    refetchInterval: 30000,
  });

  const clinic = clinicQ.data?.clinic;
  const doctors = doctorsQ.data?.doctors ?? [];
  const verified = doctors.filter((d) => d.status === 'verified');

  const queues = useQueries({
    queries: verified.map((d) => ({
      queryKey: ['clinic-doc-queue', d._id],
      queryFn: () => getLiveQueue(d._id),
      refetchInterval: 15000,
    })),
  });
  const queueOf = (id) => queues[verified.findIndex((d) => d._id === id)]?.data;
  const waitingTotal = queues.reduce((n, q) => n + (q.data?.waiting?.length || 0), 0);

  const status = clinic ? isOpenNow(clinic.timings) : null;
  const t = todayQ.data?.totals;
  const noSchedule = verified.filter((d) => !d.schedule?.length);
  const unavailable = verified.filter((d) => d.unavailableToday);

  if (clinicQ.isError) return <ErrorState message={getErrorMessage(clinicQ.error)} onRetry={() => clinicQ.refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{clinic?.name || 'Your clinic'}</h1>
          {status && <Badge tone={status.open ? 'ok' : 'bad'}>{status.label}</Badge>}
        </div>
        <p className="text-muted">
          Today, {formatDate(today)}
          {clinic ? ` · ${formatTime(clinic.timings?.open)} to ${formatTime(clinic.timings?.close)}` : ''}
        </p>
      </header>

      {/* Things to fix */}
      <div className="space-y-2" aria-label="Things to fix">
        {!doctorsQ.isLoading && doctors.length === 0 && (
          <div role="alert" className="card flex flex-wrap items-center justify-between gap-2 border-warn bg-warn-soft">
            <p className="flex items-start gap-2 font-semibold text-warn">
              <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
              No doctor is added yet. Patients cannot book until you add a doctor.
            </p>
            <Button size="sm" to="/clinic/doctors">
              Add a doctor
            </Button>
          </div>
        )}
        {noSchedule.length > 0 && (
          <p role="alert" className="card border-warn bg-warn-soft text-sm font-semibold text-warn">
            {noSchedule.map((d) => d.user?.name).join(', ')} {noSchedule.length === 1 ? 'has' : 'have'} not set weekly timings, so patients cannot book{' '}
            {noSchedule.length === 1 ? 'them' : 'them'} yet. The doctor can set timings in their own dashboard.
          </p>
        )}
        {unavailable.length > 0 && (
          <p role="status" className="card text-sm font-semibold">
            Not available today: {unavailable.map((d) => d.user?.name).join(', ')}
          </p>
        )}
      </div>

      <section aria-label="Today" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Appointments today" value={t?.appointments} loading={todayQ.isLoading} />
        <StatCard icon={CircleCheck} label="Visits completed" value={t?.completed} loading={todayQ.isLoading} tone="ok" />
        <StatCard
          icon={Hourglass}
          label="Waiting now"
          value={waitingTotal}
          loading={doctorsQ.isLoading || queues.some((q) => q.isLoading)}
          tone="warn"
          to="/clinic/queue"
        />
        <StatCard
          icon={ClipboardList}
          label="Requests not answered"
          value={t?.pending}
          loading={todayQ.isLoading}
          tone={t?.pending ? 'bad' : 'brand'}
          hint="for today, waiting for the doctor"
        />
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
        <Link to="/clinic/queue" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <QrCode size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">Check in a patient</span>
        </Link>
        <Link to="/clinic/walk-in" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <UserPlus size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">Issue a walk-in token</span>
        </Link>
        <Link to="/clinic/doctors" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <UserPlus size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">Add or remove doctors</span>
        </Link>
      </section>

      <section aria-label="Doctors right now">
        <h2 className="mb-3 text-xl font-bold">Doctors right now</h2>
        {doctorsQ.isLoading ? (
          <Skeleton className="h-32" />
        ) : verified.length === 0 ? (
          <div className="card">
            <EmptyState title="No active doctor" message="Add a verified doctor to see their live queue here." action={<Button to="/clinic/doctors">Add a doctor</Button>} />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {verified.map((d) => {
              const q = queueOf(d._id);
              return (
                <article key={d._id} className="card">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={d.user?.name} gender={d.gender} photo={d.photo} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{d.user?.name}</p>
                      <p className="text-sm text-muted">{d.speciality}</p>
                    </div>
                    {d.unavailableToday && <Badge tone="bad">Not available today</Badge>}
                  </div>

                  {!q ? (
                    <Skeleton className="mt-3 h-12" />
                  ) : (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        {q.serving ? (
                          <>
                            <Badge tone="ok">Now serving</Badge> token #{q.serving.tokenNo}, {q.serving.patient?.name}
                          </>
                        ) : (
                          <span className="text-muted">No patient inside.</span>
                        )}
                      </p>
                      <p className="text-muted">
                        {q.waiting.length} waiting · {q.notArrived.length} not arrived · {q.completedCount} done
                      </p>
                      {q.paused && <p className="font-semibold text-warn">On a break</p>}
                    </div>
                  )}

                  <Button className="mt-3" size="sm" variant="outline" to={`/clinic/queue?doctor=${d._id}`}>
                    Open the queue
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}