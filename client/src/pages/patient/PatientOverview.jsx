import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarCheck, CircleCheck, Clock, FileText, Search, Star } from 'lucide-react';
import LiveStatusCard from '@/components/patient/LiveStatusCard.jsx';
import ReceiptModal from '@/components/patient/ReceiptModal.jsx';
import ReviewForm from '@/components/patient/ReviewForm.jsx';
import StatCard from '@/components/common/StatCard.jsx';
import Button from '@/components/common/Button.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import useAuth from '@/hooks/useAuth.js';
import useSocket from '@/hooks/useSocket.js';
import useLiveRefresh from '@/hooks/useLiveRefresh.js';
import { usePatientQueue } from '@/hooks/useLiveQueue.js';
import { listMyAppointments } from '@/services/appointment.service.js';
import { listMyPrescriptions } from '@/services/prescription.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { isReviewed } from '@/utils/appointment.js';
import { formatDate, formatTime, relativeDay, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

export default function PatientOverview() {
  const { user } = useAuth();
  const { unreadCount } = useSocket();
  const today = todayIST();
  const queue = usePatientQueue();

  const [receiptId, setReceiptId] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [, bump] = useState(0);

  useEffect(() => {
    document.title = `My dashboard - ${APP_NAME}`;
  }, []);
  useLiveRefresh(['my-appts', 'my-rx']);

  const approved = useQuery({
    queryKey: ['my-appts', 'overview', 'approved'],
    queryFn: () => listMyAppointments({ status: 'approved', limit: 50 }),
  });
  const pending = useQuery({
    queryKey: ['my-appts', 'overview', 'pending'],
    queryFn: () => listMyAppointments({ status: 'pending', limit: 1 }),
  });
  const completed = useQuery({
    queryKey: ['my-appts', 'overview', 'completed'],
    queryFn: () => listMyAppointments({ status: 'completed', limit: 3 }),
  });
  const prescriptions = useQuery({
    queryKey: ['my-rx', 'overview'],
    queryFn: () => listMyPrescriptions({ limit: 10 }),
  });

  const approvedList = approved.data?.appointments ?? [];
  const upcomingCount = approvedList.filter((a) => a.date >= today).length;
  const future = approvedList
    .filter((a) => a.date > today)
    .sort((a, b) => `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`))
    .slice(0, 4);

  const toRate = (completed.data?.appointments ?? []).find((a) => !isReviewed(a._id));
  const followUp = (prescriptions.data?.prescriptions ?? [])
    .filter((r) => r.followUpDate && r.followUpDate >= today)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))[0];

  const firstName = user?.name?.trim()?.split(' ')[0] || 'there';
  const todayItems = [...queue.items].sort((a, b) => (a.slot || '').localeCompare(b.slot || ''));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Hello, {firstName}</h1>
        <p className="text-muted">Here is a quick look at your appointments.</p>
      </header>

      {todayItems.length > 0 && (
        <section aria-label="Today" className="space-y-3">
          <h2 className="text-xl font-bold">Today</h2>
          {todayItems.map((item) => (
            <LiveStatusCard key={item.appointmentId} item={item} onReceipt={setReceiptId} />
          ))}
        </section>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label="Upcoming"
          value={upcomingCount}
          to="/patient/appointments?status=approved"
          loading={approved.isLoading}
          tone="ok"
        />
        <StatCard
          icon={Clock}
          label="Waiting for approval"
          value={pending.data?.total ?? 0}
          to="/patient/appointments?status=pending"
          loading={pending.isLoading}
          tone="warn"
        />
        <StatCard
          icon={CircleCheck}
          label="Visits completed"
          value={completed.data?.total ?? 0}
          to="/patient/appointments?status=completed"
          loading={completed.isLoading}
        />
        <StatCard icon={Bell} label="Unread notifications" value={unreadCount} to="/patient/notifications" tone={unreadCount ? 'bad' : 'brand'} />
      </section>

      {followUp && (
        <section className="card border-warn bg-warn-soft" aria-label="Follow-up">
          <p className="font-bold text-warn">Follow-up visit</p>
          <p className="mt-1">
            {followUp.doctorName} asked you to come again on <b>{formatDate(followUp.followUpDate)}</b>.
          </p>
          <Button className="mt-3" size="sm" to={`/search?q=${encodeURIComponent(followUp.doctorName)}`}>
            Book a slot
          </Button>
        </section>
      )}

      {toRate && (
        <section className="card" aria-label="Rate your visit">
          <p className="font-bold">How was your visit?</p>
          <p className="mt-1 text-muted">
            You visited {toRate.doctor?.user?.name} on {formatDate(toRate.date)}. Your feedback helps other patients.
          </p>
          <Button className="mt-3" size="sm" icon={Star} onClick={() => setReviewTarget(toRate)}>
            Rate your visit
          </Button>
        </section>
      )}

      <section aria-label="Upcoming appointments">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Upcoming appointments</h2>
          <Link to="/patient/appointments" className="text-sm font-semibold text-brand hover:underline">
            See all
          </Link>
        </div>

        {approved.isError ? (
          <div className="card">
            <ErrorState message={getErrorMessage(approved.error)} onRetry={() => approved.refetch()} />
          </div>
        ) : future.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted">You have no upcoming appointments.</p>
            <Button className="mt-3" to="/search">
              Find a doctor
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {future.map((a) => (
              <li key={a._id}>
                <Link
                  to="/patient/appointments?status=approved"
                  className="card flex flex-wrap items-center justify-between gap-2 transition-shadow hover:shadow-card"
                >
                  <div className="min-w-0">
                    <p className="font-bold">{a.doctor?.user?.name}</p>
                    <p className="truncate text-sm text-muted">{a.clinic?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{relativeDay(a.date)}</p>
                    <p className="text-sm text-muted">
                      {formatTime(a.slot)}
                      {a.tokenNo != null ? ` · Token #${a.tokenNo}` : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Quick links" className="grid gap-3 sm:grid-cols-3">
        <Link to="/search" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <Search size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">Find a doctor</span>
        </Link>
        <Link to="/patient/appointments" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <CalendarCheck size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">My appointments</span>
        </Link>
        <Link to="/patient/prescriptions" className="card flex items-center gap-3 transition-shadow hover:shadow-card">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-brand">
            <FileText size={22} aria-hidden="true" />
          </span>
          <span className="font-semibold">My prescriptions</span>
        </Link>
      </section>

      <ReceiptModal open={!!receiptId} appointmentId={receiptId} onClose={() => setReceiptId(null)} />
      <ReviewForm
        open={!!reviewTarget}
        appointment={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={() => {
          setReviewTarget(null);
          bump((n) => n + 1);
        }}
      />
    </div>
  );
}