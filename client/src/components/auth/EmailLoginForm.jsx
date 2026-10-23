import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import FormField from '@/components/common/FormField.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getErrorMessage, getStatus } from '@/utils/apiError.js';

// Different words for the account states the server can answer with
const buildNotice = (err) => {
  const message = getErrorMessage(err);
  const lower = message.toLowerCase();
  if (getStatus(err) === 403 && lower.includes('rejected')) return { kind: 'rejected', message };
  if (getStatus(err) === 403 && lower.includes('pending')) return { kind: 'pending', message };
  if (getStatus(err) === 403 && lower.includes('suspended')) return { kind: 'suspended', message };
  return { kind: 'error', message };
};

export default function EmailLoginForm({ role = 'doctor', onSuccess, showResubmit = true }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setNotice(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await login({ email: email.trim().toLowerCase(), password });
      onSuccess?.(res.user);
    } catch (err) {
      setNotice(buildNotice(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Email" htmlFor={`${role}-email`} error={errors.email} required>
        <input
          id={`${role}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
        />
      </FormField>

      <FormField label="Password" htmlFor={`${role}-password`} error={errors.password} required>
        <div className="relative">
          <input
            id={`${role}-password`}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            className="input pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-soft"
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </FormField>

      {notice && (
        <div
          role="alert"
          className={`rounded-xl p-3 text-sm ${notice.kind === 'pending' ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'}`}
        >
          <p className="font-semibold">{notice.message}</p>
          {notice.kind === 'pending' && (
            <p className="mt-1 font-normal">Our team is checking your documents. You can log in as soon as they are approved.</p>
          )}
          {notice.kind === 'rejected' && (
            <p className="mt-1 font-normal">
              You can fix the problem and send the document again:{' '}
              <Link to={`/resubmit?role=${role}`} className="font-semibold underline">
                Resubmit documents
              </Link>
            </p>
          )}
        </div>
      )}

      <Button type="submit" block loading={busy}>
        Login
      </Button>

      {showResubmit && (
        <p className="text-center text-sm text-muted">
          Application rejected?{' '}
          <Link to={`/resubmit?role=${role}`} className="font-semibold text-brand hover:underline">
            Send your document again
          </Link>
        </p>
      )}
    </form>
  );
}