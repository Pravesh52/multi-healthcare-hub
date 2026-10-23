import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal.jsx';
import Button from '@/components/common/Button.jsx';
import Badge from '@/components/common/Badge.jsx';
import Loader from '@/components/common/Loader.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { downloadReceiptPdf, getReceipt } from '@/services/receipt.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDate, formatTime } from '@/utils/formatDate.js';

function Row({ label, children }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-semibold">{children}</dd>
    </div>
  );
}

export default function ReceiptModal({ open, appointmentId, onClose }) {
  const [downloading, setDownloading] = useState(false);

  const q = useQuery({
    queryKey: ['receipt', appointmentId],
    queryFn: () => getReceipt(appointmentId),
    enabled: open && !!appointmentId,
    retry: false,
    staleTime: 60000,
  });
  const d = q.data;

  const download = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(appointmentId, d?.receipt?.receiptNo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Appointment receipt"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button icon={Download} loading={downloading} disabled={!d} onClick={download}>
            Download PDF
          </Button>
        </>
      }
    >
      {q.isLoading ? (
        <Loader label="Loading your receipt..." />
      ) : q.isError ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : d ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-brand px-4 py-3 text-on-solid">
            <p className="font-bold">Receipt {d.receipt.receiptNo}</p>
            <Badge tone="ok">{String(d.appointment.status).toUpperCase()}</Badge>
          </div>

          <div className="p-4">
            <div className="float-right ml-3 rounded-xl bg-[#F2B632] px-4 py-2 text-center text-[#12303A]">
              <p className="text-xs font-bold">TOKEN</p>
              <p className="text-3xl font-bold leading-none tabular-nums">{d.appointment.tokenNo}</p>
            </div>
            <dl>
              <Row label="Doctor">
                {d.doctor.name}
                <span className="block font-normal text-muted">{d.doctor.speciality}</span>
              </Row>
              <Row label="Clinic">
                {d.clinic.name}
                <span className="block font-normal text-muted">{d.clinic.address}</span>
              </Row>
              {d.clinic.phone && <Row label="Phone">{d.clinic.phone}</Row>}
              <Row label="Date">{formatDate(d.appointment.date)}</Row>
              <Row label="Time">{d.appointment.isWalkIn ? 'Walk-in' : formatTime(d.appointment.slot)}</Row>
              <Row label="Patient">
                {d.patient.name}
                {d.patient.age ? `, ${d.patient.age} years` : ''}
              </Row>
              <Row label="Fee">
                ₹{d.appointment.payment?.amount ?? '-'}
                <span className="font-normal text-muted">
                  {d.appointment.payment?.status === 'paid' ? ' (paid online)' : ' (pay at the clinic)'}
                </span>
              </Row>
              {d.appointment.reason && <Row label="Reason">{d.appointment.reason}</Row>}
            </dl>
            <div className="clear-both" />

            <div className="mt-3 flex items-center gap-4 border-t-2 border-dashed border-line pt-4">
              <div className="shrink-0 rounded-xl bg-white p-2">
                <QRCodeSVG value={d.receipt.qrData} size={132} level="M" />
              </div>
              <div className="text-sm">
                <p className="font-bold">Show this QR at the reception</p>
                <p className="mt-1 text-muted">
                  The reception scans it to check you in. Please reach 10 minutes early and carry your old reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}