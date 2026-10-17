import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, Stethoscope, Users } from 'lucide-react';
import { Skeleton } from '@/components/common/Loader.jsx';
import { publicStatsQuery } from '@/services/stats.service.js';

// Counts up from the number it showed before to the new number
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof target !== 'number') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * (1 - (1 - p) ** 3));
      fromRef.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Tile({ icon: Icon, label, value, hint, live = false }) {
  const shown = useCountUp(value);
  return (
    <div className="card flex flex-col items-center text-center shadow-card">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-brand">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="mt-2 text-3xl font-bold leading-none text-brand tabular-nums">{shown.toLocaleString('en-IN')}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
      {live ? (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ok">
          <span className="live-dot" /> Live
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export default function StatsRow() {
  const { data, isLoading, isError } = useQuery(publicStatsQuery);

  if (isError && !data) return null;

  return (
    <section aria-label="MultiHealth Care Hub at a glance" className="container-page relative -mt-8 mb-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading || !data ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)
        ) : (
          <>
            <Tile
              icon={Users}
              label="Patients registered"
              value={data.patients}
              hint={data.visits > 0 ? `${data.visits.toLocaleString('en-IN')} visits completed` : undefined}
            />
            <Tile icon={Stethoscope} label="Verified doctors" value={data.doctors} />
            <Tile icon={Building2} label="Clinics and hospitals" value={data.clinics} />
            <Tile icon={Activity} label="Doctors online now" value={data.doctorsOnline} live />
          </>
        )}
      </div>
    </section>
  );
}