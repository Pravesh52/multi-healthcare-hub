import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, CircleX, Stethoscope } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';
import QrScanner from '@/components/clinic/QrScanner.jsx';
import LiveQueuePanel from '@/components/doctor/LiveQueuePanel.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getMyDoctors } from '@/services/clinic.service.js';
import { checkInByCode } from '@/services/queue.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDate, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

export default function ClinicQueue() {
  const [params, setParams] = useSearchParams();
  const [scan, setScan] = useState(null);
  const busy = useRef(false);

  useEffect(() => {
    document.title = `Live queue - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['clinic-doctors'], queryFn: getMyDoctors });
  const doctors = (q.data?.doctors ?? []).filter((d) => d.status === 'verified');
  const selected = doctors.find((d) => d._id === params.get('doctor')) || doctors[0];

  const pick = (id) => setParams({ doctor: id }, { replace: true });

  const onScan = async (code) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const d = await checkInByCode(code);
      const doctorId = d.appointment?.doctor;
      const doctor = doctors.find((x) => String(x._id) === String(doctorId));
      setScan({ ok: true, message: d.message, token: d.appointment?.tokenNo, doctorName: doctor?.user?.name });
      try {
        navigator.vibrate?.(120);
      } catch {
        /* not supported */
      }
      // The patient belongs to another doctor of the clinic: show that doctor's queue
      if (doctorId && selected && String(doctorId) !== String(selected._id) && doctor) pick(doctor._id);
    } catch (err) {
      setScan({ ok: false, message: getErrorMessage(err) });
    } finally {
      busy.current = false;
    }
  };

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
          message="Add a verified doctor to run a queue."
          action={<Button to="/clinic/doctors">Add a doctor</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Live queue</h1>
        <p className="text-muted">Today, {formatDate(todayIST())}. Check patients in, and call the next one when the doctor is free.</p>
      </div>

      {doctors.length > 1 && (
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Choose a doctor">
          {doctors.map((d) => (
            <button
              key={d._id}
              type="button"
              aria-pressed={selected._id === d._id}
              onClick={() => pick(d._id)}
              className={clsx(
                'min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
                selected._id === d._id ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
              )}
            >
              {d.user?.name}
            </button>
          ))}
        </div>
      )}
      {doctors.length === 1 && (
        <p className="font-semibold">
          {selected.user?.name} <span className="font-normal text-muted">· {selected.speciality}</span>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <section className="card lg:sticky lg:top-24" aria-label="Check in a patient">
          <h2 className="text-xl font-bold">Check in a patient</h2>
          <div className="mt-3">
            <QrScanner onScan={onScan} />
          </div>

          {scan && (
            <div
              role="status"
              className={clsx('mt-3 flex items-start gap-3 rounded-xl p-3', scan.ok ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')}
            >
              {scan.ok ? <CircleCheck size={22} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleX size={22} className="mt-0.5 shrink-0" aria-hidden="true" />}
              <div className="min-w-0 text-sm">
                <p className="font-bold">{scan.ok ? scan.message : 'Could not check in'}</p>
                {scan.ok && scan.doctorName && <p>For {scan.doctorName}</p>}
                {!scan.ok && <p>{scan.message}</p>}
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Patient forgot the receipt? Use the Check in button next to their name in the &quot;Not arrived yet&quot; list.
          </p>
        </section>

        <LiveQueuePanel key={selected._id} doctorId={selected._id} isDoctor={false} />
      </div>
    </div>
  );
}