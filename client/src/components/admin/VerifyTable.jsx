import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Ban, FileText, MapPin, RotateCcw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Badge, { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import Modal from '@/components/common/Modal.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import ReasonDialog from '@/components/admin/ReasonDialog.jsx';
import DocumentViewer from '@/components/admin/DocumentViewer.jsx';
import MapView from '@/components/booking/MapView.jsx';
import {
  getClinicLicence,
  getDoctorCertificate,
  getStats,
  listApplications,
  reinstateApplication,
  rejectApplication,
  suspendApplication,
  verifyApplication,
} from '@/services/admin.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDateTime, formatTime } from '@/utils/formatDate.js';
import { VERIFICATION_STATUS, WEEKDAYS } from '@/utils/constants.js';
import { CLINIC_TYPES } from '@/data/specialities.js';

const STATUSES = ['pending', 'verified', 'rejected', 'suspended'];

const STAT_KEY = {
  doctors: { pending: 'doctorsPending', verified: 'doctorsVerified', suspended: 'doctorsSuspended' },
  clinics: { pending: 'clinicsPending', verified: 'clinicsVerified', suspended: 'clinicsSuspended' },
};

const EMPTY = {
  pending: 'Nothing is waiting for verification.',
  verified: 'No verified record yet.',
  rejected: 'No rejected record.',
  suspended: 'No suspended record.',
};

// One shape for doctors and clinics, so one card can show both
const describe = (kind, a) => {
  if (kind === 'doctors') {
    return {
      title: a.user?.name || 'Doctor',
      email: a.user?.email,
      phone: a.user?.phone,
      regLabel: 'Medical registration no.',
      reg: a.medRegNo,
      docLabel: 'Certificate',
      hasDoc: !!a.certificate?.publicId,
      hasMap: false,
      lines: [
        [`${a.speciality}`, `${a.qualification}`],
        [`${a.gender === 'female' ? 'Female' : a.gender === 'male' ? 'Male' : 'Other'} doctor`, `${a.experienceYears || 0} years experience`],
        ['Fee', `₹${a.fees}`],
        ['Clinic', a.clinic ? `${a.clinic.name}, ${a.clinic.district}` : 'Not linked to a clinic yet'],
      ],
    };
  }
  const t = a.timings || {};
  const off = (t.offDays || []).map((d) => WEEKDAYS[d]?.slice(0, 3)).filter(Boolean).join(', ');
  return {
    title: a.name,
    email: a.owner?.email,
    phone: a.phone,
    regLabel: 'Registration no.',
    reg: a.regNo,
    docLabel: 'Licence',
    hasDoc: !!a.licence?.publicId,
    hasMap: a.location?.coordinates?.length === 2,
    lines: [
      ['Type', CLINIC_TYPES.find((x) => x.value === a.type)?.label || a.type],
      ['Owner', a.owner?.name || '-'],
      ['Address', `${a.address}, ${a.district}, ${a.state}${a.pincode ? ` - ${a.pincode}` : ''}`],
      ['Timings', `${formatTime(t.open)} to ${formatTime(t.close)}${off ? ` (off: ${off})` : ''}`],
      ['Photos', `${a.photos?.length || 0} uploaded`],
    ],
  };
};

function Card({ kind, a, onVerify, onReject, onSuspend, onReinstate, onDocument, onMap }) {
  const d = describe(kind, a);
  const status = a.status;

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold">{d.title}</h3>
          <p className="break-all text-sm text-muted">
            {d.email}
            {d.phone ? ` · ${d.phone}` : ''}
          </p>
        </div>
        <StatusBadge status={status} map={VERIFICATION_STATUS} />
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-3">
          <dt className="w-32 shrink-0 text-muted">{d.regLabel}</dt>
          <dd className="min-w-0 break-words font-bold">{d.reg}</dd>
        </div>
        {d.lines.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-32 shrink-0 text-muted">{value === undefined ? '' : label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
        <div className="flex gap-3">
          <dt className="w-32 shrink-0 text-muted">Registered</dt>
          <dd>{formatDateTime(a.createdAt)}</dd>
        </div>
        {a.verifiedAt && status === 'verified' && (
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-muted">Verified</dt>
            <dd>{formatDateTime(a.verifiedAt)}</dd>
          </div>
        )}
      </dl>

      {kind === 'doctors' && status === 'verified' && !a.clinic && (
        <p className="mt-3 rounded-lg bg-warn-soft p-2 text-sm text-warn">
          Patients cannot see this doctor until a clinic adds them using their email.
        </p>
      )}
      {['rejected', 'suspended'].includes(status) && a.rejectReason && (
        <p className="mt-3 rounded-lg bg-bad-soft p-2 text-sm text-bad">
          <b>{status === 'rejected' ? 'Rejected' : 'Suspended'}:</b> {a.rejectReason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" icon={FileText} disabled={!d.hasDoc} onClick={() => onDocument(a)}>
          {d.hasDoc ? `View ${d.docLabel.toLowerCase()}` : `No ${d.docLabel.toLowerCase()}`}
        </Button>
        {d.hasMap && (
          <Button size="sm" variant="outline" icon={MapPin} onClick={() => onMap(a)}>
            See pin on map
          </Button>
        )}
        {['pending', 'rejected'].includes(status) && (
          <Button size="sm" variant="ok" icon={BadgeCheck} onClick={() => onVerify(a)}>
            Verify
          </Button>
        )}
        {status === 'pending' && (
          <Button size="sm" variant="danger" icon={X} onClick={() => onReject(a)}>
            Reject
          </Button>
        )}
        {status === 'verified' && (
          <Button size="sm" variant="danger" icon={Ban} onClick={() => onSuspend(a)}>
            Suspend
          </Button>
        )}
        {status === 'suspended' && (
          <Button size="sm" icon={RotateCcw} onClick={() => onReinstate(a)}>
            Reinstate
          </Button>
        )}
      </div>
    </article>
  );
}

export default function VerifyTable({ kind }) {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const asked = params.get('status');
  const status = STATUSES.includes(asked) ? asked : 'pending';

  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'verify' | 'reinstate', app }
  const [reasonFor, setReasonFor] = useState(null); // { type: 'reject' | 'suspend', app }
  const [docApp, setDocApp] = useState(null);
  const [mapApp, setMapApp] = useState(null);

  const label = kind === 'doctors' ? 'doctor' : 'clinic';

  const q = useQuery({
    queryKey: ['admin-apps', kind, status],
    queryFn: () => listApplications(kind, status),
    refetchInterval: 30000,
  });
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: getStats, refetchInterval: 30000 });

  const list = q.data?.[kind] ?? [];
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((a) => {
      const d = describe(kind, a);
      return [d.title, d.email, d.reg, d.phone].some((x) => String(x || '').toLowerCase().includes(needle));
    });
  }, [list, search, kind]);

  const act = useMutation({
    mutationFn: ({ type, app, reason }) => {
      const id = app._id;
      if (type === 'verify') return verifyApplication(kind, id);
      if (type === 'reject') return rejectApplication(kind, id, reason);
      if (type === 'suspend') return suspendApplication(kind, id, reason);
      return reinstateApplication(kind, id);
    },
    onSuccess: (d) => {
      const n = d.cancelledAppointments;
      toast.success(`${d.message}${n ? `. ${n} upcoming ${n === 1 ? 'appointment was' : 'appointments were'} cancelled.` : ''}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setConfirm(null);
      setReasonFor(null);
      queryClient.invalidateQueries({ queryKey: ['admin-apps'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const counts = stats.data?.stats;
  const countOf = (s) => (counts ? counts[STAT_KEY[kind][s]] : undefined);

  const loadDoc = () => (kind === 'doctors' ? getDoctorCertificate(docApp._id) : getClinicLicence(docApp._id));
  const nameOf = (a) => describe(kind, a).title;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{kind === 'doctors' ? 'Doctors' : 'Clinics and hospitals'}</h1>
        <p className="text-muted">
          Check the {kind === 'doctors' ? 'certificate and medical registration number' : 'licence, address and map pin'} before you verify.
        </p>
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setParams({ status: s }, { replace: true })}
            className={clsx(
              'flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
              status === s ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
            )}
          >
            {VERIFICATION_STATUS[s].label}
            {s === 'pending' && countOf('pending') > 0 && (
              <span className="rounded-full bg-cross px-1.5 text-xs font-bold leading-5 text-white">{countOf('pending')}</span>
            )}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <label htmlFor="admin-search" className="sr-only">
          Search
        </label>
        <input
          id="admin-search"
          className="input pl-10"
          placeholder="Search by name, email or registration number"
          value={search}
          maxLength={60}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={search ? 'No match for your search' : EMPTY[status]}
            message={search ? 'Try a different word.' : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((a) => (
            <Card
              key={a._id}
              kind={kind}
              a={a}
              onVerify={(app) => setConfirm({ type: 'verify', app })}
              onReinstate={(app) => setConfirm({ type: 'reinstate', app })}
              onReject={(app) => setReasonFor({ type: 'reject', app })}
              onSuspend={(app) => setReasonFor({ type: 'suspend', app })}
              onDocument={setDocApp}
              onMap={setMapApp}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'verify' ? `Verify this ${label}?` : `Reinstate this ${label}?`}
        message={
          confirm
            ? confirm.type === 'verify'
              ? `${nameOf(confirm.app)} will be able to log in and appear in search. Please make sure you have checked the documents.`
              : `${nameOf(confirm.app)} will be able to log in and appear in search again.`
            : ''
        }
        confirmLabel={confirm?.type === 'verify' ? 'Yes, verify' : 'Yes, reinstate'}
        loading={act.isPending}
        onConfirm={() => act.mutate({ type: confirm.type, app: confirm.app })}
        onCancel={() => setConfirm(null)}
      />

      <ReasonDialog
        open={!!reasonFor}
        title={reasonFor?.type === 'reject' ? `Reject this ${label}` : `Suspend this ${label}`}
        message={
          reasonFor
            ? reasonFor.type === 'reject'
              ? `${nameOf(reasonFor.app)} will see your reason when they try to log in, and can send the document again.`
              : `${nameOf(reasonFor.app)} will be removed from search and cannot log in. All their upcoming appointments will be cancelled and the patients will be told.`
            : ''
        }
        confirmLabel={reasonFor?.type === 'reject' ? 'Reject' : 'Suspend'}
        loading={act.isPending}
        onConfirm={(reason) => act.mutate({ type: reasonFor.type, app: reasonFor.app, reason })}
        onCancel={() => setReasonFor(null)}
      />

      <DocumentViewer
        open={!!docApp}
        title={docApp ? `${nameOf(docApp)}: ${describe(kind, docApp).docLabel.toLowerCase()}` : ''}
        load={loadDoc}
        onClose={() => setDocApp(null)}
      />

      <Modal
        open={!!mapApp}
        onClose={() => setMapApp(null)}
        title={mapApp ? `Pin of ${mapApp.name}` : ''}
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setMapApp(null)}>
            Close
          </Button>
        }
      >
        {mapApp && (
          <>
            <p className="mb-3 text-sm text-muted">
              Address given: {mapApp.address}, {mapApp.district}. Check that the pin is at this place.
            </p>
            <MapView clinics={[mapApp]} single lockOnTouch className="h-72 sm:h-96" />
          </>
        )}
      </Modal>
    </div>
  );
}