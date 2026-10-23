import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AppointmentRow from '@/components/patient/AppointmentRow.jsx';
import ReceiptModal from '@/components/patient/ReceiptModal.jsx';
import { PrescriptionModal } from '@/components/patient/PrescriptionView.jsx';
import ReviewForm from '@/components/patient/ReviewForm.jsx';
import RescheduleModal from '@/components/patient/RescheduleModal.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import Button from '@/components/common/Button.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useLiveRefresh from '@/hooks/useLiveRefresh.js';
import { cancelAppointment, listMyAppointments } from '@/services/appointment.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { isReviewed } from '@/utils/appointment.js';
import { formatTime, relativeDay } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired', label: 'Expired' },
  { key: 'no_show', label: 'No-show' },
];

export default function MyAppointments() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const asked = params.get('status') || '';
  const status = FILTERS.some((f) => f.key === asked) ? asked : '';

  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [rxId, setRxId] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [, bump] = useState(0);

  useEffect(() => {
    document.title = `My appointments - ${APP_NAME}`;
  }, []);
  useEffect(() => setPage(1), [status]);
  useLiveRefresh(['my-appts']);

  const q = useQuery({
    queryKey: ['my-appts', 'list', status, page],
    queryFn: () => listMyAppointments({ status: status || undefined, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  const appointments = q.data?.appointments ?? [];

  const cancel = useMutation({
    mutationFn: (id) => cancelAppointment(id),
    onSuccess: (d) => toast.success(d.message || 'Appointment cancelled'),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['my-appts'] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My appointments</h1>
          <p className="text-muted">Your requests, receipts and past visits.</p>
        </div>
        <Button to="/search">Book a new appointment</Button>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            aria-pressed={status === f.key}
            onClick={() => setParams(f.key ? { status: f.key } : {}, { replace: true })}
            className={clsx(
              'min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
              status === f.key ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : appointments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarX}
            title={status ? 'No appointments with this status' : 'No appointments yet'}
            message={
              status
                ? 'Try another filter.'
                : 'Find a doctor near you and send a request. It will appear here.'
            }
            action={
              status ? (
                <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                  Show all
                </Button>
              ) : (
                <Button to="/search">Find a doctor</Button>
              )
            }
          />
        </div>
      ) : (
        <div className={clsx('space-y-3', q.isFetching && 'opacity-70')}>
          {appointments.map((a) => (
            <AppointmentRow
              key={a._id}
              appt={a}
              reviewed={isReviewed(a._id)}
              onCancel={setCancelTarget}
              onReschedule={setRescheduleTarget}
              onReceipt={(x) => setReceiptId(x._id)}
              onPrescription={(x) => setRxId(x._id)}
              onReview={setReviewTarget}
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
        open={!!cancelTarget}
        title="Cancel this appointment?"
        tone="danger"
        confirmLabel="Yes, cancel it"
        cancelLabel="Keep it"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(cancelTarget._id)}
        onCancel={() => setCancelTarget(null)}
        message={
          cancelTarget
            ? `${cancelTarget.doctor?.user?.name || 'The doctor'} on ${relativeDay(cancelTarget.date)}, ${formatTime(cancelTarget.slot)}. This cannot be undone.${
                cancelTarget.payment?.status === 'paid' ? ' You paid online, so the amount will be refunded.' : ''
              }`
            : ''
        }
      />

      <RescheduleModal
        open={!!rescheduleTarget}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onDone={() => setRescheduleTarget(null)}
      />
      <ReceiptModal open={!!receiptId} appointmentId={receiptId} onClose={() => setReceiptId(null)} />
      <PrescriptionModal open={!!rxId} appointmentId={rxId} onClose={() => setRxId(null)} />
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