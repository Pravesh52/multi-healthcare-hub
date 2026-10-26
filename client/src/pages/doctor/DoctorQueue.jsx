import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import LiveQueuePanel from '@/components/doctor/LiveQueuePanel.jsx';
import PrescriptionForm from '@/components/doctor/PrescriptionForm.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { listDoctorAppointments } from '@/services/appointment.service.js';
import { formatTime, formatDate, todayIST } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

export default function DoctorQueue() {
  const queryClient = useQueryClient();
  const today = todayIST();
  const [rxTarget, setRxTarget] = useState(null);

  useEffect(() => {
    document.title = `Live queue - ${APP_NAME}`;
  }, []);

  const doneQ = useQuery({
    queryKey: ['doc-reqs', 'completed-today', today],
    queryFn: () => listDoctorAppointments({ status: 'completed', date: today, limit: 100 }),
  });
  const done = doneQ.data?.appointments ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Live queue</h1>
        <p className="text-muted">Today, {formatDate(today)}. Press Done when a visit ends, then call the next patient.</p>
      </div>

      <LiveQueuePanel
        doctorId="me"
        isDoctor
        onPrescription={({ appointmentId }) => setRxTarget(appointmentId)}
        onAction={() => queryClient.invalidateQueries({ queryKey: ['doc-reqs', 'completed-today'] })}
      />

      <section aria-label="Completed today">
        <h2 className="mb-2 text-xl font-bold">
          Completed today <span className="text-base font-normal text-muted">({done.length})</span>
        </h2>
        {doneQ.isLoading ? (
          <Skeleton className="h-24" />
        ) : done.length === 0 ? (
          <div className="card text-center text-muted">Visits you finish today appear here.</div>
        ) : (
          <ul className="space-y-2">
            {done.map((a) => (
              <li key={a._id} className="card flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    {a.patient?.name}
                    {a.tokenNo != null && <span className="ml-2 text-sm font-normal text-muted">Token #{a.tokenNo}</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {a.isWalkIn ? 'Walk-in' : formatTime(a.slot)}
                    {a.consultationMinutes ? ` · ${a.consultationMinutes} min` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" icon={FileText} onClick={() => setRxTarget(a._id)}>
                  Prescription
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PrescriptionForm open={!!rxTarget} appointmentId={rxTarget} onClose={() => setRxTarget(null)} />
    </div>
  );
}