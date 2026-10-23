import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CircleCheck } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import FileInput from '@/components/auth/FileInput.jsx';
import { Input, Select } from '@/components/common/FormField.jsx';
import { doctorSignup } from '@/services/auth.service.js';
import { getErrorMessage, getFieldErrors, getStatus } from '@/utils/apiError.js';
import { APP_NAME, GENDERS } from '@/utils/constants.js';
import { SPECIALITIES } from '@/data/specialities.js';

const FIELDS = ['name', 'email', 'phone', 'password', 'gender', 'speciality', 'qualification', 'medRegNo', 'experienceYears', 'fees', 'consent'];

const passwordRules = (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least one letter and one number';

export default function DoctorRegister() {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirm: '',
      gender: '',
      speciality: '',
      specialityOther: '',
      qualification: '',
      medRegNo: '',
      experienceYears: '',
      fees: '',
      consent: false,
    },
  });

  const [certificate, setCertificate] = useState([]);
  const [photo, setPhoto] = useState([]);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    document.title = `Register as a doctor - ${APP_NAME}`;
  }, []);

  const speciality = watch('speciality');

  const onSubmit = async (v) => {
    setFormError('');
    if (!certificate.length) {
      setFileError('Please upload your medical certificate');
      return;
    }

    const fd = new FormData();
    fd.append('name', v.name.trim());
    fd.append('email', v.email.trim().toLowerCase());
    if (v.phone) fd.append('phone', v.phone);
    fd.append('password', v.password);
    fd.append('gender', v.gender);
    fd.append('speciality', v.speciality === 'Other' ? v.specialityOther.trim() : v.speciality);
    fd.append('qualification', v.qualification.trim());
    fd.append('medRegNo', v.medRegNo.trim());
    fd.append('experienceYears', String(Number(v.experienceYears)));
    fd.append('fees', String(Number(v.fees)));
    fd.append('consent', 'true');
    fd.append('certificate', certificate[0]);
    if (photo[0]) fd.append('photo', photo[0]);

    try {
      await doctorSignup(fd);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      Object.entries(fieldErrors).forEach(([key, message]) => {
        if (FIELDS.includes(key)) setError(key, { message });
      });
      const message = getErrorMessage(err);
      if (getStatus(err) === 409) {
        if (/email/i.test(message)) setError('email', { message });
        if (/registration/i.test(message)) setError('medRegNo', { message });
      }
      setFormError(message);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (done) {
    return (
      <div className="container-page flex justify-center py-10">
        <div className="card max-w-lg text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CircleCheck size={34} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Application received</h1>
          <p className="mt-2 text-muted">
            Our team will check your medical registration number and certificate. You can log in only after your account
            is approved.
          </p>
          <p className="mt-2 text-sm text-muted">
            After approval, a clinic or hospital owner can add you to their list using your email, and patients will be
            able to book you.
          </p>
          <div className="mt-5 flex flex-col gap-2 xs:flex-row xs:justify-center">
            <Button to="/">Back to home</Button>
            <Button to="/login?role=doctor" variant="outline">
              Doctor login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <div ref={topRef} className="scroll-mt-24" />
      <h1 className="text-3xl font-bold">Register as a doctor</h1>
      <p className="mt-2 text-muted">
        Fill in your details and upload your medical certificate. Our team verifies every doctor before they appear in
        search. Already registered?{' '}
        <Link to="/login?role=doctor" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>

      {formError && (
        <p role="alert" className="mt-4 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-6">
        <fieldset className="card space-y-4">
          <legend className="sr-only">Account</legend>
          <h2 className="text-xl font-bold">1. Your account</h2>
          <Input
            label="Full name"
            required
            autoComplete="name"
            placeholder="Dr. Anita Sharma"
            {...register('name', {
              required: 'Enter your full name',
              minLength: { value: 2, message: 'Name is too short' },
              maxLength: { value: 80, message: 'Name is too long' },
            })}
            error={errors.name?.message}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              hint="You will log in with this email."
              {...register('email', {
                required: 'Enter your email address',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
              })}
              error={errors.email?.message}
            />
            <Input
              label="Mobile number (optional)"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit number"
              {...register('phone', { pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' } })}
              error={errors.phone?.message}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              {...register('password', {
                required: 'Choose a password',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                maxLength: { value: 64, message: 'Password is too long' },
                validate: passwordRules,
              })}
              error={errors.password?.message}
            />
            <Input
              label="Confirm password"
              type="password"
              required
              autoComplete="new-password"
              {...register('confirm', {
                required: 'Type your password again',
                validate: (v) => v === watch('password') || 'The two passwords do not match',
              })}
              error={errors.confirm?.message}
            />
          </div>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="sr-only">Professional details</legend>
          <h2 className="text-xl font-bold">2. Professional details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Gender" required {...register('gender', { required: 'Choose your gender' })} error={errors.gender?.message}>
              <option value="">Choose</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
            <Select label="Speciality" required {...register('speciality', { required: 'Choose your speciality' })} error={errors.speciality?.message}>
              <option value="">Choose</option>
              {SPECIALITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Other">Other (type below)</option>
            </Select>
          </div>
          {speciality === 'Other' && (
            <Input
              label="Your speciality"
              required
              placeholder="For example: Pulmonologist"
              {...register('specialityOther', {
                validate: (v) => v.trim().length >= 2 || 'Type your speciality',
              })}
              error={errors.specialityOther?.message}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Qualification"
              required
              placeholder="MBBS, MD"
              {...register('qualification', {
                required: 'Enter your qualification',
                minLength: { value: 2, message: 'Qualification is too short' },
              })}
              error={errors.qualification?.message}
            />
            <Input
              label="Medical registration number"
              required
              hint="The number on your medical council registration."
              {...register('medRegNo', {
                required: 'Enter your medical registration number',
                minLength: { value: 3, message: 'Registration number is too short' },
              })}
              error={errors.medRegNo?.message}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Years of experience"
              required
              type="number"
              inputMode="numeric"
              min="0"
              max="70"
              {...register('experienceYears', {
                required: 'Enter your years of experience (0 if new)',
                validate: (v) => (/^\d+$/.test(v) && Number(v) <= 70) || 'Enter whole years, from 0 to 70',
              })}
              error={errors.experienceYears?.message}
            />
            <Input
              label="Consultation fee (₹)"
              required
              type="number"
              inputMode="numeric"
              min="0"
              {...register('fees', {
                required: 'Enter your fee',
                validate: (v) => (/^\d+$/.test(v) && Number(v) <= 100000) || 'Enter the fee in rupees (up to 100000)',
              })}
              error={errors.fees?.message}
            />
          </div>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="sr-only">Documents</legend>
          <h2 className="text-xl font-bold">3. Documents</h2>
          <FileInput
            label="Medical certificate"
            required
            allowPdf
            files={certificate}
            onChange={(f) => {
              setCertificate(f);
              setFileError('');
            }}
            hint="JPG, PNG or PDF, up to 5 MB. Only our team can see it."
            error={fileError}
          />
          <FileInput label="Your photo (optional)" files={photo} onChange={setPhoto} hint="JPG or PNG, up to 5 MB. Patients will see this photo." />
        </fieldset>

        <div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-brand))]"
              {...register('consent', { required: 'You must accept the privacy policy' })}
            />
            <span className="text-sm">
              I confirm that the details and documents are true, and I accept the{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-brand underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errors.consent && (
            <p role="alert" className="field-error">
              {errors.consent.message}
            </p>
          )}
        </div>

        <Button type="submit" block loading={isSubmitting}>
          Submit for verification
        </Button>
        {isSubmitting && <p className="text-center text-sm text-muted">Uploading your documents. This can take a few seconds.</p>}
      </form>
    </div>
  );
}