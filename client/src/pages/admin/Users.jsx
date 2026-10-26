import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { Select } from '@/components/common/FormField.jsx';
import ReasonDialog from '@/components/admin/ReasonDialog.jsx';
import useDebounce from '@/hooks/useDebounce.js';
import { disableUser, enableUser, listUsers } from '@/services/admin.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDateTime } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const ROLES = ['patient', 'doctor', 'clinic', 'admin'];

export default function Users() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const role = ROLES.includes(params.get('role')) ? params.get('role') : '';
  const active = params.get('active') === 'true' || params.get('active') === 'false' ? params.get('active') : '';

  const [text, setText] = useState('');
  const q = useDebounce(text.trim(), 400);
  const [page, setPage] = useState(1);
  const [disableTarget, setDisableTarget] = useState(null);
  const [enableTarget, setEnableTarget] = useState(null);

  useEffect(() => {
    document.title = `Users - Admin - ${APP_NAME}`;
  }, []);
  useEffect(() => setPage(1), [role, active, q]);

  const patch = (changes) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true }
    );

  const query = useQuery({
    queryKey: ['admin-users', role, active, q, page],
    queryFn: () => listUsers({ role, active, q: q || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const users = query.data?.users ?? [];

  const act = useMutation({
    mutationFn: ({ type, user, reason }) => (type === 'disable' ? disableUser(user._id, reason) : enableUser(user._id)),
    onSuccess: (d) => {
      const n = d.cancelledAppointments;
      toast.success(`${d.message}${n ? `. ${n} upcoming ${n === 1 ? 'appointment was' : 'appointments were'} cancelled.` : ''}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setDisableTarget(null);
      setEnableTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
        <p className="text-muted">Everyone who has an account. {query.data ? `${query.data.total} found.` : ''}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <label htmlFor="user-search" className="label">
            Search
          </label>
          <Search size={18} className="pointer-events-none absolute bottom-3 left-3 text-muted" aria-hidden="true" />
          <input
            id="user-search"
            className="input pl-10"
            placeholder="Name, email or mobile"
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Select label="Role" value={role} onChange={(e) => patch({ role: e.target.value })}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </Select>
        <Select label="Status" value={active} onChange={(e) => patch({ active: e.target.value })}>
          <option value="">Active and disabled</option>
          <option value="true">Active only</option>
          <option value="false">Disabled only</option>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : users.length === 0 ? (
        <div className="card">
          <EmptyState title="No users found" message="Try a different search or filter." />
        </div>
      ) : (
        <ul className={clsx('space-y-2', query.isFetching && 'opacity-70')}>
          {users.map((u) => (
            <li key={u._id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-on-solid">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className="break-words">{u.name}</span>
                    <Badge tone="info">{u.role}</Badge>
                    {!u.isActive && <Badge tone="bad">Disabled</Badge>}
                  </p>
                  <p className="break-all text-sm text-muted">
                    {u.email || (u.phone ? `+91 ${u.phone}` : '')}
                    {u.email && u.phone ? ` · +91 ${u.phone}` : ''}
                  </p>
                  <p className="text-xs text-muted">Joined {formatDateTime(u.createdAt)}</p>
                </div>
              </div>

              <div>
                {u.role === 'patient' ? (
                  u.isActive ? (
                    <Button size="sm" variant="danger" icon={UserX} onClick={() => setDisableTarget(u)}>
                      Disable
                    </Button>
                  ) : (
                    <Button size="sm" icon={UserCheck} onClick={() => setEnableTarget(u)}>
                      Enable
                    </Button>
                  )
                ) : u.role === 'admin' ? null : (
                  <span className="text-xs text-muted">Use Suspend on the {u.role === 'doctor' ? 'Doctors' : 'Clinics'} page</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={query.data?.page ?? page}
        pages={query.data?.pages ?? 1}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <ReasonDialog
        open={!!disableTarget}
        title="Disable this patient?"
        message={
          disableTarget
            ? `${disableTarget.name} will be logged out at once and cannot log in. Their upcoming appointments will be cancelled.`
            : ''
        }
        confirmLabel="Disable"
        loading={act.isPending}
        onConfirm={(reason) => act.mutate({ type: 'disable', user: disableTarget, reason })}
        onCancel={() => setDisableTarget(null)}
      />
      <ConfirmDialog
        open={!!enableTarget}
        title="Enable this patient?"
        message={enableTarget ? `${enableTarget.name} will be able to log in again.` : ''}
        confirmLabel="Yes, enable"
        loading={act.isPending}
        onConfirm={() => act.mutate({ type: 'enable', user: enableTarget })}
        onCancel={() => setEnableTarget(null)}
      />
    </div>
  );
}