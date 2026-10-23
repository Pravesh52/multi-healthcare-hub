import { Link } from 'react-router-dom';
import { CalendarClock, FileText, ListOrdered, MapPin, Receipt, RotateCcw, Star, X } from 'lucide-react';
import Badge from '@/components/common/Badge.jsx';
import { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import { formatTime, relativeDay, todayIST } from '@/utils/formatDate.js';
import { changeBlockReason, rescheduleBlockReason } from '@/utils/appointment.js';

export default function AppointmentRow({
  appt,
  reviewed = false,
  onCancel,
  onReschedule,
  onReceipt,
  onPrescription,
  onReview,
}) {
  const doctor = appt.doctor;
  const doctorName = doctor?.user?.name || 'Doctor';
  const live = ['pending', 'approved'].includes(appt.status);
  const cancelBlock = live ? changeBlockReason(appt) : '';
  const rescheduleBlock = live ? rescheduleBlockReason(appt) : '';
  const note = cancelBlock || rescheduleBlock;
  const showReason = ['rejected', 'cancelled'].includes(appt.status) && appt.rejectReason;

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">
            {doctor?._id ? (
              <Link to={`/doctors/${doctor._id}`} className="hover:text-brand hover:underline">
                {doctorName}
              </Link>
            ) : (
              doctorName
            )}
          </h3>
          {doctor?.speciality && <p className="text-sm text-muted">{doctor.speciality}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appt.tokenNo != null && <Badge tone="info">Token #{appt.tokenNo}</Badge>}
          <StatusBadge status={appt.status} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="flex items-center gap-2 text-base font-semibold">
          <CalendarClock size={18} className="shrink-0 text-brand" aria-hidden="true" />
          {relativeDay(appt.date)}, {appt.isWalkIn ? 'Walk-in visit' : formatTime(appt.slot)}
        </p>
        {appt.clinic && (
          <p className="flex items-start gap-2 text-muted">
            <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <b className="text-ink">{appt.clinic.name}</b>
              {appt.clinic.address ? `, ${appt.clinic.address}` : ''}
            </span>
          </p>
        )}
        {appt.reason && <p className="break-words text-muted">Reason: {appt.reason}</p>}
        {showReason && <p className="font-medium text-bad">Reason given: {appt.rejectReason}</p>}
        {appt.rescheduledFrom && appt.status === 'pending' && (
          <p className="rounded-lg bg-soft p-2">
            This is a request to change the time. Your earlier appointment stays until the doctor approves this one.
          </p>
        )}
        {appt.payment?.amount != null && (
          <p className="text-muted">
            Fee ₹{appt.payment.amount} ({appt.payment.status === 'paid' ? 'paid online' : 'pay at the clinic'})
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {appt.status === 'approved' && (
          <Button size="sm" icon={Receipt} onClick={() => onReceipt(appt)}>
            Receipt
          </Button>
        )}
        {appt.status === 'approved' && appt.date === todayIST() && (
          <Button size="sm" variant="outline" icon={ListOrdered} to="/patient/queue">
            Live queue
          </Button>
        )}
        {live && (
          <>
            <Button
              size="sm"
              variant="outline"
              icon={CalendarClock}
              disabled={!!rescheduleBlock}
              onClick={() => onReschedule(appt)}
            >
              Change time
            </Button>
            <Button size="sm" variant="danger" icon={X} disabled={!!cancelBlock} onClick={() => onCancel(appt)}>
              Cancel
            </Button>
          </>
        )}

        {appt.status === 'completed' && (
          <>
            <Button size="sm" variant="outline" icon={Receipt} onClick={() => onReceipt(appt)}>
              Receipt
            </Button>
            <Button size="sm" variant="outline" icon={FileText} onClick={() => onPrescription(appt)}>
              Prescription
            </Button>
            {reviewed ? (
              <Badge tone="ok">Reviewed</Badge>
            ) : (
              <Button size="sm" icon={Star} onClick={() => onReview(appt)}>
                Rate your visit
              </Button>
            )}
          </>
        )}

        {['rejected', 'cancelled', 'expired', 'no_show'].includes(appt.status) && doctor?._id && (
          <Button size="sm" variant="outline" icon={RotateCcw} to={`/doctors/${doctor._id}`}>
            Book again
          </Button>
        )}
      </div>

      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </article>
  );
}