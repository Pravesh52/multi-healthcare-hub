import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import Button from './Button.jsx';

export default function EmptyState({ icon: Icon = Inbox, title, message, action, className = '' }) {
  return (
    <div className={clsx('flex flex-col items-center px-4 py-10 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-soft text-brand">
        <Icon size={26} aria-hidden="true" />
      </span>
      {title && <h3 className="mt-3 text-lg font-bold">{title}</h3>}
      {message && <p className="mt-1 max-w-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div role="alert" className={clsx('flex flex-col items-center px-4 py-10 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bad-soft text-bad">
        <TriangleAlert size={26} aria-hidden="true" />
      </span>
      <p className="mt-3 max-w-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" icon={RefreshCw} className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}