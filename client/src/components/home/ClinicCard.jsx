import { Link } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';
import { isOpenNow } from '@/utils/isOpenNow.js';
import { formatTime } from '@/utils/formatDate.js';
import { WEEKDAYS } from '@/utils/constants.js';
import { CLINIC_TYPES } from '@/data/specialities.js';

// Written in full so Tailwind can find these classes
const TINTS = ['from-brand/20', 'from-ok/20', 'from-cross/15', 'from-warn/25', 'from-brand-dark/20'];

const pickTint = (id = '') => TINTS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

const formatDistance = (m) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);

export default function ClinicCard({ clinic }) {
  const status = isOpenNow(clinic.timings);
  const doctors = clinic.doctors || [];
  const headDoctors = doctors.slice(0, 3);
  const listed = doctors.slice(0, 2);
  const extra = doctors.length - listed.length;
  const specialities = [...new Set(doctors.map((d) => d.speciality).filter(Boolean))].slice(0, 2);
  const typeLabel = CLINIC_TYPES.find((t) => t.value === clinic.type)?.label;
  const minFees = doctors.length ? Math.min(...doctors.map((d) => d.fees)) : null;
  const weeklyOff = (clinic.timings?.offDays || []).map((d) => WEEKDAYS[d]?.slice(0, 3)).filter(Boolean).join(', ');
  const avatarSize = headDoctors.length === 1 ? 124 : headDoctors.length === 2 ? 112 : 100;

  return (
    <article className="card flex flex-col overflow-hidden !p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-card">
      <div className={clsx('relative flex h-36 items-end justify-center bg-gradient-to-br to-soft px-3', pickTint(clinic._id))}>
        {headDoctors.length ? (
          <div className="flex items-end -space-x-3">
            {headDoctors.map((d) => (
              <DoctorAvatar
                key={d._id}
                shape="bust"
                size={avatarSize}
                name={d.user?.name}
                gender={d.gender}
                photo={d.photo}
              />
            ))}
          </div>
        ) : (
          <Building2 size={56} className="mb-5 text-brand/60" aria-hidden="true" />
        )}

        {specialities.length > 0 && (
          <div className="absolute left-3 top-3 flex max-w-[58%] flex-wrap gap-1">
            {specialities.map((s) => (
              <span key={s} className="rounded-full bg-card/90 px-2.5 py-0.5 text-xs font-bold text-ink">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge tone={status.open ? 'ok' : 'bad'}>{status.label}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">
              <Link to={`/clinics/${clinic._id}`} className="hover:text-brand hover:underline">
                {clinic.name}
              </Link>
            </h3>
            {clinic.type && clinic.type !== 'clinic' && <Badge tone="info">{typeLabel}</Badge>}
          </div>
          <div className="mt-1">
            {clinic.ratingCount > 0 ? (
              <StarRating value={clinic.ratingAvg} count={clinic.ratingCount} size={16} showValue />
            ) : (
              <Badge tone="info">New</Badge>
            )}
          </div>
        </div>

        {doctors.length ? (
          <ul className="space-y-1.5">
            {listed.map((d) => (
              <li key={d._id} className="text-sm">
                <p className="font-semibold">
                  {d.user?.name}
                  {d.unavailableToday && <span className="ml-2 text-xs font-bold text-bad">Not available today</span>}
                </p>
                <p className="text-muted">
                  {d.speciality} · {d.gender === 'female' ? 'Female' : d.gender === 'male' ? 'Male' : 'Other'} doctor
                </p>
              </li>
            ))}
            {extra > 0 && <li className="text-sm font-semibold text-brand">+{extra} more {extra === 1 ? 'doctor' : 'doctors'}</li>}
          </ul>
        ) : (
          <p className="text-sm text-muted">Doctors will be listed here soon.</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-page px-3 py-2">
            <p className="text-xs text-muted">Opens</p>
            <p className="font-semibold">{formatTime(clinic.timings?.open) || '-'}</p>
          </div>
          <div className="rounded-lg bg-page px-3 py-2">
            <p className="text-xs text-muted">Closes</p>
            <p className="font-semibold">{formatTime(clinic.timings?.close) || '-'}</p>
          </div>
        </div>
        {weeklyOff && <p className="-mt-1 text-xs text-muted">Weekly off: {weeklyOff}</p>}

        <p className="flex items-start gap-1.5 text-sm text-muted">
          <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {clinic.address}, {clinic.district}
            {typeof clinic.distanceMeters === 'number' && (
              <b className="text-ink"> · {formatDistance(clinic.distanceMeters)} away</b>
            )}
          </span>
        </p>

        {minFees != null && <p className="text-sm text-muted">Consultation from <b className="text-ink">₹{minFees}</b></p>}

        <Button to={`/clinics/${clinic._id}`} block className="mt-auto">
          Book appointment
        </Button>
      </div>
    </article>
  );
}