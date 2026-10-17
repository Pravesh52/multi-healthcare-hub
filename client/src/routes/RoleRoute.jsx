import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth.js';
import { ROLE_HOME } from '@/utils/constants.js';
import { PageSplash } from './ProtectedRoute.jsx';

export default function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageSplash />;
  if (!user) {
    const loginPath = roles.length === 1 && roles[0] === 'admin' ? '/admin' : '/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  return children ?? <Outlet />;
}