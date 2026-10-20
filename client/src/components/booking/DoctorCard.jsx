import { Link } from 'react-router-dom';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';

export default function DoctorCard({ doctor }) {
  const name = doctor.user?.name || 'Doctor';

  return (
    <article className="card flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <DoctorAvatar name={name} gender={doctor.gender} photo={doctor.photo} size={64} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">
            <Link to={`/doctors/${doctor._id}`} className="hover:text-brand hover:underline">
              {name}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {doctor.speciality}
            {doctor.qualification ? ` · ${doctor.qualification}` : ''}
          </p>
          <p className="text-sm text-muted">
            {doctor.gender === 'female' ? 'Female' : doctor.gender === 'male' ? 'Male' : 'Other'} doctor
            {doctor.experienceYears > 0 && ` · ${doctor.experienceYears} years experience`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {doctor.ratingCount > 0 ? (
              <StarRating value={doctor.ratingAvg} count={doctor.ratingCount} size={14} showValue />
            ) : doctor.ratingAvg > 0 ? (
              <StarRating value={doctor.ratingAvg} size={14} showValue />
            ) : (
              <Badge tone="info">New</Badge>
            )}
            {doctor.unavailableToday && <Badge tone="bad">Not available today</Badge>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <p className="text-sm text-muted">
          Fee <b className="text-lg text-ink">₹{doctor.fees}</b>
        </p>
        <Button to={`/doctors/${doctor._id}`} size="sm">
          Book appointment
        </Button>
      </div>
    </article>
  );
}