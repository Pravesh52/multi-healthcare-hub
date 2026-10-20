import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, MapPin, Navigation, Phone } from 'lucide-react';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import DoctorCard from '@/components/booking/DoctorCard.jsx';
import ReviewList from '@/components/booking/ReviewList.jsx';
import MapView, { directionsUrl } from '@/components/booking/MapView.jsx';
import { getClinic } from '@/services/clinic.service.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';
import { formatTime } from '@/utils/formatDate.js';
import { isOpenNow } from '@/utils/isOpenNow.js';
import { APP_NAME, WEEKDAYS } from '@/utils/constants.js';
import { CLINIC_TYPES } from '@/data/specialities.js';

export default function ClinicDetail() {
  const { id } = useParams();
  const [photoIdx, setPhotoIdx] = useState(0);

  const q = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => getClinic(id),
    retry: (count, err) => getStatus(err) !== 404 && count < 1,
  });
  const clinic = q.data?.clinic;

  useEffect(() => {
    document.title = clinic ? `${clinic.name} - ${APP_NAME}` : `Clinic - ${APP_NAME}`;
  }, [clinic]);

  if (q.isLoading) {
    return (
      <div className="container-page space-y-4 py-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (q.isError) {
    const notFound = getStatus(q.error) === 404;
    return (
      <div className="container-page py-10">
        {notFound ? (
          <EmptyState
            title="Clinic not found"
            message="This clinic does not exist, or it is not listed right now."
            action={<Button to="/search">Find another clinic</Button>}
          />
        ) : (
          <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }

  const status = isOpenNow(clinic.timings);
  const photos = (clinic.photos || []).map((p) => p?.url || p).filter(Boolean);
  const doctors = clinic.doctors || [];
  const typeLabel = CLINIC_TYPES.find((t) => t.value === clinic.type)?.label;
  const weeklyOff = (clinic.timings?.offDays || []).map((d) => WEEKDAYS[d]).filter(Boolean).join(', ');
  const hasMap = clinic.location?.coordinates?.length === 2;

  return (
    <div className="container-page space-y-8 py-6">
      {/* Top: photos and basic details */}
      <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-line bg-soft">
            {photos.length ? (
              <img src={photos[photoIdx]} alt={`${clinic.name}, photo ${photoIdx + 1}`} className="h-full w-full object-cover" />
            ) : (
              <Building2 size={72} className="text-brand/50" aria-hidden="true" />
            )}
          </div>
          {photos.length > 1 && (
            <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === photoIdx}
                  className={clsx('h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2', i === photoIdx ? 'border-brand' : 'border-line')}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.open ? 'ok' : 'bad'}>{status.label}</Badge>
            {typeLabel && <Badge tone="info">{typeLabel}</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{clinic.name}</h1>
          <div className="mt-1">
            {clinic.ratingCount > 0 ? <StarRating value={clinic.ratingAvg} count={clinic.ratingCount} showValue /> : <Badge tone="info">New</Badge>}
          </div>

          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                {clinic.address}, {clinic.district}, {clinic.state}
                {clinic.pincode ? ` - ${clinic.pincode}` : ''}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Clock size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                {formatTime(clinic.timings?.open)} to {formatTime(clinic.timings?.close)}
                {weeklyOff && <span className="block text-sm text-muted">Weekly off: {weeklyOff}</span>}
              </span>
            </li>
            {clinic.phone && (
              <li className="flex items-center gap-3">
                <Phone size={20} className="shrink-0 text-brand" aria-hidden="true" />
                <a href={`tel:${clinic.phone}`} className="font-semibold text-brand hover:underline">
                  {clinic.phone}
                </a>
              </li>
            )}
          </ul>

          {hasMap && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button href={directionsUrl(clinic)} target="_blank" rel="noreferrer" icon={Navigation}>
                Get directions
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Doctors */}
      <section aria-label="Doctors">
        <h2 className="text-xl font-bold sm:text-2xl">
          Doctors at this {typeLabel?.toLowerCase() || 'clinic'}{' '}
          <span className="text-base font-normal text-muted">({doctors.length})</span>
        </h2>
        <div className="mt-4 space-y-3">
          {doctors.length ? (
            doctors.map((d) => <DoctorCard key={d._id} doctor={d} />)
          ) : (
            <div className="card">
              <EmptyState title="No doctors listed yet" message="Doctors will appear here after they join this clinic." />
            </div>
          )}
        </div>
      </section>

      {/* Map */}
      {hasMap && (
        <section aria-label="Location">
          <h2 className="mb-3 text-xl font-bold sm:text-2xl">Location</h2>
          <MapView clinics={[clinic]} single lockOnTouch className="h-72 sm:h-96" />
        </section>
      )}

      <ReviewList kind="clinic" id={clinic._id} ratingAvg={clinic.ratingAvg} ratingCount={clinic.ratingCount} />
    </div>
  );
}