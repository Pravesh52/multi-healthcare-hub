import { useEffect } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Building2, Smartphone, Stethoscope } from 'lucide-react';
import clsx from 'clsx';
import OtpLoginForm from '@/components/auth/OtpLoginForm.jsx';
import EmailLoginForm from '@/components/auth/EmailLoginForm.jsx';
import { PageSplash } from '@/routes/ProtectedRoute.jsx';
import useAuth from '@/hooks/useAuth.js';
import { APP_NAME, ROLE_HOME } from '@/utils/constants.js';

const TABS = [
  { key: 'patient', label: 'Patient', icon: Smartphone },
  { key: 'doctor', label: 'Doctor', icon: Stethoscope },
  { key: 'clinic', label: 'Clinic', icon: Building2 },
];

const TITLES = {
  patient: ['Patient login', 'Enter your mobile number. New here? We will create your account after you verify the OTP.'],
  doctor: ['Doctor login', 'Log in with the email and password you registered with.'],
  clinic: ['Clinic or hospital login', 'Log in with the email and password you registered with.'],
};

// Where to go after login
const landingFor = (role, from) => {
  const home = ROLE_HOME[role] || '/';
  const path = from?.pathname;
  if (!path || path === '/login') return home;
  const full = `${path}${from.search || ''}${from.hash || ''}`;
  if (role === 'patient') return /^\/(doctor|clinic|admin)(\/|$)/.test(path) ? home : full;
  return path.startsWith(home) ? full : home;
};

export default function Login() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { user, loading } = useAuth();

  const asked = params.get('role');
  const role = TABS.some((t) => t.key === asked) ? asked : 'patient';
  const from = location.state?.from;

  useEffect(() => {
    document.title = `Login - ${APP_NAME}`;
  }, []);

  if (loading) return <PageSplash />;
  if (user) return <Navigate to={landingFor(user.role, from)} replace />;

  const [title, help] = TITLES[role];

  return (
    <div className="container-page flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="card !p-0 overflow-hidden shadow-card">
          <div role="tablist" aria-label="Login as" className="grid grid-cols-3 border-b border-line bg-soft">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={role === key}
                aria-controls="login-panel"
                onClick={() => setParams({ role: key }, { replace: true, state: location.state })}
                className={clsx(
                  'flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-sm font-semibold transition-colors xs:flex-row xs:gap-2',
                  role === key ? 'bg-card text-brand' : 'text-muted hover:text-ink'
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${role}`} className="p-5 sm:p-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted">{help}</p>

            <div className="mt-5">
              {role === 'patient' ? <OtpLoginForm /> : <EmailLoginForm key={role} role={role} />}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          {role === 'patient' && (
            <>
              Are you a doctor or a clinic?{' '}
              <Link to="/register/doctor" className="font-semibold text-brand hover:underline">
                Register here
              </Link>
            </>
          )}
          {role === 'doctor' && (
            <>
              New doctor?{' '}
              <Link to="/register/doctor" className="font-semibold text-brand hover:underline">
                Register as a doctor
              </Link>
            </>
          )}
          {role === 'clinic' && (
            <>
              New clinic or hospital?{' '}
              <Link to="/register/clinic" className="font-semibold text-brand hover:underline">
                Register your clinic
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}