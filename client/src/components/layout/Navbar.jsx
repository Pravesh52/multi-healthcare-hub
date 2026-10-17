import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/common/Logo.jsx';
import Button from '@/components/common/Button.jsx';
import NotificationBell from './NotificationBell.jsx';
import useAuth from '@/hooks/useAuth.js';
import { useTheme } from '@/context/ThemeContext.jsx';
import { ROLE_HOME } from '@/utils/constants.js';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Clinics', to: '/search?type=clinic' },
  { label: 'Doctors', to: '/search' },
  { label: 'Hospitals', to: '/search?type=hospital' },
  { label: 'Helpline', to: '/#helpline' },
];

const isActive = (to, loc) => {
  if (to.includes('#')) return false;
  if (to === '/') return loc.pathname === '/' && !loc.hash;
  const [path, query = ''] = to.split('?');
  if (loc.pathname !== path) return false;
  return query ? loc.search === `?${query}` : !loc.search.includes('type=');
};

// Closes a dropdown when you click outside it or press Escape
function useDismiss(open, onClose, ref) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeRef.current();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref]);
}

function DropdownMenu({ label, buttonClass, trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useDismiss(open, () => setOpen(false), ref);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={buttonClass}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-full z-40 mt-2 w-64 animate-fade-up overflow-hidden rounded-xl border border-line bg-card shadow-pop"
        >
          {children}
        </div>
      )}
    </div>
  );
}

const menuItem = 'flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-soft';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  const doLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/', { replace: true });
  };

  const dashboard = user ? ROLE_HOME[user.role] : null;
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card">
      <div className="container-page flex h-16 items-center gap-2 sm:gap-4">
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              aria-current={isActive(item.to, location) ? 'page' : undefined}
              className={clsx(
                'rounded-lg px-3 py-2 font-medium transition-colors hover:bg-soft hover:text-brand',
                isActive(item.to, location) ? 'text-brand' : 'text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-soft"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Desktop: account area */}
          <div className="hidden items-center gap-2 lg:flex">
            {loading ? null : user ? (
              <>
                <NotificationBell />
                <DropdownMenu
                  label="Account menu"
                  buttonClass="flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-2 py-1 hover:bg-soft"
                  trigger={
                    <>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-solid">
                        {initial}
                      </span>
                      <span className="max-w-[140px] truncate text-sm font-semibold">{user.name}</span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </>
                  }
                >
                  <Link to={dashboard} role="menuitem" className={menuItem}>
                    <LayoutDashboard size={18} aria-hidden="true" /> Go to dashboard
                  </Link>
                  <button type="button" role="menuitem" onClick={doLogout} className={clsx(menuItem, 'text-bad')}>
                    <LogOut size={18} aria-hidden="true" /> Logout
                  </button>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button to="/login" variant="outline" size="sm">
                  Login
                </Button>
                <DropdownMenu
                  label="Register"
                  buttonClass="btn btn-primary btn-sm"
                  trigger={
                    <>
                      Register <ChevronDown size={16} aria-hidden="true" />
                    </>
                  }
                >
                  <Link to="/register/doctor" role="menuitem" className={menuItem}>
                    I am a doctor
                  </Link>
                  <Link to="/register/clinic" role="menuitem" className={menuItem}>
                    I have a clinic or hospital
                  </Link>
                  <p className="border-t border-line px-4 py-2 text-xs text-muted">
                    Patients can sign up on the Login page with their mobile number.
                  </p>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile and tablet: bell and menu button */}
          {user && <NotificationBell className="lg:hidden" />}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-soft lg:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile and tablet menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-card pb-safe lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={clsx(
                  'flex min-h-[48px] items-center rounded-lg px-2 text-base font-medium hover:bg-soft',
                  isActive(item.to, location) ? 'text-brand' : 'text-ink'
                )}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 space-y-2 border-t border-line py-3">
              {loading ? null : user ? (
                <>
                  <p className="px-2 text-sm text-muted">
                    Logged in as <b className="text-ink">{user.name}</b>
                  </p>
                  <Button to={dashboard} block icon={LayoutDashboard}>
                    Go to dashboard
                  </Button>
                  <Button variant="danger" block icon={LogOut} onClick={doLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button to="/login" block>
                    Login
                  </Button>
                  <Button to="/register/doctor" variant="outline" block>
                    Register as a doctor
                  </Button>
                  <Button to="/register/clinic" variant="outline" block>
                    Register a clinic or hospital
                  </Button>
                  <p className="px-1 text-xs text-muted">Patients sign up on the Login page with their mobile number.</p>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}