import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CircleCheck, ClipboardList, Hourglass, Timer, TriangleAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import StatCard from '@/components/common/StatCard.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import useAuth from '@/hooks/useAuth.js';
import useLiveRefresh from '@/hooks/useLiveRefresh.js';
import { useLiveQueue } from '@/hooks/useLiveQueue.js';
import { listDoctorAppointments } from '@/services/appointment.service.js';
import { getMyProfile, updateMyProfile } from '@/services/doctor.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatTime, relativeDay } from '@/utils/formatDate.js';
import { getIndiaNow } from '@/utils/isOpenNow.js';
import { APP_NAME, WEEKDAYS } from '@/utils/constants.js';

const greeting = () => {
  const h = Math.floor(getIndiaNow().minutes / 60);
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function DoctorOverview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { queue, loading: queueLoading } = useLiveQueue('me');

  useEffect(() => {
    document.title = `Doctor dashboard - ${APP_NAME}`;
  }, []);
  useLiveRefresh(['doc-reqs']);

  const profileQ = useQuery({ queryKey: ['doc-profile'], queryFn: getMyProfile });
  const pendingQ = useQuery({
    queryKey: ['doc-reqs', 'overview-pending'],
    queryFn: () => listDoctorAppointments({ status: 'pending', limit: 3 }),
  });

  const turnOff = useMutation({
    mutationFn: () => updateMyProfile({ unavailableToday: false }),
    onSuccess: () => {
      toast.success('You are available today again');
      queryClient.invalidateQueries({ queryKey: ['doc-profile'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const doctor = profileQ.data?.doctor;
  const today = WEEKDAYS[getIndiaNow().day];
  const todayBlocks = (doctor?.schedule || []).filter((s) => s.day === getIndiaNow().day).sort((a, b) => a.start.localeCompare(b.start));
  const pending = pendingQ.data?.appointments ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {greeting()}, {user?.name}
        </h1>
        <p className="text-muted">
          {doctor
            ? todayBlocks.length
              ? `Today (${today}) you sit: ${todayBlocks.map((b) => `${formatTime(b.start)} to ${formatTime(b.end)}`).join(', ')}`
              : `You have no timings set for ${today}.`
            : 'Loading your details...'}
        </p>
      </header>

      {profileQ.isError && <ErrorState message={getErrorMessage(profileQ.error)} onRetry={() => profileQ.refetch()} />}

      {doctor && (
        <div className="space-y-2" aria-label="Things to fix">
          {doctor.unavailableToday && (
            <div role="alert" className="card flex flex-wrap items-center justify-between gap-2 border-warn bg-warn-soft">
              <p className="flex items-start gap-2 font-semibold text-warn">
                <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                You are marked unavailable. Patients cannot book for today.
              </p>
              <Button size="sm" loading={turnOff.isPending} onClick={() => turnOff.mutate()}>
                I am available now
              </Button>
            </div>
          )}
          {!doctor.schedule?.length && (
            <div role="alert" className="card flex flex-wrap items-center justify-between gap-2 border-warn bg-warn-soft">
              <p className="flex items-start gap-2 font-semibold text-warn">
                <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                Your weekly timings are not set. Patients cannot book you until you set them.
              </p>
              <Button size="sm" to="/doctor/schedule">
                Set my timings
              </Button>
            </div>
          )}
          {!doctor.clinic && (
            <div role="alert" className="card border-warn bg-warn-soft">
              <p className="flex items-start gap-2 font-semibold text-warn">
                <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                You are not added to any clinic yet, so patients cannot see you.
              </p>
              <p className="mt-1 text-sm">Ask the owner of your clinic to add you using your email: <b className="break-all">{user?.email}</b></p>
            </div>
          )}
        </div>
      )}

      <section aria-label="Today" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Patients today" value={queue?.totalToday} loading={queueLoading} />
        <StatCard icon={Hourglass} label="Waiting now" value={queue?.waiting.length} loading={queueLoading} tone="warn" to="/doctor/queue" />
        <StatCard icon={CircleCheck} label="Completed today" value={queue?.completedCount} loading={queueLoading} tone="ok" />
        <StatCard icon={ClipboardList} label="Requests to answer" value={pendingQ.data?.total} loading={pendingQ.isLoading} tone={pendingQ.data?.total ? 'bad' : 'brand'} to="/doctor/requests" />
        <StatCard icon={Timer} label="Average visit" value={queue ? `${queue.avgMinutes} min` : undefined} loading={queueLoading} />
      </section>

      <section aria-label="Now serving" className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Live queue</h2>
          <Button size="sm" to="/doctor/queue">
            Open the queue
          </Button>
        </div>
        {queue?.serving ? (
          <p className="mt-2">
            <Badge tone="ok">Now serving</Badge> <b>Token #{queue.serving.tokenNo}</b>, {queue.serving.patient?.name}
          </p>
        ) : (
          <p className="mt-2 text-muted">No patient is inside right now.</p>
        )}
        {queue?.waiting[0] && (
          <p className="mt-1 text-sm text-muted">
            Next in line: token #{queue.waiting[0].tokenNo}, {queue.waiting[0].patient?.name}
          </p>
        )}
        {queue?.paused && <p className="mt-2 text-sm font-semibold text-warn">The queue is on a break.</p>}
      </section>

      <section aria-label="Requests">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Requests waiting for you</h2>
          <Link to="/doctor/requests" className="text-sm font-semibold text-brand hover:underline">
            See all
          </Link>
        </div>
        {pending.length === 0 ? (
          <div className="card text-center text-muted">No new requests. You are all caught up.</div>
        ) : (
          <ul className="space-y-2">
            {pending.map((a) => (
              <li key={a._id}>
                <Link to="/doctor/requests" className="card flex flex-wrap items-center justify-between gap-2 transition-shadow hover:shadow-card">
                  <div className="min-w-0">
                    <p className="font-bold">{a.patient?.name}</p>
                    <p className="truncate text-sm text-muted">{a.reason || 'No reason written'}</p>
                  </div>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CalendarClock size={16} className="text-brand" aria-hidden="true" />
                    {relativeDay(a.date)}, {formatTime(a.slot)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}