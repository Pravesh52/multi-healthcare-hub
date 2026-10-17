import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

function BroomArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#fff" />
      <path d="M92 14L48 80" stroke="#8B5A2B" strokeWidth="6" strokeLinecap="round" />
      <path d="M40 72l16 10-12 24c-10 0-22-6-26-12z" fill="#F2B632" />
      <path d="M30 92l8 12M24 96l8 10M38 88l8 12" stroke="#B7791F" strokeWidth="2" />
      <circle cx="72" cy="104" r="3" fill="#9CA3AF" />
      <circle cx="84" cy="98" r="2" fill="#9CA3AF" />
      <path d="M82 30c8-6 16-2 16 6-8 4-16 0-16-6z" fill="#22A06B" />
    </svg>
  );
}

function MaskArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#fff" />
      <path d="M22 50c0-4 4-6 8-6M98 50c0-4-4-6-8-6" stroke="#2563EB" strokeWidth="3" fill="none" />
      <path d="M30 44c20-8 40-8 60 0v28c0 14-14 24-30 24S30 86 30 72z" fill="#60A5FA" stroke="#2563EB" strokeWidth="3" />
      <path d="M36 58h48M36 70h48M40 82h40" stroke="#BFDBFE" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function HandsArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#fff" />
      <path d="M42 40h30v10H56v8H46v-8h-4z" fill="#64748B" />
      <path d="M60 62c6 8 10 14 10 20a10 10 0 0 1-20 0c0-6 4-12 10-20z" fill="#38BDF8" />
      <circle cx="36" cy="84" r="5" fill="#7DD3FC" />
      <circle cx="86" cy="76" r="4" fill="#7DD3FC" />
      <circle cx="82" cy="94" r="6" fill="#BAE6FD" />
    </svg>
  );
}

const POSTERS = [
  {
    id: 'clean',
    Art: BroomArt,
    title: 'One Step Towards Cleanliness',
    text: 'Keep your clinic, street and surroundings clean. A clean place means fewer diseases.',
    bg: 'from-[#DDF3E4] to-[#F2FBF4]',
  },
  {
    id: 'mask',
    Art: MaskArt,
    title: 'Wearing a Mask Is Important',
    text: 'Cover your nose and mouth in crowded places and clinics to protect yourself and others.',
    bg: 'from-[#DCEBFB] to-[#F1F7FE]',
  },
  {
    id: 'hands',
    Art: HandsArt,
    title: 'Wash Your Hands Often',
    text: 'Wash with soap and water for at least 20 seconds, especially before eating.',
    bg: 'from-[#FDF0D5] to-[#FFF9EC]',
  },
];

const AUTOPLAY_MS = 5000;

export default function PosterSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const total = POSTERS.length;

  const go = useCallback((i) => setIndex(((i % total) + total) % total), [total]);

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (paused || reduced) return undefined;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reduced, total]);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Health awareness posters"
      className="no-print relative overflow-hidden border-b border-line"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {POSTERS.map(({ id, Art, title, text, bg }, i) => (
          <div
            key={id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${total}`}
            aria-hidden={i !== index}
            className={clsx(
              'grid min-h-[170px] w-full shrink-0 grid-cols-1 items-center justify-items-center gap-2 bg-gradient-to-r px-6 pb-9 pt-4 text-center text-[#12303A] sm:grid-cols-[auto_1fr] sm:justify-items-start sm:gap-6 sm:px-20 sm:text-left',
              bg
            )}
          >
            <Art />
            <div>
              <h2 className="text-xl font-bold sm:text-3xl">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#3A5260] sm:text-base">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous poster"
        className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#12303A] shadow hover:bg-white sm:flex"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next poster"
        className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#12303A] shadow hover:bg-white sm:flex"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute inset-x-0 bottom-1.5 flex justify-center">
        {POSTERS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show poster ${i + 1}`}
            aria-current={i === index}
            className="flex h-8 w-8 items-center justify-center"
          >
            <span className={clsx('block h-2.5 rounded-full transition-all', i === index ? 'w-6 bg-brand' : 'w-2.5 bg-[#12303A]/30')} />
          </button>
        ))}
      </div>
    </section>
  );
}