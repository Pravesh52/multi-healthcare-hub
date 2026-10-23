import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, CircleCheck, CircleX, Clock, FileText, Info, ListOrdered, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useAuth from '@/hooks/useAuth.js';
import useNotifications from '@/hooks/useNotifications.js';
import useSocket from '@/hooks/useSocket.js';
import { timeAgo } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const ICONS = {
  approved: { Icon: CircleCheck, cls: 'bg-ok-soft text-ok' },
  rejected: { Icon: CircleX, cls: 'bg-bad-soft text-bad' },
  reminder: { Icon: Clock, cls: 'bg-warn-soft text-warn' },
  your_turn: { Icon: Bell, cls: 'bg-ok-soft text-ok' },
  queue_update: { Icon: ListOrdered, cls: 'bg-warn-soft text-warn' },
  follow_up: { Icon: FileText, cls: 'bg-warn-soft text-warn' },
  request_sent: { Icon: FileText, cls: 'bg-soft text-brand' },
  system: { Icon: Info, cls: 'bg-soft text-brand' },
};

// Where a notification takes the person
const targetFor = (role, n) => {
  const base = `/${role}`;
  if (role === 'patient') {
    if (['your_turn', 'queue_update'].includes(n.type)) return `${base}/queue`;
    if (n.type === 'follow_up' || n.data?.prescriptionId) return `${base}/prescriptions`;
    return `${base}/appointments`;
  }
  if (role === 'doctor') return n.type === 'request_sent' || n.type === 'system' ? `${base}/requests` : `${base}/queue`;
  return base;
};

export default function NotificationsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useSocket();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { items, loading, error, hasMore, loadMore, refresh, markRead, markAllRead } = useNotifications({ unreadOnly });

  useEffect(() => {
    document.title = `Notifications - ${APP_NAME}`;
  }, []);

  const open = async (n) => {
    markRead(n._id);
    navigate(targetFor(role, n));
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="text-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={refresh}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" icon={CheckCheck} disabled={unreadCount === 0} onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Show">
        {[
          [false, 'All'],
          [true, 'Unread'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            aria-pressed={unreadOnly === value}
            onClick={() => setUnreadOnly(value)}
            className={clsx(
              'min-h-[40px] rounded-full border px-4 text-sm font-semibold',
              unreadOnly === value ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            message="Updates about your appointments and queue will show up here."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const { Icon, cls } = ICONS[n.type] || ICONS.system;
            return (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={clsx(
                    'card flex w-full items-start gap-3 text-left transition-colors hover:bg-soft',
                    !n.read && 'border-brand'
                  )}
                >
                  <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cls)}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <b className={clsx('block truncate', !n.read && 'text-brand')}>{n.title}</b>
                      {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 block break-words text-sm text-muted">{n.message}</span>
                    <span className="mt-1 block text-xs text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" loading={loading} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}