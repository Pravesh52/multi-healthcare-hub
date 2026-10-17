import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

// 1 ... 4 5 6 ... 12
const buildPages = (page, pages) => {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
};

export default function Pagination({ page = 1, pages = 1, onChange, className = '' }) {
  if (!pages || pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={clsx('flex items-center justify-between gap-2 sm:justify-center', className)}>
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} aria-hidden="true" />
        <span className="hidden xs:inline">Previous</span>
        <span className="xs:hidden sr-only">Previous page</span>
      </button>

      <span className="text-sm text-muted sm:hidden">
        Page {page} of {pages}
      </span>

      <div className="hidden items-center gap-1 sm:flex">
        {buildPages(page, pages).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="px-1 text-muted" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Page ${n}`}
              onClick={() => onChange(n)}
              className={clsx(
                'h-10 min-w-[40px] rounded-lg px-2 text-sm font-semibold transition-colors',
                n === page ? 'bg-brand text-on-solid' : 'text-ink hover:bg-soft'
              )}
            >
              {n}
            </button>
          )
        )}
      </div>

      <button type="button" className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <span className="hidden xs:inline">Next</span>
        <span className="xs:hidden sr-only">Next page</span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}