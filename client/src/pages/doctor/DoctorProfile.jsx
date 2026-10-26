import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge, { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import FileInput from '@/components/auth/FileInput.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input, Textarea } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getMyProfile, updateMyProfile, uploadMyPhoto } from '@/services/doctor.service.js';
import { getErrorMessage, getFieldErrors } from '@/utils/apiError.js';
import { APP_NAME, VERIFICATION_STATUS } from '@/utils/constants.js';

function Row({ label, children }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-semibold">{children}</dd>
    </div>
  );
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fees, setFees] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState([]);

  useEffect(() => {
    document.title = `My profile - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['doc-profile'], queryFn: getMyProfile });
  const doctor = q.data?.doctor;

  useEffect(() => {
    if (!doctor) return;
    setFees(String(doctor.fees ?? ''));
    setExperience(String(doctor.experienceYears ?? 0));
    setBio(doctor.bio || '');
  }, [doctor]);

  const dirty = doctor && (fees !== String(doctor.fees ?? '') || experience !== String(doctor.experienceYears ?? 0) || bio !== (doctor.bio || ''));

  const save = useMutation({
    mutationFn: (body) => updateMyProfile(body),
    onSuccess: () => toast.success('Profile updated'),
    onError: (err) => {
      const f = getFieldErrors(err);
      setErrors({ fees: f.fees, experience: f.experienceYears, bio: f.bio, general: Object.keys(f).length ? undefined : getErrorMessage(err) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['doc-profile'] }),
  });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('photo', photo[0]);
      return uploadMyPhoto(fd);
    },
    onSuccess: () => {
      toast.success('Photo updated');
      setPhoto([]);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['doc-profile'] }),
  });

  const submit = (e) => {
    e.preventDefault();
    const found = {};
    if (!/^\d+$/.test(fees) || Number(fees) > 100000) found.fees = 'Enter your fee in rupees (0 to 100000)';
    if (!/^\d+$/.test(experience) || Number(experience) > 70) found.experience = 'Enter whole years, from 0 to 70';
    if (bio.length > 500) found.bio = 'Please keep it under 500 letters';
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate({ fees: Number(fees), experienceYears: Number(experience), bio: bio.trim() });
  };

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  const clinic = doctor.clinic;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My profile</h1>
          <p className="text-muted">This is what patients see about you.</p>
        </div>
        {clinic && (
          <Button variant="outline" size="sm" icon={ExternalLink} to={`/doctors/${doctor._id}`}>
            See my public page
          </Button>
        )}
      </div>

      <section className="card" aria-label="Photo">
        <h2 className="text-xl font-bold">Photo</h2>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          <DoctorAvatar name={user?.name} gender={doctor.gender} photo={doctor.photo} size={104} />
          <div className="min-w-0 flex-1 space-y-2">
            <FileInput label="Choose a new photo" files={photo} onChange={setPhoto} hint="JPG, PNG or WEBP, up to 5 MB. Patients will see it." />
            {photo.length > 0 && (
              <Button icon={Upload} loading={upload.isPending} onClick={() => upload.mutate()}>
                Upload photo
              </Button>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="card space-y-4" aria-label="About you">
        <h2 className="text-xl font-bold">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Consultation fee (₹)"
            type="number"
            inputMode="numeric"
            min="0"
            required
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            error={errors.fees}
          />
          <Input
            label="Years of experience"
            type="number"
            inputMode="numeric"
            min="0"
            max="70"
            required
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            error={errors.experience}
          />
        </div>
        <Textarea
          label="About me (optional)"
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          error={errors.bio}
          hint={`${bio.length}/500. For example your special interests, languages you speak, or how you treat patients.`}
        />
        {errors.general && (
          <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
            {errors.general}
          </p>
        )}
        <Button type="submit" loading={save.isPending} disabled={!dirty}>
          Save changes
        </Button>
      </form>

      <section className="card" aria-label="Details verified by our team">
        <h2 className="text-xl font-bold">Verified details</h2>
        <p className="mt-1 text-sm text-muted">
          Our team checked these. To change them, please{' '}
          <Link to="/contact" className="font-semibold text-brand underline">
            contact us
          </Link>
          .
        </p>
        <dl className="mt-2 divide-y divide-line">
          <Row label="Name">{user?.name}</Row>
          <Row label="Email">{user?.email}</Row>
          <Row label="Speciality">{doctor.speciality}</Row>
          <Row label="Qualification">{doctor.qualification}</Row>
          <Row label="Medical registration">{doctor.medRegNo}</Row>
          <Row label="Gender">{doctor.gender === 'female' ? 'Female' : doctor.gender === 'male' ? 'Male' : 'Other'}</Row>
          <Row label="Clinic">
            {clinic ? (
              <>
                {clinic.name}
                <span className="block font-normal text-muted">{clinic.address}</span>
              </>
            ) : (
              <Badge tone="warn">Not added to a clinic yet</Badge>
            )}
          </Row>
          <Row label="Rating">
            {doctor.ratingCount > 0 ? <StarRating value={doctor.ratingAvg} count={doctor.ratingCount} showValue size={16} /> : 'No reviews yet'}
          </Row>
          <Row label="Account">
            <StatusBadge status={doctor.status} map={VERIFICATION_STATUS} />
          </Row>
        </dl>
      </section>
    </div>
  );
}