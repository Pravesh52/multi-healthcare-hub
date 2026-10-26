import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import { Input, Select, Textarea } from '@/components/common/FormField.jsx';
import { addWalkIn } from '@/services/queue.service.js';
import { getErrorMessage, getFieldErrors } from '@/utils/apiError.js';
import { GENDERS } from '@/utils/constants.js';

const FIELDS = ['doctorId', 'name', 'phone', 'age', 'gender', 'reason'];

export default function WalkInForm({ doctors = [], defaultDoctorId = '', onCreated }) {
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      doctorId: defaultDoctorId || doctors[0]?._id || '',
      name: '',
      phone: '',
      age: '',
      gender: '',
      reason: '',
      emergency: false,
    },
  });

  const doctorId = watch('doctorId');
  const doctor = doctors.find((d) => d._id === doctorId);
  const emergency = watch('emergency');

  const onSubmit = async (v) => {
    setFormError('');
    const body = { doctorId: v.doctorId, name: v.name.trim(), phone: v.phone, emergency: !!v.emergency };
    if (v.age !== '') body.age = Number(v.age);
    if (v.gender) body.gender = v.gender;
    if (v.reason.trim()) body.reason = v.reason.trim();

    try {
      const d = await addWalkIn(body);
      onCreated({ appointment: d.appointment, message: d.message, name: body.name, phone: body.phone, doctor });
      reset({ doctorId: v.doctorId, name: '', phone: '', age: '', gender: '', reason: '', emergency: false });
    } catch (err) {
      Object.entries(getFieldErrors(err)).forEach(([key, message]) => {
        if (FIELDS.includes(key)) setError(key, { message });
      });
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Select label="Doctor" required {...register('doctorId', { required: 'Choose a doctor' })} error={errors.doctorId?.message}>
        {doctors.map((d) => (
          <option key={d._id} value={d._id}>
            {d.user?.name} · {d.speciality}
            {d.unavailableToday ? ' (not available today)' : ''}
          </option>
        ))}
      </Select>

      {doctor?.unavailableToday && (
        <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm font-medium text-warn">
          {doctor.user?.name} is marked as not available today, so a token cannot be issued. Choose another doctor.
        </p>
      )}

      <Input
        label="Patient name"
        required
        autoComplete="off"
        maxLength={80}
        {...register('name', {
          required: "Enter the patient's name",
          minLength: { value: 2, message: 'Name is too short' },
        })}
        error={errors.name?.message}
      />
      <Input
        label="Mobile number"
        type="tel"
        required
        inputMode="numeric"
        maxLength={10}
        placeholder="10-digit number"
        hint="The patient can log in with this number to see the queue."
        {...register('phone', {
          required: 'Enter the mobile number',
          pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
        })}
        error={errors.phone?.message}
      />
      <div className="grid gap-4 xs:grid-cols-2">
        <Input
          label="Age (optional)"
          type="number"
          inputMode="numeric"
          min="0"
          max="120"
          {...register('age', {
            validate: (v) => v === '' || (/^\d+$/.test(String(v)) && Number(v) <= 120) || 'Enter an age from 0 to 120',
          })}
          error={errors.age?.message}
        />
        <Select label="Gender (optional)" {...register('gender')} error={errors.gender?.message}>
          <option value="">Not set</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        label="Reason for the visit (optional)"
        rows={2}
        maxLength={300}
        placeholder="For example: fever for 2 days"
        {...register('reason')}
        error={errors.reason?.message}
      />

      <label className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 ${emergency ? 'border-bad bg-bad-soft' : 'border-line'}`}>
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-cross))]" {...register('emergency')} />
        <span>
          <b>This is an emergency</b>
          <span className="block text-sm text-muted">The patient is placed at the front of the queue.</span>
        </span>
      </label>

      {formError && (
        <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
          {formError}
        </p>
      )}

      <Button type="submit" block icon={UserPlus} loading={isSubmitting} disabled={!doctors.length || !!doctor?.unavailableToday}>
        Issue a token
      </Button>
    </form>
  );
}