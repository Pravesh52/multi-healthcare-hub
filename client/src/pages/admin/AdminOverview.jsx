import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarCheck, CalendarDays, EyeOff, Stethoscope, UserMinus, UserPlus, Users } from 'lucide-react';
import StatCard from '@/components/common/StatCard.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { getStats } from '@/services/admin.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';

export default function AdminOverview() {
  useEffect(() => {
    document.title = `Admin - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['admin-stats'], queryFn: getStats, refetchInterval: 30000 });
  const s = q.data?.stats;

  if (q.isError && !s) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  const waiting = [
    { label: 'Doctors waiting for verification', n: s?.doctorsPending, to: '/admin/doctors?status=pending' },
    { label: 'Clinics waiting for verification', n: s?.clinicsPending, to: '/admin/clinics?status=pending' },
  ];
  const anyWaiting = waiting.some((w) => w.n > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Admin overview</h1>
        <p className="text-muted">What needs your attention and how the platform is doing.</p>
      </header>

      <section aria-label="Needs your attention" className="grid gap-3 sm:grid-cols-2">
        {waiting.map((w) => (
          <Link
            key={w.label}
            to={w.to}
            className={`card flex items-center justify-between gap-3 transition-shadow hover:shadow-card ${w.n > 0 ? 'border-warn bg-warn-soft' : ''}`}
          >
            <span className="font-semibold">{w.label}</span>
            <span className={`text-3xl font-bold tabular-nums ${w.n > 0 ? 'text-warn' : 'text-ok'}`}>{q.isLoading ? '-' : w.n}</span>
          </Link>
        ))}
        {s && !anyWaiting && <p className="text-sm text-muted sm:col-span-2">All caught up. Nothing is waiting for verification.</p>}
      </section>

      <section aria-label="Numbers">
        <h2 className="mb-3 text-xl font-bold">Numbers</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Users} label="Patients" value={s?.patients} loading={q.isLoading} to="/admin/users" />
          <StatCard icon={UserPlus} label="New patients (7 days)" value={s?.newPatients7d} loading={q.isLoading} tone="ok" />
          <StatCard icon={Stethoscope} label="Verified doctors" value={s?.doctorsVerified} loading={q.isLoading} to="/admin/doctors?status=verified" tone="ok" />
          <StatCard icon={Building2} label="Verified clinics" value={s?.clinicsVerified} loading={q.isLoading} to="/admin/clinics?status=verified" tone="ok" />
          <StatCard icon={CalendarDays} label="Appointments today" value={s?.appointmentsToday} loading={q.isLoading} />
          <StatCard icon={CalendarCheck} label="All appointments" value={s?.appointments} loading={q.isLoading} />
          <StatCard icon={Stethoscope} label="Suspended doctors" value={s?.doctorsSuspended} loading={q.isLoading} to="/admin/doctors?status=suspended" tone={s?.doctorsSuspended ? 'bad' : 'brand'} />
          <StatCard icon={Building2} label="Suspended clinics" value={s?.clinicsSuspended} loading={q.isLoading} to="/admin/clinics?status=suspended" tone={s?.clinicsSuspended ? 'bad' : 'brand'} />
          <StatCard icon={UserMinus} label="Disabled patients" value={s?.disabledPatients} loading={q.isLoading} to="/admin/users?active=false" tone={s?.disabledPatients ? 'warn' : 'brand'} />
          <StatCard icon={EyeOff} label="Hidden reviews" value={s?.hiddenReviews} loading={q.isLoading} to="/admin/reviews" tone={s?.hiddenReviews ? 'warn' : 'brand'} />
        </div>
      </section>
    </div>
  );
}