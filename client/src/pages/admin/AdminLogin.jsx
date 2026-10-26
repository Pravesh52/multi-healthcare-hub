import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from '@/components/common/Logo.jsx';
import Button from '@/components/common/Button.jsx';
import EmailLoginForm from '@/components/auth/EmailLoginForm.jsx';
import useAuth from '@/hooks/useAuth.js';
import { APP_NAME } from '@/utils/constants.js';

export default function AdminLogin() {
  const { user, logout } = useAuth();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = `Admin login - ${APP_NAME}`;
  }, []);

  const onSuccess = async (u) => {
    if (u.role !== 'admin') {
      await logout();
      setNotice('This is not an admin account. Please use the normal login page for your role.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-10 pt-safe pb-safe">
      <Logo to="/" />
      <div className="card mt-6 w-full max-w-md shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-brand">
            <ShieldCheck size={26} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Admin login</h1>
            <p className="text-sm text-muted">For the {APP_NAME} team only.</p>
          </div>
        </div>

        {user ? (
          <div className="mt-5 space-y-3">
            <p role="status" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              You are logged in as <b>{user.name}</b> ({user.role}). Please log out first to use the admin login.
            </p>
            <Button block variant="outline" onClick={logout}>
              Log out
            </Button>
          </div>
        ) : (
          <div className="mt-5">
            {notice && (
              <p role="alert" className="mb-4 rounded-xl bg-bad-soft p-3 text-sm font-medium text-bad">
                {notice}
              </p>
            )}
            <EmailLoginForm role="admin" showResubmit={false} onSuccess={onSuccess} />
          </div>
        )}
      </div>
      <Link to="/" className="mt-4 text-sm font-semibold text-brand hover:underline">
        Back to the website
      </Link>
    </div>
  );
}