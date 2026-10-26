import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { Input, Select } from '@/components/common/FormField.jsx';
import { getAuditLogs } from '@/services/admin.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDateTime } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const ACTIONS = {
  DOCTOR_VERIFIED: 'Doctor verified',
  DOCTOR_REJECTED: 'Doctor rejected',
  DOCTOR_SUSPENDED: 'Doctor suspended',
  DOCTOR_REINSTATED: 'Doctor reinstated',
  CLINIC_VERIFIED: 'Clinic verified',
  CLINIC_REJECTED: 'Clinic rejected',
  CLINIC_SUSPENDED: 'Clinic suspended',
  CLINIC_REINSTATED: 'Clinic reinstated',
  VIEW_DOCTOR_CERTIFICATE: 'Opened a doctor certificate',
  VIEW_CLINIC_LICENCE: 'Opened a clinic licence',
  USER_DISABLED: 'Patient disabled',
  USER_ENABLED: 'Patient enabled',
  REVIEW_HIDDEN: 'Review hidden',
  REVIEW_UNHIDDEN: 'Review shown again',
  ADMIN_PASSWORD_CHANGED: 'Admin password changed',
  VIEW_APPOINTMENT: 'Opened an appointment',
  VIEW_PRESCRIPTION: 'Opened a prescription',
  VIEW_RECEIPT: 'Opened a receipt',
};

const TONE = (action) => (/REJECTED|SUSPENDED|DISABLED|HIDDEN(?!_)/.test(action) && !/UN/.test(action) ? 'bad' : action.startsWith('VIEW_') ? 'info' : 'ok');

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = `Audit log - Admin - ${APP_NAME}`;
  }, []);
  useEffect(() => setPage(1), [action, from, to]);

  const rangeError = from && to && from > to ? '"From" must not be after "To"' : '';

  const q = useQuery({
    queryKey: ['audit-logs', action, from, to, page],
    queryFn: () => getAuditLogs({ action: action || undefined, from: from || undefined, to: to || undefined, page, limit: 30 }),
    placeholderData: keepPreviousData,
    enabled: !rangeError,
  });
  const logs = q.data?.logs ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Audit log</h1>
        <p className="text-muted">A record of who did what. It cannot be edited.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="What happened" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Everything</option>
          {Object.entries(ACTIONS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} error={rangeError} />
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon={ScrollText} title="No records found" message="Try a different filter or date." />
        </div>
      ) : (
        <ul className={clsx('space-y-2', q.isFetching && 'opacity-70')}>
          {logs.map((l) => (
            <li key={l._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Badge tone={TONE(l.action)}>{ACTIONS[l.action] || l.action}</Badge>
                <p className="text-sm text-muted">{formatDateTime(l.createdAt)}</p>
              </div>
              <p className="mt-2">
                <b>{l.actor?.name || 'Unknown'}</b> {l.role && <span className="text-sm text-muted">({l.role})</span>}
                {l.subject?.name && (
                  <>
                    {' '}
                    on <b>{l.subject.name}</b> {l.subject.role && <span className="text-sm text-muted">({l.subject.role})</span>}
                  </>
                )}
              </p>
              {l.meta?.reason && <p className="mt-1 text-sm text-muted">Reason: {l.meta.reason}</p>}
              {typeof l.meta?.cancelledAppointments === 'number' && l.meta.cancelledAppointments > 0 && (
                <p className="mt-1 text-sm text-muted">Appointments cancelled: {l.meta.cancelledAppointments}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={q.data?.page ?? page}
        pages={q.data?.pages ?? 1}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}