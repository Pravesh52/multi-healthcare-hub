import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import RequestRow from '@/components/doctor/RequestRow.jsx';
import PrescriptionForm from '@/components/doctor/PrescriptionForm.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import Button from '@/components/common/Button.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useLiveRefresh from '@/hooks/useLiveRefresh.js';
import { approveAppointment, listDoctorAppointments, rejectAppointment } from '@/services/appointment.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatTime, relativeDay } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'expired', label: 'Expired' },
  { key: 'no_show', label: 'No-show' },
  { key: '', label: 'All' },
];

export default function Requests() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const asked = params.get('status');
  const status = asked === '' ? '' : FILTERS.some((f) => f.key === asked) ? asked : 'pending';
  const date = params.get('date') || '';

  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rxTarget, setRxTarget] = useState(null);

  useEffect(() => {
    document.title = `Requests - ${APP_NAME}`;
  }, []);
  useEffect(() => setPage(1), [status, date]);
  useLiveRefresh(['doc-reqs']);

  const patch = (changes) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => (v == null || (v === '' && k === 'date') ? next.delete(k) : next.set(k, v)));
        return next;
      },
      { replace: true }
    );

  const q = useQuery({
    queryKey: ['doc-reqs', 'list', status, date, page],
    queryFn: () => listDoctorAppointments({ status: status || undefined, date: date || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const list = q.data?.appointments ?? [];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['doc-reqs'] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });
  };

  const approve = useMutation({
    mutationFn: (a) => approveAppointment(a._id),
    onSuccess: (d) => toast.success(d.message || 'Approved'),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: refreshAll,
  });
  const reject = useMutation({
    mutationFn: ({ appt, reason }) => rejectAppointment(appt._id, reason),
    onSuccess: () => toast.success('Request rejected. The patient has been told.'),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setRejectTarget(null);
      refreshAll();
    },
  });

  const busyId = approve.isPending ? approve.variables?._id : reject.isPending ? reject.variables?.appt._id : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Appointment requests</h1>
        <p className="text-muted">
          Approve a request to give the patient a token and a receipt. If you do not reply within 24 hours, the request expires.
        </p>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            aria-pressed={status === f.key}
            onClick={() => patch({ status: f.key })}
            className={clsx(
              'min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
              status === f.key ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="req-date" className="label">
            Only this day
          </label>
          <input id="req-date" type="date" className="input w-48" value={date} onChange={(e) => patch({ date: e.target.value })} />
        </div>
        {date && (
          <Button size="sm" variant="ghost" icon={X} onClick={() => patch({ date: '' })}>
            Clear day
          </Button>
        )}
        {q.data && (
          <p className="pb-3 text-sm text-muted">
            {q.data.total} {q.data.total === 1 ? 'request' : 'requests'}
          </p>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title={status === 'pending' ? 'No requests waiting' : 'Nothing here'}
            message={status === 'pending' ? 'New requests from patients appear here at once.' : 'Try another filter or day.'}
          />
        </div>
      ) : (
        <div className={clsx('grid gap-3 xl:grid-cols-2', q.isFetching && 'opacity-70')}>
          {list.map((a) => (
            <RequestRow
              key={a._id}
              appt={a}
              busy={busyId === a._id}
              onApprove={(x) => approve.mutate(x)}
              onReject={setRejectTarget}
              onPrescription={(x) => setRxTarget(x._id)}
            />
          ))}
        </div>
      )}

      <Pagination
        page={q.data?.page ?? page}
        pages={q.data?.pages ?? 1}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this request?"
        message={
          rejectTarget
            ? `${rejectTarget.patient?.name}, ${relativeDay(rejectTarget.date)}, ${formatTime(rejectTarget.slot)}. The patient will see your reason and can book another time.`
            : ''
        }
        confirmLabel="Reject"
        tone="danger"
        askReason
        reasonLabel="Reason for the patient"
        loading={reject.isPending}
        onConfirm={(reason) => reject.mutate({ appt: rejectTarget, reason })}
        onCancel={() => setRejectTarget(null)}
      />

      <PrescriptionForm open={!!rxTarget} appointmentId={rxTarget} onClose={() => setRxTarget(null)} />
    </div>
  );
}