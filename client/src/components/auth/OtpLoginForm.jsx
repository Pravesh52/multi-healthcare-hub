import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import FormField, { Input, Select } from '@/components/common/FormField.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getErrorMessage, isSignupRequired } from '@/utils/apiError.js';
import { GENDERS } from '@/utils/constants.js';

const PHONE_RE = /^[6-9]\d{9}$/;
const COOLDOWN = 30; // the server allows a new OTP after 30 seconds

const cleanPhone = (raw) => {
  let d = String(raw).replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
};

export default function OtpLoginForm({ onSuccess }) {
  const { sendOtp, verifyOtp } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [newUser, setNewUser] = useState(false);
  const [demo, setDemo] = useState(null); // { otp, notice }
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState({});

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [consent, setConsent] = useState(false);

  const otpRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (sent) otpRef.current?.focus();
  }, [sent]);
  useEffect(() => {
    if (newUser) nameRef.current?.focus();
  }, [newUser]);

  const reset = () => {
    setSent(false);
    setNewUser(false);
    setOtp('');
    setDemo(null);
    setInfo('');
    setErrors({});
    setCooldown(0);
  };

  const send = async () => {
    if (!PHONE_RE.test(phone)) {
      setErrors({ phone: 'Enter a valid 10-digit Indian mobile number' });
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const d = await sendOtp(phone);
      setSent(true);
      setOtp('');
      setDemo(d.demoOtp ? { otp: d.demoOtp, notice: d.demoNotice } : null);
      setInfo(d.demoOtp ? '' : d.message || 'OTP sent to your mobile');
      setCooldown(COOLDOWN);
    } catch (err) {
      setErrors({ general: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^\d{6}$/.test(otp)) next.otp = 'Enter the 6-digit OTP';
    if (newUser) {
      if (name.trim().length < 2) next.name = 'Enter your full name';
      const n = Number(age);
      if (!age || !Number.isInteger(n) || n < 0 || n > 120) next.age = 'Enter your age (0 to 120)';
      if (!gender) next.gender = 'Choose your gender';
      if (!consent) next.consent = 'You must accept the privacy policy to create an account';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setVerifying(true);
    try {
      const payload = { phone, otp, ...(newUser ? { name: name.trim(), age: Number(age), gender, consent: true } : {}) };
      const res = await verifyOtp(payload);
      toast.success(res.isNew ? 'Your account is ready. Welcome!' : 'Welcome back!');
      onSuccess?.(res.user, res.isNew);
    } catch (err) {
      if (isSignupRequired(err)) {
        // A new number: ask for the details. The OTP is not used up.
        setNewUser(true);
        setInfo('This number is new. Please complete your details to create your account.');
      } else {
        const message = getErrorMessage(err);
        const otpProblem = /otp|attempt/i.test(message);
        setErrors(otpProblem ? { otp: message } : { general: message });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Mobile number" htmlFor="login-phone" error={errors.phone} required>
        <div className="flex gap-2">
          <span className="flex min-h-[44px] items-center rounded-lg border border-line bg-soft px-3 font-semibold text-muted">+91</span>
          <input
            id="login-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            className="input flex-1"
            value={phone}
            readOnly={sent}
            maxLength={14}
            onChange={(e) => setPhone(cleanPhone(e.target.value))}
            aria-invalid={errors.phone ? true : undefined}
          />
          {sent ? (
            <Button variant="ghost" size="sm" onClick={reset} aria-label="Change mobile number">
              Change
            </Button>
          ) : null}
        </div>
      </FormField>

      {!sent && (
        <Button block loading={sending} onClick={send}>
          Send OTP
        </Button>
      )}

      <Input
        ref={otpRef}
        label="OTP"
        required
        id="login-otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={sent ? 'Enter the 6-digit OTP' : 'Send the OTP first'}
        maxLength={6}
        disabled={!sent}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        error={errors.otp}
        inputClassName="tracking-[0.3em]"
      />

      {demo && (
        <div role="status" className="rounded-xl border-2 border-dashed border-warn bg-warn-soft p-3">
          <p className="text-sm font-semibold text-warn">{demo.notice || 'Demo mode: this OTP is shown here only for the demo.'}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-3xl font-bold tracking-[0.3em] text-ink tabular-nums">{demo.otp}</span>
            <Button variant="outline" size="sm" onClick={() => setOtp(demo.otp)}>
              Fill it in
            </Button>
          </div>
        </div>
      )}

      {sent && (
        <p className="text-sm text-muted">
          {cooldown > 0 ? (
            <>Resend OTP in {cooldown} seconds</>
          ) : (
            <button type="button" onClick={send} disabled={sending} className="font-semibold text-brand hover:underline">
              Resend OTP
            </button>
          )}
        </p>
      )}

      {info && (
        <p role="status" className="rounded-xl bg-soft p-3 text-sm">
          {info}
        </p>
      )}

      {newUser && (
        <fieldset className="space-y-4 rounded-xl border border-line p-4">
          <legend className="flex items-center gap-2 px-2 font-bold">
            <UserPlus size={18} className="text-brand" aria-hidden="true" /> Create your account
          </legend>
          <Input
            ref={nameRef}
            label="Full name"
            required
            autoComplete="name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div className="grid gap-4 xs:grid-cols-2">
            <Input
              label="Age"
              required
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              error={errors.age}
            />
            <Select label="Gender" required value={gender} onChange={(e) => setGender(e.target.value)} error={errors.gender}>
              <option value="">Choose</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[rgb(var(--c-brand))]"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={errors.consent ? true : undefined}
              />
              <span className="text-sm">
                I have read and accept the{' '}
                <Link to="/privacy" target="_blank" className="font-semibold text-brand underline">
                  privacy policy
                </Link>
                .
              </span>
            </label>
            {errors.consent && (
              <p role="alert" className="field-error">
                {errors.consent}
              </p>
            )}
          </div>
        </fieldset>
      )}

      {errors.general && (
        <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
          {errors.general}
        </p>
      )}

      <Button type="submit" block loading={verifying} disabled={!sent || otp.length !== 6}>
        {newUser ? 'Create account and continue' : 'Verify and continue'}
      </Button>
    </form>
  );
}