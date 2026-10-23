import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import Badge from '@/components/common/Badge.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getAccessLog } from '@/services/patient.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDateTime } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const ROLE_LABEL = { doctor: 'Doctor', clinic: 'Clinic', admin: 'Admin' };

export default function AccessLog() {
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = `Access log - ${APP_NAME}`;
  }, []);

  const q = useQuery({
    queryKey: ['access-log', page],
    queryFn: () => getAccessLog({ page, limit: 15 }),
    placeholderData: keepPreviousData,
  });
  const entries = q.data?.entries ?? [];

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Who looked at my information</h1>
        <p className="text-muted">
          Whenever a doctor, a clinic or our team opens your appointment details, receipt or prescription, it is written here.
          Your own views are not listed.
        </p>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShieldCheck}
            title="No one has looked at your information yet"
            message="When someone does, you will see their name and the time here."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {e.who} {e.role && <Badge tone="info">{ROLE_LABEL[e.role] || e.role}</Badge>}
                </p>
                <p className="text-muted">{e.what}</p>
              </div>
              <p className="text-sm text-muted">{formatDateTime(e.at)}</p>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={q.data?.page ?? page}
        pages={q.data?.pages ?? 1}
        onChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}