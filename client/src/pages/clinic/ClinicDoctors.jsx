import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge, { StatusBadge } from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import DoctorAvatar from '@/components/common/DoctorAvatar.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useSocket from '@/hooks/useSocket.js';
import { addDoctor, getMyDoctors, removeDoctor } from '@/services/clinic.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME, VERIFICATION_STATUS } from '@/utils/constants.js';

export default function ClinicDoctors() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    document.title = `Doctors - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['clinic-doctors'], queryFn: getMyDoctors });
  const doctors = q.data?.doctors ?? [];

  // The live connection joins the queue rooms of your doctors when it starts, so restart it after a change
  const reconnectLive = () => {
    if (!socket) return;
    socket.disconnect();
    socket.connect();
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['clinic-doctors'] });
    queryClient.invalidateQueries({ queryKey: ['clinic-doc-queue'] });
    queryClient.invalidateQueries({ queryKey: ['clinics'] });
  };

  const add = useMutation({
    mutationFn: (e) => addDoctor(e),
    onSuccess: (d) => {
      toast.success(d.message || 'Doctor added');
      setEmail('');
      setEmailError('');
      reconnectLive();
      refresh();
    },
    onError: (err) => setEmailError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id) => removeDoctor(id),
    onSuccess: (d) => {
      toast.success(d.message || 'Doctor removed');
      reconnectLive();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setRemoveTarget(null);
      refresh();
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    add.mutate(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Doctors</h1>
        <p className="text-muted">Doctors who sit at your clinic. Patients can book only the doctors listed here.</p>
      </div>

      <section className="card" aria-label="Add a doctor">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <UserPlus size={22} className="text-brand" aria-hidden="true" /> Add a doctor
        </h2>
        <p className="mt-1 text-sm text-muted">
          The doctor must first register on {APP_NAME} and be verified by our team. Then type the email they registered with.
          Ask them to share it, and to set their weekly timings from their own dashboard.
        </p>
        <form onSubmit={submit} noValidate className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            className="flex-1"
            label="Doctor's email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="doctor@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            error={emailError}
          />
          <Button type="submit" className="sm:mt-6" icon={UserPlus} loading={add.isPending}>
            Add doctor
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">
          Is the doctor not registered yet?{' '}
          <Link to="/register/doctor" className="font-semibold text-brand underline">
            The registration page is here
          </Link>
          .
        </p>
      </section>

      <section aria-label="Your doctors">
        <h2 className="mb-3 text-xl font-bold">
          Your doctors <span className="text-base font-normal text-muted">({doctors.length})</span>
        </h2>

        {q.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : doctors.length === 0 ? (
          <div className="card">
            <EmptyState icon={Stethoscope} title="No doctor added yet" message="Add your first doctor using their email above." />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {doctors.map((d) => (
              <article key={d._id} className="card">
                <div className="flex items-start gap-3">
                  <DoctorAvatar name={d.user?.name} gender={d.gender} photo={d.photo} size={64} />
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-bold">{d.user?.name}</h3>
                    <p className="text-sm text-muted">
                      {d.speciality}
                      {d.qualification ? ` · ${d.qualification}` : ''}
                    </p>
                    <p className="break-all text-sm text-muted">{d.user?.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={d.status} map={VERIFICATION_STATUS} />
                      {d.unavailableToday && <Badge tone="bad">Not available today</Badge>}
                      {!d.schedule?.length && <Badge tone="warn">No timings set</Badge>}
                    </div>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-page p-2">
                    <dt className="text-xs text-muted">Fee</dt>
                    <dd className="font-bold">₹{d.fees}</dd>
                  </div>
                  <div className="rounded-lg bg-page p-2">
                    <dt className="text-xs text-muted">Experience</dt>
                    <dd className="font-bold">{d.experienceYears || 0} yrs</dd>
                  </div>
                  <div className="rounded-lg bg-page p-2">
                    <dt className="text-xs text-muted">Visit</dt>
                    <dd className="font-bold">{d.slotMinutes} min</dd>
                  </div>
                </dl>
                <div className="mt-2">
                  {d.ratingCount > 0 ? <StarRating value={d.ratingAvg} count={d.ratingCount} size={16} showValue /> : <span className="text-sm text-muted">No reviews yet</span>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {d.status === 'verified' && (
                    <Button size="sm" variant="outline" to={`/clinic/queue?doctor=${d._id}`}>
                      Live queue
                    </Button>
                  )}
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setRemoveTarget(d)}>
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove this doctor?"
        message={
          removeTarget
            ? `${removeTarget.user?.name} will no longer be listed at your clinic and patients cannot book them here. Appointments that are already booked are NOT cancelled, so please tell those patients yourself.`
            : ''
        }
        confirmLabel="Yes, remove"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(removeTarget._id)}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}