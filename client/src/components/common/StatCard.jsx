import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Skeleton } from './Loader.jsx';

const TONES = {
  brand: 'bg-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', to, loading = false, className = '' }) {
  const shown = typeof value === 'number' ? value.toLocaleString('en-IN') : value;

  const body = (
    <div className="flex items-center gap-3">
      {Icon && (
        <span className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.brand)}>
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        {loading ? <Skeleton className="h-7 w-16" /> : <p className="truncate text-2xl font-bold leading-tight">{shown ?? '-'}</p>}
        <p className="truncate text-sm text-muted">{label}</p>
        {hint && !loading && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );

  const cls = clsx('card block', to && 'transition-shadow hover:shadow-card', className);
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}