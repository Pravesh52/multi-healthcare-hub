import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth.js';
import useSocket from '@/hooks/useSocket.js';
import api from '@/services/api.js';
import { getErrorMessage, isSignupRequired } from '@/utils/apiError.js';
import ProtectedRoute, { PageSplash } from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

// ---------- helpers ----------
function ComingSoon() {
  const { pathname } = useLocation();
  return (
    <div className="container-page py-16 text-center">
      <div className="card mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Coming soon</h1>
        <p className="mt-2 text-muted">This page is not built yet.</p>
        <p className="mt-1 break-all text-sm text-muted">{pathname}</p>
      </div>
    </div>
  );
}

// A page that is still empty shows "Coming soon" instead of breaking the app
const page = (loader) => lazy(() => loader().then((m) => ({ default: m.default || ComingSoon })));
// Same idea for parts of the layout (their fallback is given)
const part = (loader, Fallback) => lazy(() => loader().then((m) => ({ default: m.default || Fallback })));

const Nothing = () => null;
const PassThrough = () => <Outlet />;

// ---------- layout parts (built in Step 3) ----------
const TopBar = part(() => import('@/components/layout/TopBar.jsx'), Nothing);
const Navbar = part(() => import('@/components/layout/Navbar.jsx'), Nothing);
const Footer = part(() => import('@/components/layout/Footer.jsx'), Nothing);
const DashboardLayout = part(() => import('@/components/layout/DashboardLayout.jsx'), PassThrough);

// ---------- pages ----------
const Home = page(() => import('@/pages/public/Home.jsx'));
const SearchResults = page(() => import('@/pages/public/SearchResults.jsx'));
const ClinicDetail = page(() => import('@/pages/public/ClinicDetail.jsx'));
const DoctorProfile = page(() => import('@/pages/public/DoctorProfile.jsx'));
const About = page(() => import('@/pages/public/About.jsx'));
const Contact = page(() => import('@/pages/public/Contact.jsx'));
const Privacy = page(() => import('@/pages/public/Privacy.jsx'));
const NotFound = page(() => import('@/pages/public/NotFound.jsx'));

const Login = page(() => import('@/pages/auth/Login.jsx'));
const DoctorRegister = page(() => import('@/pages/auth/DoctorRegister.jsx'));
const ClinicRegister = page(() => import('@/pages/auth/ClinicRegister.jsx'));
const ResubmitDocument = page(() => import('@/pages/auth/ResubmitDocument.jsx'));

const PatientOverview = page(() => import('@/pages/patient/PatientOverview.jsx'));
const MyAppointments = page(() => import('@/pages/patient/MyAppointments.jsx'));
const LiveQueue = page(() => import('@/pages/patient/LiveQueue.jsx'));
const Prescriptions = page(() => import('@/pages/patient/Prescriptions.jsx'));
const PatientProfile = page(() => import('@/pages/patient/PatientProfile.jsx'));
const AccessLog = page(() => import('@/pages/patient/AccessLog.jsx'));

const DoctorOverview = page(() => import('@/pages/doctor/DoctorOverview.jsx'));
const Requests = page(() => import('@/pages/doctor/Requests.jsx'));
const DoctorQueue = page(() => import('@/pages/doctor/DoctorQueue.jsx'));
const Schedule = page(() => import('@/pages/doctor/Schedule.jsx'));
const DoctorAnalytics = page(() => import('@/pages/doctor/DoctorAnalytics.jsx'));
const DoctorOwnProfile = page(() => import('@/pages/doctor/DoctorProfile.jsx'));

const ClinicOverview = page(() => import('@/pages/clinic/ClinicOverview.jsx'));
const ClinicDoctors = page(() => import('@/pages/clinic/ClinicDoctors.jsx'));
const ClinicQueue = page(() => import('@/pages/clinic/ClinicQueue.jsx'));
const WalkIn = page(() => import('@/pages/clinic/WalkIn.jsx'));
const ClinicAnalytics = page(() => import('@/pages/clinic/ClinicAnalytics.jsx'));
const ClinicProfile = page(() => import('@/pages/clinic/ClinicProfile.jsx'));

const AdminLogin = page(() => import('@/pages/admin/AdminLogin.jsx'));
const AdminOverview = page(() => import('@/pages/admin/AdminOverview.jsx'));
const VerifyDoctors = page(() => import('@/pages/admin/VerifyDoctors.jsx'));
const VerifyClinics = page(() => import('@/pages/admin/VerifyClinics.jsx'));
const Users = page(() => import('@/pages/admin/Users.jsx'));
const Reviews = page(() => import('@/pages/admin/Reviews.jsx'));
const AuditLogs = page(() => import('@/pages/admin/AuditLogs.jsx'));
const AdminPassword = page(() => import('@/pages/admin/AdminPassword.jsx'));

const NotificationsPage = page(() => import('@/pages/shared/NotificationsPage.jsx'));

// ---------- layouts ----------
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <TopBar />
        <Navbar />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={<PageSplash />}>
          <Outlet />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

// Dashboards: the menu comes from DashboardLayout (Step 3), `area` tells it which menu
function Dashboard({ area }) {
  return (
    <Suspense fallback={<PageSplash />}>
      <DashboardLayout area={area} />
    </Suspense>
  );
}

