import { ArrowRightLeft, Check, FileText, Phone, X } from 'lucide-react';
import Badge, { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import { formatDateTime, formatTime, relativeDay } from '@/utils/formatDate.js';

const genderLabel = (g) => (g === 'female' ? 'Female' : g === 'male' ? 'Male' : g === 'other' ? 'Other' : '');

export default function RequestRow({ appt, busy = false, onApprove, onReject, onPrescription }) {
  const p = appt.patient || {};
  const allergies = p.medical?.allergies || [];
  const conditions = p.medical?.conditions || [];
  const bloodGroup = p.medical?.bloodGroup;
  const pending = appt.status === 'pending';
  const who = [p.age ? `${p.age} years` : null, genderLabel(p.gender)].filter(Boolean).join(' · ');

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold">{p.name || 'Patient'}</h3>
          <p className="text-sm text-muted">{who}</p>
          {p.phone && (
            <a href={`tel:${p.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <Phone size={14} aria-hidden="true" /> {p.phone}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appt.tokenNo != null && <Badge tone="info">Token #{appt.tokenNo}</Badge>}
          <StatusBadge status={appt.status} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="text-base font-semibold">
          {relativeDay(appt.date)}, {appt.isWalkIn ? 'Walk-in visit' : formatTime(appt.slot)}
        </p>
        {appt.reason ? (
          <p className="break-words">
            <span className="text-muted">Reason: </span>
            {appt.reason}
          </p>
        ) : (
          <p className="text-muted">No reason written.</p>
        )}
        {appt.payment?.amount != null && (
          <p className="text-muted">
            Fee ₹{appt.payment.amount} ({appt.payment.status === 'paid' ? 'paid online' : 'pay at the clinic'})
          </p>
        )}
      </div>

      {(bloodGroup || allergies.length > 0 || conditions.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Patient health information">
          {bloodGroup && <Badge tone="info">Blood group {bloodGroup}</Badge>}
          {allergies.map((a) => (
            <Badge key={a} tone="bad">
              Allergy: {a}
            </Badge>
          ))}
          {conditions.map((c) => (
            <Badge key={c} tone="warn">
              {c}
            </Badge>
          ))}
        </div>
      )}

      {appt.rescheduledFrom && pending && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-soft p-2 text-sm">
          <ArrowRightLeft size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          The patient wants to move an approved appointment to this time. If you approve, the earlier appointment is cancelled.
        </p>
      )}
      {pending && appt.expiresAt && (
        <p className="mt-2 text-xs text-muted">Please reply by {formatDateTime(appt.expiresAt)}. After that the request expires.</p>
      )}
      {['rejected', 'cancelled'].includes(appt.status) && appt.rejectReason && (
        <p className="mt-2 text-sm text-bad">Reason: {appt.rejectReason}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {pending && (
          <>
            <Button size="sm" variant="ok" icon={Check} disabled={busy} onClick={() => onApprove(appt)}>
              Approve
            </Button>
            <Button size="sm" variant="danger" icon={X} disabled={busy} onClick={() => onReject(appt)}>
              Reject
            </Button>
          </>
        )}
        {appt.status === 'completed' && onPrescription && (
          <Button size="sm" variant="outline" icon={FileText} onClick={() => onPrescription(appt)}>
            Prescription
          </Button>
        )}
      </div>
    </article>
  );
}