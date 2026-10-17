import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useAuth from '@/hooks/useAuth.js';
import useSocket from '@/hooks/useSocket.js';
import { ROLE_HOME } from '@/utils/constants.js';

export default function NotificationBell({ className = '' }) {
  const { role } = useAuth();
  const { unreadCount, connected } = useSocket();

  if (!role || role === 'admin') return null;

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <Link
      to={`${ROLE_HOME[role]}/notifications`}
      aria-label={label}
      title={connected ? 'Live updates are on' : 'Notifications'}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-soft ${className}`}
    >
      <Bell size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-cross px-1 text-center text-[11px] font-bold leading-[18px] text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {connected && <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-ok ring-2 ring-card" aria-hidden="true" />}
    </Link>
  );
}