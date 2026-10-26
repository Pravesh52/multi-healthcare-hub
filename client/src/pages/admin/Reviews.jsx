import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Badge from '@/components/common/Badge.jsx';
import Button from '@/components/common/Button.jsx';
import ConfirmDialog from '@/components/common/ConfirmDialog.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { Select } from '@/components/common/FormField.jsx';
import ReasonDialog from '@/components/admin/ReasonDialog.jsx';
import { hideReview, listAllReviews, unhideReview } from '@/services/admin.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { formatDateTime } from '@/utils/formatDate.js';
import { APP_NAME } from '@/utils/constants.js';

const VIEWS = [
  { key: '', label: 'All' },
  { key: 'false', label: 'Visible' },
  { key: 'true', label: 'Hidden' },
];

export default function Reviews() {
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [hideTarget, setHideTarget] = useState(null);
  const [showTarget, setShowTarget] = useState(null);

  useEffect(() => {
    document.title = `Reviews - Admin - ${APP_NAME}`;
  }, []);
  useEffect(() => setPage(1), [hidden, rating]);

  const q = useQuery({
    queryKey: ['admin-reviews', hidden, rating, page],
    queryFn: () => listAllReviews({ hidden: hidden || undefined, rating: rating || undefined, page, limit: 15 }),
    placeholderData: keepPreviousData,
  });
  const reviews = q.data?.reviews ?? [];

  const act = useMutation({
    mutationFn: ({ type, review, reason }) => (type === 'hide' ? hideReview(review._id, reason) : unhideReview(review._id)),
    onSuccess: (d) => toast.success(d.message),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => {
      setHideTarget(null);
      setShowTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reviews</h1>
        <p className="text-muted">Hide reviews that are abusive or false. A hidden review is not shown to the public and is not counted in the rating.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2" role="group" aria-label="Show">
          {VIEWS.map((v) => (
            <button
              key={v.label}
              type="button"
              aria-pressed={hidden === v.key}
              onClick={() => setHidden(v.key)}
              className={clsx(
                'min-h-[40px] rounded-full border px-4 text-sm font-semibold',
                hidden === v.key ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card hover:bg-soft'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="w-40">
          <Select label="Rating" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'star' : 'stars'}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : q.isError && !q.data ? (
        <ErrorState message={getErrorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : reviews.length === 0 ? (
        <div className="card">
          <EmptyState icon={MessageSquare} title="No reviews found" message="Reviews appear here after patients complete a visit." />
        </div>
      ) : (
        <ul className={clsx('space-y-3', q.isFetching && 'opacity-70')}>
          {reviews.map((r) => (
            <li key={r._id} className={clsx('card', r.hidden && 'border-warn')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <StarRating value={r.rating} size={18} />
                  <p className="mt-1 text-sm text-muted">
                    <b className="text-ink">{r.patient?.name || 'Patient'}</b> about <b className="text-ink">{r.doctor?.user?.name || 'a doctor'}</b>
                    {r.clinic?.name ? ` at ${r.clinic.name}` : ''} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                {r.hidden && <Badge tone="warn">Hidden</Badge>}
              </div>
              {r.comment ? <p className="mt-2 break-words">{r.comment}</p> : <p className="mt-2 text-sm text-muted">No comment written.</p>}
              {r.hidden && r.hiddenReason && <p className="mt-2 rounded-lg bg-warn-soft p-2 text-sm text-warn">Hidden because: {r.hiddenReason}</p>}
              <div className="mt-3">
                {r.hidden ? (
                  <Button size="sm" variant="outline" icon={Eye} onClick={() => setShowTarget(r)}>
                    Show again
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" icon={EyeOff} onClick={() => setHideTarget(r)}>
                    Hide
                  </Button>
                )}
              </div>
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

      <ReasonDialog
        open={!!hideTarget}
        title="Hide this review?"
        message="It will not be shown to the public and will not count in the rating of the doctor and the clinic."
        confirmLabel="Hide review"
        reasonLabel="Why is it being hidden?"
        loading={act.isPending}
        onConfirm={(reason) => act.mutate({ type: 'hide', review: hideTarget, reason })}
        onCancel={() => setHideTarget(null)}
      />
      <ConfirmDialog
        open={!!showTarget}
        title="Show this review again?"
        message="It will be public again and will count in the rating."
        confirmLabel="Yes, show it"
        loading={act.isPending}
        onConfirm={() => act.mutate({ type: 'show', review: showTarget })}
        onCancel={() => setShowTarget(null)}
      />
    </div>
  );
}