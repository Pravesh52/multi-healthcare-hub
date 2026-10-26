import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Receipt, Stethoscope } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import WalkInForm from '@/components/clinic/WalkInForm.jsx';
import ReceiptModal from '@/components/patient/ReceiptModal.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getMyDoctors } from '@/services/clinic.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';

export default function WalkIn() {
  const [params] = useSearchParams();
  const [result, setResult] = useState(null);
  const [receiptId, setReceiptId] = useState(null);

  useEffect(() => {
    document.title = `Walk-in token - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['clinic-doctors'], queryFn: getMyDoctors });
  const doctors = (q.data?.doctors ?? []).filter((d) => d.status === 'verified');

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  if (doctors.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Stethoscope}
          title="No active doctor yet"
          message="Add a verified doctor before you can issue tokens."
          action={<Button to="/clinic/doctors">Add a doctor</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Walk-in token</h1>
        <p className="text-muted">For a patient who came to the clinic without an appointment. They join the queue at once.</p>
      </div>

      {result && (
        <section className="card border-2 border-ok bg-ok-soft" aria-label="Token issued" role="status">
          <p className="flex items-center gap-2 font-bold text-ok">
            <CircleCheck size={22} aria-hidden="true" /> Token issued
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="shrink-0 rounded-2xl bg-[#F2B632] px-6 py-3 text-center text-[#12303A]">
              <p className="text-xs font-bold">TOKEN</p>
              <p className="text-5xl font-bold leading-none tabular-nums">{result.appointment.tokenNo}</p>
            </div>
            <div className="min-w-0">
              <p className="break-words text-xl font-bold">{result.name}</p>
              <p className="text-sm">+91 {result.phone}</p>
              <p className="text-sm text-muted">For {result.doctor?.user?.name}</p>
              {result.appointment.priority === 'emergency' && <p className="mt-1 text-sm font-bold text-bad">Emergency: first in the queue</p>}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            Tell the patient the token number. They can also log in with this mobile number (OTP) to see how many people are ahead of them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={Receipt} onClick={() => setReceiptId(result.appointment._id)}>
              Show receipt
            </Button>
            <Button size="sm" variant="outline" to={`/clinic/queue?doctor=${result.appointment.doctor}`}>
              Open this doctor&apos;s queue
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
              Add another patient
            </Button>
          </div>
        </section>
      )}

      <section className="card" aria-label="Walk-in form">
        <WalkInForm
          doctors={doctors}
          defaultDoctorId={params.get('doctor') || ''}
          onCreated={(r) => {
            setResult(r);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </section>

      <ReceiptModal open={!!receiptId} appointmentId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}