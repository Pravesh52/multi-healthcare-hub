import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { downloadPrescriptionPdf, getPrescription } from '@/services/prescription.service.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';
import { formatDate } from '@/utils/formatDate.js';

export default function PrescriptionView({ prescription: p }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await downloadPrescriptionPdf(p.appointment.id, p.appointment.date);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const patientLine = [p.patient?.name, p.patient?.age ? `${p.patient.age} years` : null, p.patient?.gender]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="bg-brand px-4 py-3 text-on-solid">
          <p className="text-lg font-bold">{p.clinic?.name}</p>
          <p className="text-sm opacity-90">{p.clinic?.address}</p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-lg font-bold">{p.doctor?.name}</p>
            <p className="text-sm text-muted">
              {[p.doctor?.qualification, p.doctor?.speciality].filter(Boolean).join(' | ')}
              {p.doctor?.medRegNo ? ` | Reg. No: ${p.doctor.medRegNo}` : ''}
            </p>
          </div>

          <div className="rounded-lg bg-page p-3 text-sm">
            <p>
              <span className="text-muted">Patient: </span>
              <b>{patientLine}</b>
            </p>
            <p>
              <span className="text-muted">Date: </span>
              <b>{formatDate(p.appointment?.date)}</b>
              {p.appointment?.tokenNo != null && <span className="text-muted"> | Token {p.appointment.tokenNo}</span>}
            </p>
          </div>

          {p.diagnosis && (
            <section>
              <h3 className="font-bold">Diagnosis</h3>
              <p className="mt-0.5 break-words">{p.diagnosis}</p>
            </section>
          )}

          {p.medicines?.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-brand">Rx</h3>
              <ol className="mt-1 space-y-2">
                {p.medicines.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="rounded-lg border border-line p-3">
                    <p className="font-bold">
                      {i + 1}. {m.name}
                    </p>
                    {(m.dosage || m.duration) && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {m.dosage && <Badge tone="info">Dose: {m.dosage}</Badge>}
                        {m.duration && <Badge tone="info">For: {m.duration}</Badge>}
                      </div>
                    )}
                    {m.notes && <p className="mt-1 text-sm text-muted">{m.notes}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {p.advice && (
            <section>
              <h3 className="font-bold">Advice</h3>
              <p className="mt-0.5 whitespace-pre-line break-words">{p.advice}</p>
            </section>
          )}

          {p.followUpDate && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm font-semibold text-warn">
              Follow-up visit on {formatDate(p.followUpDate)}
            </p>
          )}

          <p className="text-xs text-muted">Take medicines only as advised by your doctor.</p>
        </div>
      </div>

      <Button className="mt-3" icon={Download} loading={busy} onClick={download}>
        Download PDF
      </Button>
    </div>
  );
}

export function PrescriptionModal({ open, appointmentId, onClose }) {
  const q = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => getPrescription(appointmentId),
    enabled: open && !!appointmentId,
    retry: (count, err) => getStatus(err) !== 404 && count < 1,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Prescription"
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {q.isLoading ? (
        <Loader label="Loading the prescription..." />
      ) : q.isError ? (
        getStatus(q.error) === 404 ? (
          <EmptyState
            icon={FileText}
            title="No prescription yet"
            message="Your doctor has not added a prescription for this visit."
          />
        ) : (
          <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
        )
      ) : q.data?.prescription ? (
        <PrescriptionView prescription={q.data.prescription} />
      ) : null}
    </Modal>
  );
}