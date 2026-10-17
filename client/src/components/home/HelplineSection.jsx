import { Phone } from 'lucide-react';
import { getHelplines } from '@/data/helplines.js';

const cls = 'h-14 w-14';

function HelplineIcon({ name }) {
  switch (name) {
    case 'ambulance':
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden="true">
          <rect x="4" y="22" width="40" height="26" rx="5" fill="#fff" stroke="#D62839" strokeWidth="3" />
          <path d="M44 30h10l6 8v10H44z" fill="#fff" stroke="#D62839" strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 26h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#D62839" />
          <circle cx="16" cy="50" r="5" fill="#64748B" />
          <circle cx="50" cy="50" r="5" fill="#64748B" />
          <rect x="24" y="14" width="10" height="6" rx="2" fill="#D62839" />
        </svg>
      );
    case 'police':
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden="true">
          <path d="M32 5l22 8v16c0 14-9 24-22 30C19 53 10 43 10 29V13z" fill="#1D4ED8" />
          <path d="M32 17l4 9h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z" fill="#FBBF24" />
        </svg>
      );
    case 'child':
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden="true">
          <circle cx="32" cy="16" r="9" fill="#F59E0B" />
          <path d="M20 36c0-4 5-6 12-6s12 2 12 6v6H20z" fill="#38BDF8" />
          <path d="M32 60c-9-6-14-11-14-16 0-4 3-6 6-6 3 0 6 2 8 5 2-3 5-5 8-5 3 0 6 2 6 6 0 5-5 10-14 16z" fill="#D62839" />
        </svg>
      );
    case 'women':
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden="true">
          <circle cx="32" cy="16" r="9" fill="#C026D3" />
          <path d="M32 27c-9 0-14 5-14 12v4h28v-4c0-7-5-12-14-12z" fill="#C026D3" />
          <path d="M20 46h24l4 12H16z" fill="#E879F9" />
        </svg>
      );
    case 'health':
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden="true">
          <rect x="8" y="8" width="48" height="48" rx="12" fill="#0B7285" />
          <path d="M27 15h10v12h12v10H37v12H27V37H15V27h12z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <span className={`${cls} flex items-center justify-center rounded-2xl bg-brand text-on-solid`} aria-hidden="true">
          <Phone size={28} />
        </span>
      );
  }
}

export default function HelplineSection() {
  const helplines = getHelplines();

  return (
    <section id="helpline" className="scroll-mt-20 border-y border-line bg-card py-10">
      <div className="container-page">
        <h2 className="text-2xl font-bold sm:text-3xl">Important helpline numbers</h2>
        <p className="mt-1 text-muted">Tap a number to call from your phone. In an emergency, call 108 or 112 first.</p>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {helplines.map((h) => (
            <a
              key={h.key}
              href={`tel:${h.number}`}
              aria-label={`Call ${h.title} on ${h.number}`}
              className="card flex flex-col items-center bg-page text-center transition-all hover:-translate-y-1 hover:border-cross"
            >
              <HelplineIcon name={h.icon} />
              <b className="mt-2 break-all text-2xl font-bold leading-tight text-cross">{h.number}</b>
              <span className="mt-0.5 text-sm font-semibold">{h.title}</span>
              <span className="mt-1 text-xs text-muted">{h.note}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}