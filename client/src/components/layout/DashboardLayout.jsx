import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Clock,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Moon,
  ScrollText,
  ShieldCheck,
  Star,
  Stethoscope,
  Sun,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/common/Logo.jsx';
import NotificationBell from './NotificationBell.jsx';
import useAuth from '@/hooks/useAuth.js';
import useSocket from '@/hooks/useSocket.js';
import { useTheme } from '@/context/ThemeContext.jsx';
import { ROLE_HOME } from '@/utils/constants.js';

const MENUS = {
  patient: [
    { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
    { label: 'Appointments', to: '/appointments', icon: CalendarCheck },
    { label: 'Live queue', to: '/queue', icon: ListOrdered },
    { label: 'Prescriptions', to: '/prescriptions', icon: FileText },
    { label: 'Notifications', to: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', to: '/profile', icon: User },
    { label: 'Access log', to: '/access-log', icon: ShieldCheck },
  ],
  doctor: [
    { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
    { label: 'Requests', to: '/requests', icon: ClipboardList },
    { label: 'Live queue', to: '/queue', icon: ListOrdered },
    { label: 'Schedule', to: '/schedule', icon: Clock },
    { label: 'Analytics', to: '/analytics', icon: TrendingUp },
    { label: 'Notifications', to: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', to: '/profile', icon: User },
  ],
  clinic: [
    { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
    { label: 'Doctors', to: '/doctors', icon: Stethoscope },
    { label: 'Live queue', to: '/queue', icon: ListOrdered },
    { label: 'Walk-in', to: '/walk-in', icon: UserPlus },
    { label: 'Analytics', to: '/analytics', icon: TrendingUp },
    { label: 'Notifications', to: '/notifications', icon: Bell, badge: true },
    { label: 'Profile', to: '/profile', icon: Building2 },
  ],
  admin: [
    { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
    { label: 'Doctors', to: '/doctors', icon: Stethoscope },
    { label: 'Clinics', to: '/clinics', icon: Building2 },
    { label: 'Users', to: '/users', icon: Users },
    { label: 'Reviews', to: '/reviews', icon: Star },
    { label: 'Audit log', to: '/audit-logs', icon: ScrollText },
    { label: 'Password', to: '/password', icon: KeyRound },
  ],
};

const AREA_LABEL = { patient: 'Patient', doctor: 'Doctor', clinic: 'Clinic', admin: 'Admin' };

function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-cross px-1.5 text-center text-[11px] font-bold leading-5 text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function DashboardLayout({ area = 'patient' }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const tabsRef = useRef(null);

  const base = ROLE_HOME[area] || '/';
  const menu = MENUS[area] || [];

  // On a phone, bring the open tab into view
  useEffect(() => {
    const active = tabsRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [location.pathname]);

  const doLogout = async () => {
    await logout();
    navigate(area === 'admin' ? '/admin' : '/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-page">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-card pt-safe">
        <div className="container-page flex h-14 items-center gap-2 sm:h-16 sm:gap-3">
          <Logo to="/" />
          <span className="badge badge-info ml-1 hidden sm:inline-flex">{AREA_LABEL[area]}</span>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-soft"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <NotificationBell />
            <span className="hidden max-w-[160px] truncate text-sm font-semibold md:inline">{user?.name}</span>
            <button type="button" onClick={doLogout} className="btn btn-outline btn-sm" aria-label="Logout">
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Phone and tablet: tabs that scroll sideways */}
      <nav
        ref={tabsRef}
        aria-label={`${AREA_LABEL[area]} menu`}
        className="no-print scrollbar-none sticky top-14 z-20 overflow-x-auto border-b border-line bg-card sm:top-16 lg:hidden"
      >
        <div className="container-page flex w-max min-w-full gap-1 py-1.5">
          {menu.map(({ label, to, icon: Icon, end, badge }) => (
            <NavLink
              key={label}
              to={`${base}${to}`}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors',
                  isActive ? 'bg-soft text-brand' : 'text-ink hover:bg-soft'
                )
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
              {badge && <UnreadBadge count={unreadCount} />}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="container-page flex gap-6 py-4 lg:py-6">
        {/* Laptop: side menu */}
        <aside className="no-print hidden w-60 shrink-0 lg:block">
          <nav aria-label={`${AREA_LABEL[area]} menu`} className="sticky top-24 space-y-1">
            {menu.map(({ label, to, icon: Icon, end, badge }) => (
              <NavLink
                key={label}
                to={`${base}${to}`}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors',
                    isActive ? 'bg-soft font-semibold text-brand' : 'text-ink hover:bg-soft'
                  )
                }
              >
                <Icon size={20} aria-hidden="true" />
                {label}
                {badge && <UnreadBadge count={unreadCount} />}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-safe">
          <Outlet />
        </main>
      </div>
    </div>
  );
}