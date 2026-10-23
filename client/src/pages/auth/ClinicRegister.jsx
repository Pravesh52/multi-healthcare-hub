import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import FileInput from '@/components/auth/FileInput.jsx';
import LocationPicker from '@/components/auth/LocationPicker.jsx';
import { Input, Select, Textarea } from '@/components/common/FormField.jsx';
import { clinicSignup } from '@/services/auth.service.js';
import { getDistricts, getStates } from '@/services/location.service.js';
import { getErrorMessage, getFieldErrors, getStatus } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';
import { CLINIC_TYPES } from '@/data/specialities.js';

const FIELDS = ['name', 'email', 'password', 'clinicName', 'type', 'regNo', 'phone', 'address', 'state', 'district', 'pincode', 'openTime', 'closeTime', 'consent'];

const passwordRules = (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Use at least one letter and one number';

export default function ClinicRegister() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirm: '',
      clinicName: '',
      type: 'clinic',
      regNo: '',
      phone: '',
      address: '',
      state: '',
      district: '',
      pincode: '',
      openTime: '09:00',
      closeTime: '17:00',
      consent: false,
    },
  });

  const [position, setPosition] = useState(null);
  const [positionError, setPositionError] = useState('');
  const [licence, setLicence] = useState([]);
  const [licenceError, setLicenceError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    document.title = `Register your clinic - ${APP_NAME}`;
  }, []);

  const state = watch('state');
  const statesQ = useQuery({ queryKey: ['states'], queryFn: getStates, staleTime: Infinity });
  const districtsQ = useQuery({
    queryKey: ['districts', state],
    queryFn: () => getDistricts(state),
    enabled: !!state,
    staleTime: Infinity,
  });

  // Choose Madhya Pradesh first, as most of our clinics are there
  useEffect(() => {
    const list = statesQ.data;
    if (list?.length && !getValues('state')) setValue('state', list.includes('Madhya Pradesh') ? 'Madhya Pradesh' : list[0]);
  }, [statesQ.data, getValues, setValue]);

  const onSubmit = async (v) => {
    setFormError('');
    let blocked = false;
    if (!position) {
      setPositionError('Please place the pin on the map at your clinic');
      blocked = true;
    }
    if (!licence.length) {
      setLicenceError('Please upload your clinic licence or registration certificate');
      blocked = true;
    }
    if (blocked) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const fd = new FormData();
    fd.append('name', v.name.trim());
    fd.append('email', v.email.trim().toLowerCase());
    fd.append('password', v.password);
    fd.append('clinicName', v.clinicName.trim());
    fd.append('type', v.type);
    fd.append('regNo', v.regNo.trim());
    fd.append('phone', v.phone);
    fd.append('address', v.address.trim());
    fd.append('state', v.state);
    fd.append('district', v.district);
    if (v.pincode) fd.append('pincode', v.pincode);
    fd.append('lng', String(position.lng));
    fd.append('lat', String(position.lat));
    fd.append('openTime', v.openTime);
    fd.append('closeTime', v.closeTime);
    fd.append('consent', 'true');
    fd.append('licence', licence[0]);
    photos.forEach((p) => fd.append('photos', p));

    try {
      await clinicSignup(fd);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      Object.entries(fieldErrors).forEach(([key, message]) => {
        if (FIELDS.includes(key)) setError(key, { message });
        if (key === 'lat' || key === 'lng') setPositionError(message);
      });
      const message = getErrorMessage(err);
      if (getStatus(err) === 409) {
        if (/email/i.test(message)) setError('email', { message });
        if (/registration/i.test(message)) setError('regNo', { message });
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
            Our team will check your licence and details. Your clinic will appear in search, and you can log in, after it is approved.
          </p>
          <p className="mt-2 text-sm text-muted">
            After approval you can add your doctors using their email, set your weekly off days, and start taking appointments.
          </p>
          <div className="mt-5 flex flex-col gap-2 xs:flex-row xs:justify-center">
            <Button to="/">Back to home</Button>
            <Button to="/login?role=clinic" variant="outline">
              Clinic login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-8 sm:py-10">
      <div ref={topRef} className="scroll-mt-24" />
      <h1 className="text-3xl font-bold">Register your clinic or hospital</h1>
      <p className="mt-2 text-muted">
        Tell us about your clinic and upload your licence. Our team verifies every clinic before it appears in search.
        Already registered?{' '}
        <Link to="/login?role=clinic" className="font-semibold text-brand hover:underline">
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
          <legend className="sr-only">Owner account</legend>
          <h2 className="text-xl font-bold">1. Owner account</h2>
          <Input
            label="Owner's full name"
            required
            autoComplete="name"
            {...register('name', {
              required: "Enter the owner's name",
              minLength: { value: 2, message: 'Name is too short' },
              maxLength: { value: 80, message: 'Name is too long' },
            })}
            error={errors.name?.message}
          />
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
          <legend className="sr-only">Clinic details</legend>
          <h2 className="text-xl font-bold">2. Clinic details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Clinic or hospital name"
              required
              {...register('clinicName', {
                required: 'Enter the name of your clinic',
                minLength: { value: 2, message: 'Name is too short' },
                maxLength: { value: 120, message: 'Name is too long' },
              })}
              error={errors.clinicName?.message}
            />
            <Select label="Type" required {...register('type', { required: 'Choose a type' })} error={errors.type?.message}>
              {CLINIC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Registration or licence number"
              required
              {...register('regNo', {
                required: 'Enter your registration number',
                minLength: { value: 3, message: 'Registration number is too short' },
              })}
              error={errors.regNo?.message}
            />
            <Input
              label="Clinic phone"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit number"
              hint="Patients can call this number."
              {...register('phone', {
                required: 'Enter the clinic phone number',
                pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
              })}
              error={errors.phone?.message}
            />
          </div>
          <Textarea
            label="Full address"
            required
            rows={2}
            placeholder="Shop number, street, area, nearby landmark"
            {...register('address', {
              required: 'Enter the address',
              minLength: { value: 5, message: 'Address is too short' },
              maxLength: { value: 200, message: 'Address is too long' },
            })}
            error={errors.address?.message}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="State"
              required
              {...register('state', { required: 'Choose a state', onChange: () => setValue('district', '') })}
              error={errors.state?.message}
            >
              <option value="">{statesQ.isLoading ? 'Loading...' : 'Choose'}</option>
              {(statesQ.data || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              label="District"
              required
              disabled={!state}
              {...register('district', { required: 'Choose a district' })}
              error={errors.district?.message}
            >
              <option value="">{districtsQ.isLoading ? 'Loading...' : 'Choose'}</option>
              {(districtsQ.data || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Input
              label="Pincode (optional)"
              inputMode="numeric"
              maxLength={6}
              {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Pincode must be 6 digits' } })}
              error={errors.pincode?.message}
            />
          </div>
          {statesQ.isError && (
            <p role="alert" className="field-error">
              Could not load the list of states. Please check your connection and reload the page.
            </p>
          )}
        </fieldset>

        <fieldset className="card space-y-3">
          <legend className="sr-only">Location on the map</legend>
          <h2 className="text-xl font-bold">3. Location on the map</h2>
          <p className="text-sm text-muted">
            Place the pin exactly where your clinic is. Patients near you find your clinic through this pin, and use it for directions.
          </p>
          <LocationPicker
            value={position}
            onChange={(p) => {
              setPosition(p);
              setPositionError('');
            }}
            error={positionError}
          />
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="sr-only">Timings</legend>
          <h2 className="text-xl font-bold">4. Timings</h2>
          <div className="grid gap-4 xs:grid-cols-2">
            <Input label="Opens at" type="time" required {...register('openTime', { required: 'Choose the opening time' })} error={errors.openTime?.message} />
            <Input
              label="Closes at"
              type="time"
              required
              {...register('closeTime', {
                required: 'Choose the closing time',
                validate: (v) => v > watch('openTime') || 'Closing time must be after the opening time',
              })}
              error={errors.closeTime?.message}
            />
          </div>
          <p className="hint">You can set your weekly off day after you log in.</p>
        </fieldset>

        <fieldset className="card space-y-4">
          <legend className="sr-only">Documents</legend>
          <h2 className="text-xl font-bold">5. Documents and photos</h2>
          <FileInput
            label="Clinic licence or registration certificate"
            required
            allowPdf
            files={licence}
            onChange={(f) => {
              setLicence(f);
              setLicenceError('');
            }}
            hint="JPG, PNG or PDF, up to 5 MB. Only our team can see it."
            error={licenceError}
          />
          <FileInput
            label="Clinic photos (optional)"
            multiple
            maxFiles={3}
            files={photos}
            onChange={setPhotos}
            hint="Up to 3 photos of your clinic. Patients will see them."
          />
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