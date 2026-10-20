import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, MapPin, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Textarea } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import SlotPicker from '@/components/booking/SlotPicker.jsx';
import ReviewList from '@/components/booking/ReviewList.jsx';
import MapView, { directionsUrl } from '@/components/booking/MapView.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getDoctor } from '@/services/doctor.service.js';
import { createAppointment } from '@/services/appointment.service.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';
import { formatTime, relativeDay } from '@/utils/formatDate.js';
import { APP_NAME, WEEKDAYS } from '@/utils/constants.js';

const scheduleRows = (schedule = []) => {
  const byDay = {};
  schedule.forEach((s) => {
    (byDay[s.day] ||= []).push(`${formatTime(s.start)} to ${formatTime(s.end)}`);
  });
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => byDay[d]).map((d) => ({ day: WEEKDAYS[d], text: byDay[d].join(', ') }));
};

export default function DoctorProfile() {
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, role, loading: authLoading } = useAuth();

  const [sel, setSel] = useState({ date: '', slot: '' });
  const [reason, setReason] = useState('');
  const [booked, setBooked] = useState(null);

  const q = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id),
    retry: (count, err) => getStatus(err) !== 404 && count < 1,
  });
  const doctor = q.data?.doctor;

  useEffect(() => {
    document.title = doctor ? `${doctor.user?.name} - ${APP_NAME}` : `Doctor - ${APP_NAME}`;
  }, [doctor]);

  const book = useMutation({
    mutationFn: () =>
      createAppointment({
        doctorId: id,
        date: sel.date,
        slot: sel.slot,
        reason: reason.trim() || undefined,
        paymentMode: 'at_clinic',
      }),
    onSuccess: (d) => {
      setBooked({ appointment: d.appointment, date: sel.date, slot: sel.slot });
      queryClient.invalidateQueries({ queryKey: ['slots', id] });
      toast.success('Request sent to the doctor');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      if ([400, 409].includes(getStatus(err))) {
        queryClient.invalidateQueries({ queryKey: ['slots', id] });
        setSel((s) => ({ ...s, slot: '' }));
      }
    },
  });

  if (q.isLoading) {
    return (
      <div className="container-page space-y-4 py-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (q.isError) {
    const notFound = getStatus(q.error) === 404;
    return (
      <div className="container-page py-10">
        {notFound ? (
          <EmptyState
            title="Doctor not found"
            message="This doctor does not exist, or is not available for booking right now."
            action={<Button to="/search">Find another doctor</Button>}
          />
        ) : (
          <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }

  const clinic = doctor.clinic;
  const name = doctor.user?.name || 'Doctor';
  const rows = scheduleRows(doctor.schedule);
  const hasMap = clinic?.location?.coordinates?.length === 2;

  // ---------- the booking panel ----------
  let panel;
  if (booked) {
    panel = (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok">
          <Check size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-xl font-bold">Request sent</h2>
        <p className="mt-1 text-muted">
          {name} will review your request for <b className="text-ink">{relativeDay(booked.date)}, {formatTime(booked.slot)}</b>.
          You will get a notification and your receipt once the doctor approves.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button to="/patient/appointments">View my appointments</Button>
          <Button
            variant="outline"
            onClick={() => {
              setBooked(null);
              setSel({ date: '', slot: '' });
              setReason('');
            }}
          >
            Book another slot
          </Button>
        </div>
      </div>
    );
  } else if (authLoading) {
    panel = <Skeleton className="h-64" />;
  } else if (user && role !== 'patient') {
    panel = (
      <p className="rounded-xl bg-soft p-3 text-sm">
        You are logged in as a {role}. Only patients can book appointments. To book, please log out and log in with a
        patient mobile number.
      </p>
    );
  } else {
    panel = (
      <>
        <SlotPicker
          doctorId={id}
          schedule={doctor.schedule || []}
          leaveDates={doctor.leaveDates || []}
          unavailableToday={doctor.unavailableToday}
          clinicOffDays={clinic?.timings?.offDays || []}
          value={sel}
          onChange={setSel}
        />

        <Textarea
          className="mt-4"
          label="Reason for the visit (optional)"
          placeholder="For example: fever and cough for 3 days"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          hint={`${reason.length}/300`}
        />

        <div className="mt-3 rounded-xl bg-soft p-3 text-sm">
          <p>
            Fee: <b className="text-ink">₹{doctor.fees}</b>, to be paid at the clinic.
          </p>
          <p className="mt-1 text-muted">
            This is a request. Your slot is confirmed and your receipt is issued only after the doctor approves it.
          </p>
        </div>

        {user ? (
          <Button
            className="mt-3"
            block
            loading={book.isPending}
            disabled={!sel.date || !sel.slot}
            onClick={() => book.mutate()}
          >
            {sel.slot ? `Request ${relativeDay(sel.date)}, ${formatTime(sel.slot)}` : 'Choose a day and time'}
          </Button>
        ) : (
          <Button className="mt-3" block to="/login" state={{ from: location }}>
            Login to book this slot
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="container-page py-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: about the doctor */}
        <div className="space-y-8">
          <section className="card">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <DoctorAvatar name={name} gender={doctor.gender} photo={doctor.photo} size={104} />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold sm:text-3xl">{name}</h1>
                <p className="text-lg text-muted">{doctor.speciality}</p>
                <p className="text-sm text-muted">{doctor.qualification}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {doctor.ratingCount > 0 ? <StarRating value={doctor.ratingAvg} count={doctor.ratingCount} showValue /> : <Badge tone="info">New</Badge>}
                  <Badge tone="info">{doctor.gender === 'female' ? 'Female' : doctor.gender === 'male' ? 'Male' : 'Other'} doctor</Badge>
                  {doctor.experienceYears > 0 && <Badge tone="info">{doctor.experienceYears} years experience</Badge>}
                  {doctor.unavailableToday && <Badge tone="bad">Not available today</Badge>}
                </div>
              </div>
            </div>
            {doctor.bio && (
              <div className="mt-4 border-t border-line pt-4">
                <h2 className="text-lg font-bold">About</h2>
                <p className="mt-1 whitespace-pre-line break-words text-muted">{doctor.bio}</p>
              </div>
            )}
          </section>

          {/* On a phone the booking panel comes right after the profile */}
          <section className="card lg:hidden" aria-label="Book an appointment">
            <h2 className="mb-3 text-xl font-bold">Book an appointment</h2>
            {panel}
          </section>

          {rows.length > 0 && (
            <section className="card" aria-label="Weekly timings">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Clock size={20} className="text-brand" aria-hidden="true" /> Weekly timings
              </h2>
              <dl className="mt-3 divide-y divide-line">
                {rows.map((r) => (
                  <div key={r.day} className="flex justify-between gap-4 py-2">
                    <dt className="font-medium">{r.day}</dt>
                    <dd className="text-right text-muted">{r.text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-sm text-muted">Each visit is about {doctor.slotMinutes} minutes.</p>
            </section>
          )}

          {clinic && (
            <section className="card" aria-label="Clinic">
              <h2 className="text-lg font-bold">Where you will meet the doctor</h2>
              <p className="mt-2 text-lg font-semibold">
                <Link to={`/clinics/${clinic._id}`} className="hover:text-brand hover:underline">
                  {clinic.name}
                </Link>
              </p>
              <p className="mt-1 flex items-start gap-2 text-muted">
                <MapPin size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                {clinic.address}, {clinic.district}
              </p>
              {clinic.phone && (
                <p className="mt-1 flex items-center gap-2">
                  <Phone size={18} className="shrink-0 text-brand" aria-hidden="true" />
                  <a href={`tel:${clinic.phone}`} className="font-semibold text-brand hover:underline">
                    {clinic.phone}
                  </a>
                </p>
              )}
              {hasMap && (
                <>
                  <MapView clinics={[clinic]} single lockOnTouch className="mt-3 h-64" />
                  <Button href={directionsUrl(clinic)} target="_blank" rel="noreferrer" variant="outline" size="sm" className="mt-3">
                    Get directions
                  </Button>
                </>
              )}
            </section>
          )}

          <ReviewList kind="doctor" id={doctor._id} ratingAvg={doctor.ratingAvg} ratingCount={doctor.ratingCount} />
        </div>

        {/* Right: booking (laptop) */}
        <aside className="hidden lg:block">
          <section className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto" aria-label="Book an appointment">
            <h2 className="mb-3 text-xl font-bold">Book an appointment</h2>
            {panel}
          </section>
        </aside>
      </div>
    </div>
  );
}