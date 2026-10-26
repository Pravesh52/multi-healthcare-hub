import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import FileInput from '@/components/auth/FileInput.jsx';
import MapView from '@/components/booking/MapView.jsx';
import { DAY_ORDER } from '@/components/doctor/SchedulePanel.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input, Textarea } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { addClinicPhoto, getMyClinic, removeClinicPhoto, updateMyClinic } from '@/services/clinic.service.js';
import { getErrorMessage, getFieldErrors } from '@/utils/apiError.js';
import { APP_NAME, VERIFICATION_STATUS, WEEKDAYS } from '@/utils/constants.js';
import { CLINIC_TYPES } from '@/data/specialities.js';

const MAX_PHOTOS = 5;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function Row({ label, children }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <dt className="w-40 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-semibold">{children}</dd>
    </div>
  );
}

export default function ClinicProfile() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [open, setOpen] = useState('09:00');
  const [close, setClose] = useState('17:00');
  const [offDays, setOffDays] = useState([]);
  const [errors, setErrors] = useState({});
  const [photo, setPhoto] = useState([]);
  const [removeIndex, setRemoveIndex] = useState(null);

  useEffect(() => {
    document.title = `Clinic profile - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['clinic-me'], queryFn: getMyClinic });
  const clinic = q.data?.clinic;

  useEffect(() => {
    if (!clinic) return;
    setPhone(clinic.phone || '');
    setAddress(clinic.address || '');
    setOpen(clinic.timings?.open || '09:00');
    setClose(clinic.timings?.close || '17:00');
    setOffDays([...(clinic.timings?.offDays || [])].sort((a, b) => a - b));
  }, [clinic]);

  const dirty =
    clinic &&
    (phone !== (clinic.phone || '') ||
      address !== (clinic.address || '') ||
      open !== (clinic.timings?.open || '09:00') ||
      close !== (clinic.timings?.close || '17:00') ||
      !sameList([...offDays].sort((a, b) => a - b), [...(clinic.timings?.offDays || [])].sort((a, b) => a - b)));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clinic-me'] });
    queryClient.invalidateQueries({ queryKey: ['clinics'] });
  };

  const save = useMutation({
    mutationFn: (body) => updateMyClinic(body),
    onSuccess: () => toast.success('Clinic details updated. Patients see the change within a minute.'),
    onError: (err) => {
      const f = getFieldErrors(err);
      setErrors({ phone: f.phone, address: f.address, general: Object.keys(f).length ? undefined : getErrorMessage(err) });
    },
    onSettled: refresh,
  });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('photo', photo[0]);
      return addClinicPhoto(fd);
    },
    onSuccess: () => {
      toast.success('Photo added');
      setPhoto([]);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (index) => removeClinicPhoto(index),
    onSuccess: () => toast.success('Photo removed'),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setRemoveIndex(null);
      refresh();
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const found = {};
    if (!/^[6-9]\d{9}$/.test(phone)) found.phone = 'Enter a valid 10-digit Indian mobile number';
    if (address.trim().length < 5 || address.length > 200) found.address = 'The address must be 5 to 200 letters';
    if (!open || !close) found.timings = 'Choose both the opening and the closing time';
    else if (close <= open) found.timings = 'The closing time must be after the opening time';
    setErrors(found);
    if (Object.keys(found).length) return;

    save.mutate({ phone, address: address.trim(), timings: { open, close, offDays } });
  };

  const toggleOff = (day) => setOffDays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day]));

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  const photos = clinic.photos || [];
  const typeLabel = CLINIC_TYPES.find((t) => t.value === clinic.type)?.label || clinic.type;
  const hasMap = clinic.location?.coordinates?.length === 2;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Clinic profile</h1>
          <p className="text-muted">This is what patients see about your clinic.</p>
        </div>
        <Button size="sm" variant="outline" to={`/clinics/${clinic._id}`}>
          See my public page
        </Button>
      </div>

      <form onSubmit={submit} noValidate className="card space-y-4" aria-label="Clinic details">
        <h2 className="text-xl font-bold">Contact and timings</h2>

        <Input
          label="Clinic phone"
          type="tel"
          required
          inputMode="numeric"
          maxLength={10}
          hint="Patients can call this number."
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          error={errors.phone}
        />
        <Textarea
          label="Address"
          required
          rows={2}
          maxLength={200}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
        />

        <div className="grid gap-4 xs:grid-cols-2">
          <Input label="Opens at" type="time" required value={open} onChange={(e) => setOpen(e.target.value)} />
          <Input label="Closes at" type="time" required value={close} onChange={(e) => setClose(e.target.value)} error={errors.timings} />
        </div>

        <div>
          <p className="label">Weekly off days</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Weekly off days">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={offDays.includes(day)}
                onClick={() => toggleOff(day)}
                className={clsx(
                  'min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors',
                  offDays.includes(day) ? 'border-bad bg-bad-soft text-bad' : 'border-line bg-card hover:bg-soft'
                )}
              >
                {WEEKDAYS[day].slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="hint">The clinic is shown as closed on the days marked in red, and patients cannot book those days.</p>
        </div>

        {errors.general && (
          <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
            {errors.general}
          </p>
        )}
        <Button type="submit" loading={save.isPending} disabled={!dirty}>
          Save changes
        </Button>
      </form>

      <section className="card space-y-3" aria-label="Photos">
        <h2 className="text-xl font-bold">
          Photos <span className="text-base font-normal text-muted">({photos.length} of {MAX_PHOTOS})</span>
        </h2>
        {photos.length === 0 ? (
          <p className="text-muted">No photo yet. Photos help patients trust your clinic.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <li key={p.publicId || p.url} className="relative overflow-hidden rounded-xl border border-line">
                <img src={p.url} alt={`Clinic photo ${i + 1}`} loading="lazy" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setRemoveIndex(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-card/95 text-bad shadow hover:bg-bad-soft"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {photos.length < MAX_PHOTOS ? (
          <div className="space-y-2">
            <FileInput label="Add a photo" files={photo} onChange={setPhoto} hint="JPG, PNG or WEBP, up to 5 MB." />
            {photo.length > 0 && (
              <Button icon={Upload} loading={upload.isPending} onClick={() => upload.mutate()}>
                Upload photo
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">You have added the most photos allowed. Remove one to add another.</p>
        )}
      </section>

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
          <Row label="Name">{clinic.name}</Row>
          <Row label="Type">{typeLabel}</Row>
          <Row label="Registration no.">{clinic.regNo}</Row>
          <Row label="State and district">
            {clinic.district}, {clinic.state}
            {clinic.pincode ? ` - ${clinic.pincode}` : ''}
          </Row>
          <Row label="Rating">
            {clinic.ratingCount > 0 ? <StarRating value={clinic.ratingAvg} count={clinic.ratingCount} showValue size={16} /> : 'No reviews yet'}
          </Row>
          <Row label="Account">
            <StatusBadge status={clinic.status} map={VERIFICATION_STATUS} />
          </Row>
        </dl>

        {hasMap && (
          <div className="mt-3">
            <p className="label">Your pin on the map</p>
            <MapView clinics={[clinic]} single lockOnTouch className="h-64" />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={removeIndex !== null}
        title="Remove this photo?"
        message="Patients will no longer see it."
        confirmLabel="Yes, remove"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(removeIndex)}
        onCancel={() => setRemoveIndex(null)}
      />
    </div>
  );
}