import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MessageSquare, Star } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/common/Button.jsx';
import EmptyState from '@/components/common/EmptyState.jsx';
import StarRating from '@/components/common/StarRating.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import useAuth from '@/hooks/useAuth.js';
import { getRecentReviews } from '@/services/review.service.js';
import { timeAgo } from '@/utils/formatDate.js';

export default function Feedback() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['recent-reviews'],
    queryFn: () => getRecentReviews({ limit: 6 }),
    staleTime: 60000,
  });
  const reviews = data?.reviews ?? [];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reviews.length < 2 || paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % reviews.length), 6000);
    return () => clearInterval(t);
  }, [reviews.length, paused]);

  const current = reviews.length ? reviews[index % reviews.length] : null;
  const go = (i) => setIndex(((i % reviews.length) + reviews.length) % reviews.length);

  return (
    <section className="py-10">
      <div className="container-page">
        <h2 className="text-2xl font-bold sm:text-3xl">What patients say</h2>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {isLoading ? (
            <Skeleton className="h-56" />
          ) : current ? (
            <div
              className="card flex min-h-[14rem] flex-col justify-between bg-soft"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              <div aria-live="polite">
                <StarRating value={current.rating} size={20} />
                <blockquote className="mt-3 line-clamp-5 text-lg">&ldquo;{current.comment}&rdquo;</blockquote>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-on-solid">
                    {current.name?.[0]?.toUpperCase() || 'P'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{current.name}</p>
                    <p className="truncate text-sm text-muted">
                      Visited {current.doctorName}
                      {current.clinicName ? ` at ${current.clinicName}` : ''} · {timeAgo(current.createdAt)}
                    </p>
                  </div>
                </div>

                {reviews.length > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex">
                      {reviews.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => go(i)}
                          aria-label={`Show review ${i + 1}`}
                          aria-current={i === index % reviews.length}
                          className="flex h-8 w-6 items-center justify-center"
                        >
                          <span
                            className={clsx(
                              'block h-2.5 rounded-full transition-all',
                              i === index % reviews.length ? 'w-6 bg-brand' : 'w-2.5 bg-line'
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => go(index - 1)} aria-label="Previous review" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-card">
                        <ChevronLeft size={20} />
                      </button>
                      <button type="button" onClick={() => go(index + 1)} aria-label="Next review" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-card">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center bg-soft">
              <EmptyState
                icon={MessageSquare}
                title="No reviews yet"
                message="Patients can review their doctor after the visit is completed. Their words will appear here."
              />
            </div>
          )}

          <div className="card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn">
              <Star size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-xl font-bold">Visited a doctor recently?</h3>
            <p className="mt-1 text-muted">
              When your visit is marked complete, you can rate your doctor from your dashboard. Only real visits can be
              rated, so every review is genuine.
            </p>
            <Button to={role === 'patient' ? '/patient/appointments' : '/login'} className="mt-4">
              {role === 'patient' ? 'Rate your visit' : 'Login to rate your visit'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}