// /admin: the login page for anyone who is not an admin, the dashboard for the admin
function AdminShell() {
  const { user, loading } = useAuth();
  if (loading) return <PageSplash />;
  if (user?.role !== 'admin') {
    return (
      <Suspense fallback={<PageSplash />}>
        <AdminLogin />
      </Suspense>
    );
  }
  return <Dashboard area="admin" />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ---------- TEMPORARY: /dev (development only). Removed once the real Login page exists (Step 6) ----------
function DevCheck() {
  const { user, profile, loading, sendOtp, verifyOtp, login, logout } = useAuth();
  const { connected, unreadCount } = useSocket();
  const [health, setHealth] = useState('checking...');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get('/health')
      .then((r) => setHealth(`API ok. MongoDB: ${r.data.mongo}, Redis: ${r.data.redis}`))
      .catch((e) => setHealth(getErrorMessage(e)));
  }, []);

  const run = (fn) => async () => {
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg(getErrorMessage(e));
    }
  };

  const send = run(async () => {
    const d = await sendOtp(phone);
    setMsg(d.demoOtp ? `${d.demoNotice} OTP: ${d.demoOtp}` : d.message);
  });

  const verify = async () => {
    setMsg('');
    try {
      await verifyOtp({
        phone,
        otp,
        ...(needsName ? { name, age: 30, gender: 'male', consent: true } : {}),
      });
    } catch (e) {
      if (isSignupRequired(e)) {
        setNeedsName(true);
        setMsg('New number. Type a name and press Verify again to sign up.');
      } else setMsg(getErrorMessage(e));
    }
  };

  return (
    <div className="container-page max-w-2xl space-y-4 py-8">
      <h1 className="text-2xl font-bold">Developer check (temporary)</h1>

      <div className="card space-y-1 text-sm">
        <p>{health}</p>
        <p>
          Session: {loading ? 'checking...' : user ? `${user.name} (${user.role})` : 'not logged in'}
        </p>
        {profile && <p>Profile loaded: {profile.name || profile.speciality}</p>}
        <p>
          Socket: <b>{connected ? 'connected' : 'not connected'}</b> | Unread notifications: <b>{unreadCount}</b>
        </p>
        {user && (
          <button className="btn btn-outline btn-sm mt-2" onClick={logout}>
            Logout
          </button>
        )}
      </div>

      {!user && (
        <>
          <div className="card space-y-2">
            <h2 className="font-bold">Patient (OTP)</h2>
            <input className="input" placeholder="Mobile number" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={send}>Send OTP</button>
            <input className="input" placeholder="OTP" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} />
            {needsName && <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
            <button className="btn btn-primary btn-sm" onClick={verify}>Verify</button>
          </div>

          <div className="card space-y-2">
            <h2 className="font-bold">Doctor, clinic or admin (email)</h2>
            <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={run(() => login({ email, password }))}>Login</button>
          </div>
        </>
      )}

      {msg && <p className="card text-sm font-medium text-brand">{msg}</p>}
    </div>
  );
}

// ---------- the routes ----------
export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="clinics/:id" element={<ClinicDetail />} />
          <Route path="doctors/:id" element={<DoctorProfile />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />

          <Route path="login" element={<Login />} />
          <Route path="register/doctor" element={<DoctorRegister />} />
          <Route path="register/clinic" element={<ClinicRegister />} />
          <Route path="resubmit" element={<ResubmitDocument />} />

          {import.meta.env.DEV && <Route path="dev" element={<DevCheck />} />}
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="patient"
          element={
            <RoleRoute roles={['patient']}>
              <Dashboard area="patient" />
            </RoleRoute>
          }
        >
          <Route index element={<PatientOverview />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="queue" element={<LiveQueue />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="access-log" element={<AccessLog />} />
        </Route>

        <Route
          path="doctor"
          element={
            <RoleRoute roles={['doctor']}>
              <Dashboard area="doctor" />
            </RoleRoute>
          }
        >
          <Route index element={<DoctorOverview />} />
          <Route path="requests" element={<Requests />} />
          <Route path="queue" element={<DoctorQueue />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="analytics" element={<DoctorAnalytics />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<DoctorOwnProfile />} />
        </Route>

        <Route
          path="clinic"
          element={
            <RoleRoute roles={['clinic']}>
              <Dashboard area="clinic" />
            </RoleRoute>
          }
        >
          <Route index element={<ClinicOverview />} />
          <Route path="doctors" element={<ClinicDoctors />} />
          <Route path="queue" element={<ClinicQueue />} />
          <Route path="walk-in" element={<WalkIn />} />
          <Route path="analytics" element={<ClinicAnalytics />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ClinicProfile />} />
        </Route>

        <Route path="admin" element={<AdminShell />}>
          <Route index element={<AdminOverview />} />
          <Route path="doctors" element={<VerifyDoctors />} />
          <Route path="clinics" element={<VerifyClinics />} />
          <Route path="users" element={<Users />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="password" element={<AdminPassword />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// Kept so a page can wrap itself if needed
export { ProtectedRoute };