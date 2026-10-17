import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { APP_NAME } from '@/utils/constants.js';

export function CrossMark({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" className={clsx('shrink-0', className)} aria-hidden="true">
      <rect width="34" height="34" rx="9" fill="#ffffff" stroke="#D6E5E8" />
      <path d="M13 6h8v7h7v8h-7v7h-8v-7H6v-8h7z" fill="#D62839" />
    </svg>
  );
}

export default function Logo({ to = '/', size = 32, showName = true, light = false, className = '' }) {
  const inner = (
    <>
      <CrossMark size={size} />
      {showName && (
        <span
          className={clsx(
            'min-w-0 text-base font-bold leading-tight xs:text-lg sm:text-xl',
            light ? 'text-white' : 'text-brand'
          )}
        >
          {APP_NAME}
        </span>
      )}
    </>
  );

  const cls = clsx('inline-flex min-w-0 items-center gap-2.5', className);
  if (!to) return <span className={cls}>{inner}</span>;
  return (
    <Link to={to} className={cls} aria-label={`${APP_NAME}, go to the home page`}>
      {inner}
    </Link>
  );
}