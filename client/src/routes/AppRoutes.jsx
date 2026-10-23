import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth.js';
import { PageSplash } from './ProtectedRoute.jsx';
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

// ---------- layout parts ----------
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

// Dashboards: the menu comes from DashboardLayout, `area` tells it which menu
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