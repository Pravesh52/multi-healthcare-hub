import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import PosterSlider from '@/components/layout/PosterSlider.jsx';
import Hero from '@/components/home/Hero.jsx';
import SearchBox from '@/components/home/SearchBox.jsx';
import StatsRow from '@/components/home/StatsRow.jsx';
import ClinicCard from '@/components/home/ClinicCard.jsx';
import HelplineSection from '@/components/home/HelplineSection.jsx';
import Feedback from '@/components/home/Feedback.jsx';
import Button from '@/components/common/Button.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import useGeolocation from '@/hooks/useGeolocation.js';
import { getStates, getDistricts } from '@/services/location.service.js';
import { listClinics } from '@/services/clinic.service.js';
import { publicStatsQuery } from '@/services/stats.service.js';
import { isOpenNow } from '@/utils/isOpenNow.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open now' },
  { key: 'female', label: 'Female doctor' },
  { key: 'male', label: 'Male doctor' },
];
const SHOW = 5;
const NEAR_KM = 25;

const matches = (clinic, tab) => {
  if (tab === 'open') return isOpenNow(clinic.timings).open;
  if (tab === 'female') return clinic.doctors?.some((d) => d.gender === 'female');
  if (tab === 'male') return clinic.doctors?.some((d) => d.gender === 'male');
  return true;
};

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const geo = useGeolocation();

  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [coords, setCoords] = useState(null);
  const [tab, setTab] = useState('all');
  const [, setTick] = useState(0);
    // The user already allowed location earlier: use it without asking again
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current || geo.permission !== 'granted') return;
    autoTried.current = true;
    geo.request().then((c) => {
      if (c) setCoords(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.permission]);

  useEffect(() => {
    document.title = `${APP_NAME} - Find nearby doctors, no waiting in line`;
  }, []);

  // "Open now" must stay correct while the page is open
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // The menu links to /#helpline
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => clearTimeout(t);
  }, [hash]);

  // ---------- data ----------
  const stats = useQuery(publicStatsQuery);

  const statesQ = useQuery({ queryKey: ['states'], queryFn: getStates, staleTime: Infinity });
  const districtsQ = useQuery({
    queryKey: ['districts', state],
    queryFn: () => getDistricts(state),
    enabled: !!state,
    staleTime: Infinity,
  });

  useEffect(() => {
    const list = statesQ.data;
    if (!state && list?.length) setState(list.includes('Madhya Pradesh') ? 'Madhya Pradesh' : list[0]);
  }, [state, statesQ.data]);

  const clinicsQ = useQuery({
    queryKey: ['home-clinics', coords ? { lat: coords.lat, lng: coords.lng } : { state, district }],
    queryFn: () =>
      listClinics(coords ? { lat: coords.lat, lng: coords.lng, km: NEAR_KM, limit: 12 } : { state, district, limit: 12 }),
    enabled: !!coords || !!state,
  });

  // Tell the user when the location is blocked
  useEffect(() => {
    if (['denied', 'error', 'unsupported'].includes(geo.status) && geo.error) toast.error(geo.error);
  }, [geo.status, geo.error]);

  // ---------- actions ----------
  const onStateChange = (value) => {
    setState(value);
    setDistrict('');
    setCoords(null);
  };
  const onDistrictChange = (value) => {
    setDistrict(value);
    setCoords(null);
  };

  const onNearMe = async () => {
    const c = await geo.request();
    if (c) {
      setCoords(c);
      setTab('all');
      document.getElementById('clinics')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const searchParams = (q) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (coords) {
      p.set('lat', String(coords.lat));
      p.set('lng', String(coords.lng));
    } else {
      if (state) p.set('state', state);
      if (district) p.set('district', district);
    }
    return p.toString();
  };

  const onSearch = ({ q }) => navigate(`/search?${searchParams(q)}`);

  // ---------- what to show ----------
  const all = clinicsQ.data?.clinics ?? [];
  const filtered = all.filter((c) => matches(c, tab));
  const visible = filtered.slice(0, SHOW);
  const place = district || state;
  const title = coords ? 'Clinics near you' : place ? `Clinics in ${place}` : 'Clinics';
  const subtitle = coords
    ? `Within ${NEAR_KM} km of your location, nearest first.`
    : 'Verified clinics and hospitals, best rated first.';
  const loading = clinicsQ.isLoading || (!coords && !state && statesQ.isLoading);

  return (
    <>
      <PosterSlider />

      <Hero onlineDoctors={stats.data?.doctorsOnline}>
        <SearchBox
          states={statesQ.data || []}
          districts={districtsQ.data || []}
          state={state}
          district={district}
          onStateChange={onStateChange}
          onDistrictChange={onDistrictChange}
          onSearch={onSearch}
          onNearMe={onNearMe}
          nearLoading={geo.status === 'loading'}
          locationsLoading={statesQ.isLoading}
          locationsError={statesQ.isError}
        />
      </Hero>

      <StatsRow />

      <section id="clinics" className="scroll-mt-20 pb-10">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
              <p className="mt-1 text-muted">{subtitle}</p>
            </div>
            {coords && (
              <button type="button" onClick={() => setCoords(null)} className="btn btn-outline btn-sm">
                <X size={16} aria-hidden="true" /> Show by district
              </button>
            )}
          </div>

          <div className="scrollbar-none -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter clinics">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
                  tab === t.key ? 'border-brand bg-brand text-on-solid' : 'border-line bg-card text-ink hover:bg-soft'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : clinicsQ.isError ? (
              <ErrorState message={getErrorMessage(clinicsQ.error)} onRetry={() => clinicsQ.refetch()} />
            ) : all.length === 0 ? (
              <EmptyState
                title={coords ? 'No clinics within 25 km' : `No clinics in ${place || 'this area'} yet`}
                message="Try another district, or register your own clinic so patients can find you."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button to="/register/clinic">Register your clinic</Button>
                    {coords && (
                      <Button variant="outline" onClick={() => setCoords(null)}>
                        Show by district
                      </Button>
                    )}
                  </div>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                title="No clinic matches this filter"
                message="Try a different filter."
                action={
                  <Button variant="outline" onClick={() => setTab('all')}>
                    Show all clinics
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((c) => (
                  <ClinicCard key={c._id} clinic={c} />
                ))}
              </div>
            )}
          </div>

          {all.length > 0 && (
            <div className="mt-6 text-center">
              <Button to={`/search?${searchParams('')}`} variant="outline">
                View all clinics
              </Button>
            </div>
          )}
        </div>
      </section>

      <HelplineSection />
      <Feedback />
    </>
  );
}