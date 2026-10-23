import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';
import FileInput from '@/components/auth/FileInput.jsx';
import FormField from '@/components/common/FormField.jsx';
import { clinicResubmit, doctorResubmit } from '@/services/auth.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';

const KINDS = {
  doctor: { label: 'Doctor', doc: 'medical certificate', field: 'certificate', send: doctorResubmit },
  clinic: { label: 'Clinic or hospital', doc: 'clinic licence', field: 'licence', send: clinicResubmit },
};

export default function ResubmitDocument() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') === 'clinic' ? 'clinic' : 'doctor';
  const kind = KINDS[role];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = `Send your document again - ${APP_NAME}`;
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter the email you registered with';
    if (!password) next.password = 'Enter your password';
    if (!files.length) next.file = `Please choose your new ${kind.doc}`;
    setErrors(next);
    if (Object.keys(next).length) return;

    const fd = new FormData();
    fd.append('email', email.trim().toLowerCase());
    fd.append('password', password);
    fd.append(kind.field, files[0]);

    setBusy(true);
    try {
      await kind.send(fd);
      setDone(true);
    } catch (err) {
      setErrors({ general: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="container-page flex justify-center py-10">
        <div className="card max-w-lg text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CircleCheck size={34} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-bold">Document sent again</h1>
          <p className="mt-2 text-muted">Our team will review your application again. You can log in after it is approved.</p>
          <div className="mt-5 flex flex-col gap-2 xs:flex-row xs:justify-center">
            <Button to="/">Back to home</Button>
            <Button to={`/login?role=${role}`} variant="outline">
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card shadow-card">
          <h1 className="text-2xl font-bold">Send your document again</h1>
          <p className="mt-1 text-sm text-muted">
            If our team rejected your application, fix the problem and send the {kind.doc} again. Use the email and password you registered with.
          </p>

          <div role="tablist" aria-label="Who are you" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-soft p-1">
            {Object.entries(KINDS).map(([key, k]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={role === key}
                onClick={() => {
                  setParams({ role: key }, { replace: true });
                  setFiles([]);
                  setErrors({});
                }}
                className={clsx(
                  'min-h-[44px] rounded-lg text-sm font-semibold',
                  role === key ? 'bg-card text-brand shadow' : 'text-muted'
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            <FormField label="Email" htmlFor="rs-email" error={errors.email} required>
              <input
                id="rs-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
              />
            </FormField>
            <FormField label="Password" htmlFor="rs-password" error={errors.password} required>
              <input
                id="rs-password"
                type="password"
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errors.password ? true : undefined}
              />
            </FormField>
            <FileInput
              label={`New ${kind.doc}`}
              required
              allowPdf
              files={files}
              onChange={(f) => {
                setFiles(f);
                setErrors((e) => ({ ...e, file: undefined }));
              }}
              hint="JPG, PNG or PDF, up to 5 MB."
              error={errors.file}
            />

            {errors.general && (
              <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
                {errors.general}
              </p>
            )}

            <Button type="submit" block loading={busy}>
              Send document
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Back to{' '}
          <Link to={`/login?role=${role}`} className="font-semibold text-brand hover:underline">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}