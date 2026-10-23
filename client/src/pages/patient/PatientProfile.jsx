import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Plus, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import { ErrorState } from '@/components/common/EmptyState.jsx';
import { Input, Select } from '@/components/common/FormField.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getPatientProfile, updatePatientProfile } from '@/services/patient.service.js';
import { getErrorMessage, getFieldErrors } from '@/utils/apiError.js';
import { APP_NAME, BLOOD_GROUPS, GENDERS } from '@/utils/constants.js';

const MAX_TAGS = 20;

// Type a word, press Enter or "Add". Each one becomes a small label that can be removed.
function TagInput({ label, hint, values, onChange, placeholder }) {
  const id = useId();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState('');

  const add = () => {
    const t = text.trim().replace(/,+$/, '').trim();
    if (!t) return;
    if (t.length < 2) return setProblem('Please write at least 2 letters.');
    if (t.length > 60) return setProblem('That is too long. Please keep it under 60 letters.');
    if (values.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setText('');
      return setProblem('');
    }
    if (values.length >= MAX_TAGS) return setProblem(`You can add up to ${MAX_TAGS} items.`);
    onChange([...values, t]);
    setText('');
    return setProblem('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-soft py-1 pl-3 pr-1 text-sm font-semibold">
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Remove ${v}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-bad hover:bg-bad-soft"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className="input flex-1"
          placeholder={placeholder}
          value={text}
          maxLength={60}
          onChange={(e) => {
            setText(e.target.value);
            setProblem('');
          }}
          onKeyDown={onKeyDown}
        />
        <Button variant="outline" icon={Plus} onClick={add} aria-label={`Add to ${label}`}>
          Add
        </Button>
      </div>
      {problem ? (
        <p role="alert" className="field-error">
          {problem}
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </div>
  );
}

export default function PatientProfile() {
  const queryClient = useQueryClient();
  const { reloadMe } = useAuth();
  const [allergies, setAllergies] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [tagsDirty, setTagsDirty] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    document.title = `My profile - ${APP_NAME}`;
  }, []);

  const q = useQuery({ queryKey: ['patient-profile'], queryFn: getPatientProfile });
  const patient = q.data?.patient;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ mode: 'onTouched', defaultValues: { name: '', age: '', gender: '', bloodGroup: '' } });

  // Fill the form when the profile arrives (and again after every save)
  useEffect(() => {
    if (!patient) return;
    reset({
      name: patient.name || '',
      age: patient.age ?? '',
      gender: patient.gender || '',
      bloodGroup: patient.medical?.bloodGroup || '',
    });
    setAllergies(patient.medical?.allergies || []);
    setConditions(patient.medical?.conditions || []);
    setTagsDirty(false);
  }, [patient, reset]);

  const onSubmit = async (v) => {
    setFormError('');
    const body = { name: v.name.trim(), bloodGroup: v.bloodGroup || null, allergies, conditions };
    if (v.age !== '' && v.age != null) body.age = Number(v.age);
    if (v.gender) body.gender = v.gender;

    try {
      const d = await updatePatientProfile(body);
      queryClient.setQueryData(['patient-profile'], { success: true, patient: d.patient });
      await reloadMe().catch(() => {}); // refreshes the name in the menu
      toast.success('Profile updated');
    } catch (err) {
      Object.entries(getFieldErrors(err)).forEach(([key, message]) => {
        if (['name', 'age', 'gender', 'bloodGroup'].includes(key)) setError(key, { message });
      });
      setFormError(getErrorMessage(err));
    }
  };

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (q.isError) return <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My profile</h1>
        <p className="text-muted">Keep this up to date. It helps your doctor treat you safely.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <section className="card space-y-4">
          <h2 className="text-xl font-bold">About you</h2>

          <div>
            <p className="label">Mobile number</p>
            <p className="flex flex-wrap items-center gap-2">
              <b className="text-lg">+91 {patient.phone}</b>
              {patient.phoneVerifiedAt ? (
                <Badge tone="ok">
                  <BadgeCheck size={14} aria-hidden="true" /> Verified
                </Badge>
              ) : (
                <Badge tone="warn">Not verified yet</Badge>
              )}
            </p>
            <p className="hint">You log in with this number. It cannot be changed here.</p>
          </div>

          <Input
            label="Full name"
            required
            autoComplete="name"
            {...register('name', {
              required: 'Enter your name',
              minLength: { value: 2, message: 'Name is too short' },
              maxLength: { value: 80, message: 'Name is too long' },
            })}
            error={errors.name?.message}
          />

          <div className="grid gap-4 xs:grid-cols-3">
            <Input
              label="Age"
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              {...register('age', {
                validate: (v) => v === '' || (/^\d+$/.test(String(v)) && Number(v) <= 120) || 'Enter your age (0 to 120)',
              })}
              error={errors.age?.message}
            />
            <Select label="Gender" {...register('gender')} error={errors.gender?.message}>
              <option value="">Not set</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
            <Select label="Blood group" {...register('bloodGroup')} error={errors.bloodGroup?.message}>
              <option value="">Not set</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-bold">Health information</h2>
          <TagInput
            label="Allergies"
            values={allergies}
            onChange={(v) => {
              setAllergies(v);
              setTagsDirty(true);
            }}
            placeholder="For example: Penicillin"
            hint="Medicines, food or anything you are allergic to. Press Enter to add."
          />
          <TagInput
            label="Past or long-term conditions"
            values={conditions}
            onChange={(v) => {
              setConditions(v);
              setTagsDirty(true);
            }}
            placeholder="For example: Diabetes"
            hint="Things your doctor should know, like diabetes or high blood pressure."
          />
        </section>

        {formError && (
          <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
            {formError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} disabled={!isDirty && !tagsDirty}>
          Save changes
        </Button>
      </form>

      <section className="card bg-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck size={26} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-bold">Who can see this?</p>
            <p className="mt-1 text-muted">
              Your allergies and conditions are visible only to a doctor you have an appointment with. A clinic cannot
              see them. You can always check who looked at your information in your{' '}
              <Link to="/patient/access-log" className="font-semibold text-brand underline">
                access log
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}