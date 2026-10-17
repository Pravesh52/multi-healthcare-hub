import clsx from 'clsx';

// tone "brand" is for a light background, "current" takes the text colour (use it inside buttons)
export function Spinner({ size = 24, tone = 'brand', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-block shrink-0 animate-spin rounded-full border-2',
        tone === 'current' ? 'border-current border-t-transparent' : 'border-line border-t-brand',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={clsx('animate-pulse rounded-lg bg-soft', className)} />;
}

export default function Loader({ label = 'Loading...', size = 32, block = false, className = '' }) {
  return (
    <div
      role="status"
      className={clsx(
        'flex flex-col items-center justify-center gap-3 py-10 text-muted',
        block && 'min-h-[50vh]',
        className
      )}
    >
      <Spinner size={size} />
      <span className="text-sm">{label}</span>
    </div>
  );
}