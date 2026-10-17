import { BadgeCheck, Receipt, Timer } from 'lucide-react';
import { DoctorFigure } from '@/components/common/DoctorAvatar.jsx';

const CHIPS = [
  { icon: BadgeCheck, label: 'Verified doctors' },
  { icon: Timer, label: 'Live queue' },
  { icon: Receipt, label: 'Instant receipt' },
];

function HospitalArt() {
  return (
    <svg viewBox="0 0 320 300" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <rect x="12" y="120" width="296" height="180" rx="10" fill="#fff" opacity="0.13" />
      <rect x="26" y="136" width="54" height="40" rx="5" fill="#fff" opacity="0.2" />
      <rect x="240" y="136" width="54" height="40" rx="5" fill="#fff" opacity="0.2" />
      <path d="M150 140h20v14h14v18h-14v14h-20v-14h-14v-18h14z" fill="#D62839" />
      <DoctorFigure gender="female" skin="#E8B896" hair="#3B2416" x="14" y="64" width="150" height="165" />
      <DoctorFigure gender="male" skin="#C98F68" hair="#1B1B1B" x="150" y="84" width="140" height="154" />
    </svg>
  );
}

export default function Hero({ children, onlineDoctors }) {
  const showOnline = typeof onlineDoctors === 'number';

  return (
    <section className="relative overflow-hidden bg-hero pb-14 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.18),transparent_45%)]"
      />
      <div className="container-page relative grid items-end gap-6 pt-8 sm:pt-10 md:grid-cols-[1.1fr_0.9fr] md:gap-8">
        <div className="pb-2">
          <h1 className="text-3xl font-bold xs:text-4xl lg:text-5xl">
            Your health, our responsibility. No waiting in line.
          </h1>
          <p className="mt-3 max-w-lg text-base text-white/90 sm:text-lg">
            Find verified doctors and clinics near you, book an appointment, and track your turn from home.
          </p>

          <div className="mt-5">{children}</div>

          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {CHIPS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Icon size={16} aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[300px] md:max-w-none">
          <HospitalArt />
          {showOnline && (
            <div className="absolute left-0 top-[6%] flex animate-float items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-ink shadow-pop">
              <span className="live-dot" />
              {onlineDoctors} {onlineDoctors === 1 ? 'doctor' : 'doctors'} online now
            </div>
          )}
          <div
            className="absolute right-0 top-[48%] flex animate-float items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-semibold text-ink shadow-pop"
            style={{ animationDelay: '1.5s' }}
          >
            <Timer size={16} className="text-brand" aria-hidden="true" />
            Track your turn live
          </div>
        </div>
      </div>
    </section>
  );
}