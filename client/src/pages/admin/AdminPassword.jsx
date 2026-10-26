import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button.jsx';
import { Input } from '@/components/common/FormField.jsx';
import { changeAdminPassword } from '@/services/admin.service.js';
import { setAccessToken } from '@/services/api.js';
import { getErrorMessage, getFieldErrors } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';

export default function AdminPassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `Password - Admin - ${APP_NAME}`;
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!current) found.current = 'Enter your current password';
    if (next.length < 10) found.next = 'The new password must be at least 10 characters';
    else if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) found.next = 'Use at least one letter and one number';
    else if (next === current) found.next = 'The new password must be different from the old one';
    if (again !== next) found.again = 'The two passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const d = await changeAdminPassword({ currentPassword: current, newPassword: next });
      if (d.accessToken) setAccessToken(d.accessToken); // the old token stopped working, keep this browser logged in
      toast.success('Password changed');
      setCurrent('');
      setNext('');
      setAgain('');
    } catch (err) {
      const fields = getFieldErrors(err);
      setErrors({
        current: /current/i.test(getErrorMessage(err)) ? getErrorMessage(err) : fields.currentPassword,
        next: fields.newPassword,
        general: !/current/i.test(getErrorMessage(err)) && !Object.keys(fields).length ? getErrorMessage(err) : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Change password</h1>
        <p className="text-muted">Use a long password that you do not use anywhere else.</p>
      </div>

      <form onSubmit={submit} noValidate className="card space-y-4">
        <Input
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
        />
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a number."
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
        />
        <Input
          label="New password again"
          type="password"
          required
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          error={errors.again}
        />
        {errors.general && (
          <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
            {errors.general}
          </p>
        )}
        <Button type="submit" icon={KeyRound} loading={busy}>
          Change password
        </Button>
      </form>

      <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
        <b>Remember:</b> your first admin password is kept in the <code>.env</code> file of the server. If you run{' '}
        <code>npm run seed</code> again, the password goes back to the one in that file. After changing it here, also update{' '}
        <code>ADMIN_PASSWORD</code> in <code>.env</code> (and on your hosting website when you deploy).
      </p>
    </div>
  );
}