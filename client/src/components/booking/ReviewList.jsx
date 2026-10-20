import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import EmptyState from '@/components/common/EmptyState.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { getClinicReviews, getDoctorReviews } from '@/services/review.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { timeAgo } from '@/utils/formatDate.js';

export default function ReviewList({ kind = 'doctor', id, ratingAvg = 0, ratingCount = 0 }) {
  const fetcher = kind === 'clinic' ? getClinicReviews : getDoctorReviews;

  const q = useInfiniteQuery({
    queryKey: ['reviews', kind, id],
    queryFn: ({ pageParam }) => fetcher(id, { page: pageParam, limit: 5 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: !!id,
  });

  const reviews = q.data?.pages.flatMap((p) => p.reviews) ?? [];

  return (
    <section aria-label="Patient reviews">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold sm:text-2xl">Patient reviews</h2>
        {ratingCount > 0 && <StarRating value={ratingAvg} count={ratingCount} showValue />}
      </div>

      <div className="mt-4 space-y-3">
        {q.isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : q.isError ? (
          <p role="alert" className="field-error">
            {getErrorMessage(q.error)}
          </p>
        ) : reviews.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              message="Reviews appear here after patients complete a visit."
            />
          </div>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-on-solid">
                    {r.name?.[0]?.toUpperCase() || 'P'}
                  </span>
                  <b>{r.name}</b>
                </div>
                <span className="text-sm text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              <div className="mt-2">
                <StarRating value={r.rating} size={16} />
              </div>
              {r.comment && <p className="mt-2 break-words">{r.comment}</p>}
            </article>
          ))
        )}
      </div>

      {q.hasNextPage && (
        <div className="mt-4 text-center">
          <Button variant="outline" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            Load more reviews
          </Button>
        </div>
      )}
    </section>
  );
}