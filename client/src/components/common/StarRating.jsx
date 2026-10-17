import { useState } from 'react';
import { Star } from 'lucide-react';
import clsx from 'clsx';

export default function StarRating({ value = 0, onChange, size = 20, count, showValue = false, label = 'Rating', className = '' }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === 'function';

  if (!interactive) {
    return (
      <span className={clsx('inline-flex items-center gap-1', className)}>
        <span className="inline-flex" role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              size={size}
              aria-hidden="true"
              className={i <= Math.round(value) ? 'text-star' : 'text-line'}
              fill={i <= Math.round(value) ? 'currentColor' : 'none'}
            />
          ))}
        </span>
        {showValue && <b className="text-sm">{Number(value).toFixed(1)}</b>}
        {count != null && <span className="text-sm text-muted">({count})</span>}
      </span>
    );
  }

  const shown = hover || value;
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className={clsx('inline-flex', className)} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} ${i === 1 ? 'star' : 'stars'}`}
          tabIndex={value === i || (!value && i === 1) ? 0 : -1}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onKeyDown={onKeyDown}
          className="flex h-11 w-11 items-center justify-center rounded-lg transition-transform hover:scale-110"
        >
          <Star
            size={size + 8}
            aria-hidden="true"
            className={i <= shown ? 'text-star' : 'text-line'}
            fill={i <= shown ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}