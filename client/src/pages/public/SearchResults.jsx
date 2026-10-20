import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { List, LocateFixed, Map as MapIcon, Radio, Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ClinicCard from '@/components/home/ClinicCard.jsx';
import MapView from '@/components/booking/MapView.jsx';
import Button from '@/components/common/Button.jsx';
import Pagination from '@/components/common/Pagination.jsx';
import EmptyState, { ErrorState } from '@/components/common/EmptyState.jsx';
import { Skeleton } from '@/components/common/Loader.jsx';
import { Select } from '@/components/common/FormField.jsx';
import useGeolocation, { distanceMeters } from '@/hooks/useGeolocation.js';
import { getDistricts, getStates, reverseGeocode } from '@/services/location.service.js';
import { listClinics } from '@/services/clinic.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { APP_NAME } from '@/utils/constants.js';
import { CLINIC_TYPES, SPECIALITIES } from '@/data/specialities.js';

const PAGE_SIZE = 8;
const KM_OPTIONS = [5, 10, 25, 50];
const FEES = [200, 300, 500, 1000];
const MOVE_TO_REFRESH_M = 500; // in live mode, search again after moving this far

const num = (v) => (v == null || v === '' ? NaN : Number(v));

function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = (e) => setMatch(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return match;
}

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const geo = useGeolocation();
  const isDesktop = useIsDesktop();

  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const speciality = params.get('speciality') || '';
  const gender = params.get('gender') || '';
  const maxFees = params.get('maxFees') || '';
  const state = params.get('state') || '';
  const district = params.get('district') || '';
  const kmRaw = Number(params.get('km'));
  const km = KM_OPTIONS.includes(kmRaw) ? kmRaw : 10;
  const lat = num(params.get('lat'));
  const lng = num(params.get('lng'));
  const coords = useMemo(
    () =>
      Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null,
    [lat, lng]
  );

  const [qInput, setQInput] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [follow, setFollow] = useState(false);
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    document.title = `Find doctors and clinics - ${APP_NAME}`;
  }, []);

  const patch = (changes, { replace = false } = {}) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, String(v))));
        return next;
      },
      { replace }
    );

  const applyCoords = (c) =>
    patch({ lat: c.lat.toFixed(5), lng: c.lng.toFixed(5), state: '', district: '' }, { replace: true });

  // ---------- location ----------
  const useMyLocation = async () => {
    const c = await geo.request();
    if (c) applyCoords(c);
  };

  const clearLocation = () => {
    setFollow(false);
    patch({ lat: '', lng: '', km: '' });
  };

  // If the user already allowed location earlier, use it without asking again
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current) return;
    if (coords || state || district || q) {
      autoRef.current = true;
      return;
    }
    if (geo.permission === 'granted') {
      autoRef.current = true;
      geo.request().then((c) => c && applyCoords(c));
    } else if (geo.permission === 'prompt' || geo.permission === 'denied') {
      autoRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.permission]);

  // Live location on or off
  useEffect(() => {
    if (follow) geo.startWatch();
    else geo.stopWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow]);

  // While following, search again once the user has moved far enough
  useEffect(() => {
    if (!follow || !geo.coords) return;
    if (!coords || distanceMeters(geo.coords, coords) > MOVE_TO_REFRESH_M) applyCoords(geo.coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, geo.coords]);

  useEffect(() => {
    if (['denied', 'error', 'unsupported'].includes(geo.status) && geo.error) toast.error(geo.error);
  }, [geo.status, geo.error]);

  const placeQ = useQuery({
    queryKey: ['place', coords ? coords.lat.toFixed(3) : null, coords ? coords.lng.toFixed(3) : null],
    queryFn: () => reverseGeocode(coords.lat, coords.lng),
    enabled: !!coords,
    staleTime: Infinity,
    retry: false,
  });

  // ---------- data ----------
  const statesQ = useQuery({ queryKey: ['states'], queryFn: getStates, staleTime: Infinity });
  const districtsQ = useQuery({
    queryKey: ['districts', state],
    queryFn: () => getDistricts(state),
    enabled: !!state,
    staleTime: Infinity,
  });

  const filters = { q, type, speciality, gender, maxFees };
  const queryParams = coords
    ? { lat: coords.lat, lng: coords.lng, km, ...filters, limit: 50 }
    : { state, district, ...filters, limit: 50 };

  const clinicsQ = useQuery({
    queryKey: ['search-clinics', queryParams],
    queryFn: () => listClinics(queryParams),
    placeholderData: keepPreviousData,
  });

  const clinics = clinicsQ.data?.clinics ?? [];
  const total = clinicsQ.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(clinics.length / PAGE_SIZE));
  const visible = clinics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const loading = clinicsQ.isLoading;

  useEffect(() => setPage(1), [JSON.stringify(queryParams)]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = [type, speciality, gender, maxFees, q].filter(Boolean).length;
  const resetFilters = () => {
    patch({ q: '', type: '', speciality: '', gender: '', maxFees: '' });
    setQInput('');
  };

  const selectFromMap = (id) => {
    setActiveId(id);
    const idx = clinics.findIndex((c) => c._id === id);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
    if (isDesktop) setTimeout(() => document.getElementById(`clinic-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const userPosition = geo.coords
    ? { ...geo.coords, accuracy: geo.accuracy }
    : coords
    ? { ...coords, accuracy: 0 }
    : null;

  const denied = geo.permission === 'denied' || geo.status === 'denied';
  const wideAccuracy = coords && geo.accuracy > 1500;
  const nextKm = KM_OPTIONS.find((k) => k > km);

  // ---------- pieces ----------
  const locationBar = (
    <div className="card mb-4 space-y-3">
      {coords ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-semibold">
                <LocateFixed size={18} className="shrink-0 text-brand" aria-hidden="true" />
                Showing clinics near your location
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {placeQ.data ? <>You are near <b className="text-ink">{placeQ.data}</b></> : `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                {geo.accuracy > 0 && ` · accurate to about ${geo.accuracy < 1000 ? `${geo.accuracy} m` : `${(geo.accuracy / 1000).toFixed(1)} km`}`}
              </p>
            </div>
            <button type="button" onClick={clearLocation} className="btn btn-outline btn-sm">
              <X size={16} aria-hidden="true" /> Clear location
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Select label="Within" value={km} onChange={(e) => patch({ km: e.target.value }, { replace: true })}>
                {KM_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k} km
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--c-brand))]" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              <span className="font-medium">Follow my live location</span>
              {geo.watching && (
                <span className="badge badge-ok">
                  <Radio size={12} aria-hidden="true" /> Live
                </span>
              )}
            </label>
          </div>

          {wideAccuracy && (
            <p role="note" className="flex items-start gap-2 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              Your device gave only an approximate location. Computers often do this. On a phone with GPS on, the result is much more exact.
            </p>
          )}
        </>
      ) : denied ? (
        <div role="alert" className="space-y-2">
          <p className="flex items-center gap-2 font-semibold text-bad">
            <TriangleAlert size={18} aria-hidden="true" /> Location is blocked
          </p>
          <p className="text-sm text-muted">
            To see clinics near you, allow location: click the lock icon next to the address bar, open Site settings, set Location to Allow, then press the button below. Or choose a state and district instead.
          </p>
          <Button variant="outline" size="sm" icon={LocateFixed} loading={geo.status === 'loading'} onClick={useMyLocation}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">
            Allow your location to see the clinics closest to you on the map. Your location is used only to find nearby clinics. We do not save it in our database.
          </p>
          <Button icon={LocateFixed} loading={geo.status === 'loading'} onClick={useMyLocation}>
            Use my location
          </Button>
        </div>
      )}
    </div>
  );

  const list = (
    <div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : clinicsQ.isError && !clinicsQ.data ? (
        <ErrorState message={getErrorMessage(clinicsQ.error)} onRetry={() => clinicsQ.refetch()} />
      ) : clinics.length === 0 ? (
        <div className="card">
          <EmptyState
            title={coords ? `No clinics within ${km} km of your location` : 'No clinics match your search'}
            message={
              coords
                ? 'There is no verified clinic in this distance yet. Try a larger distance or search by district.'
                : 'Try other filters or another district.'
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {coords && nextKm && (
                  <Button onClick={() => patch({ km: nextKm }, { replace: true })}>Search within {nextKm} km</Button>
                )}
                {coords && (
                  <Button variant="outline" onClick={clearLocation}>
                    Search by district
                  </Button>
                )}
                {activeFilters > 0 && (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {visible.map((c) => (
              <div
                key={c._id}
                id={`clinic-${c._id}`}
                onMouseEnter={() => setActiveId(c._id)}
                className={clsx('scroll-mt-24 rounded-2xl transition-shadow', activeId === c._id && 'ring-2 ring-brand')}
              >
                <ClinicCard clinic={c} prefer={{ speciality, gender }} />
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pages={pages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-6"
          />
          {total > clinics.length && (
            <p className="mt-3 text-center text-sm text-muted">Showing the first {clinics.length} of {total} clinics. Use filters to narrow down.</p>
          )}
        </>
      )}
    </div>
  );

  const map =
    clinics.length > 0 || coords ? (
      <MapView
        clinics={clinics}
        userPosition={userPosition}
        activeId={activeId}
        onSelect={selectFromMap}
        className={isDesktop ? 'h-full' : 'h-[65vh] min-h-[320px]'}
      />
    ) : null;

  return (
    <div>
      {/* Search and filters */}
      <section className="border-b border-line bg-card">
        <div className="container-page py-4">
          <h1 className="text-2xl font-bold sm:text-3xl">Find doctors and clinics</h1>

          <form
            role="search"
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ q: qInput.trim() });
            }}
          >
            <label htmlFor="search-q" className="sr-only">
              Doctor, clinic or speciality
            </label>
            <input
              id="search-q"
              type="text"
              enterKeyHint="search"
              className="input flex-1"
              placeholder="Search doctor, clinic or speciality"
              value={qInput}
              maxLength={60}
              onChange={(e) => setQInput(e.target.value)}
            />
            <Button type="submit" icon={Search}>
              Search
            </Button>
            <Button
              variant="ghost"
              className="lg:hidden"
              icon={SlidersHorizontal}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>
          </form>

          <div className={clsx('mt-3 gap-3 sm:grid-cols-2 lg:grid-cols-4', filtersOpen ? 'grid' : 'hidden lg:grid')}>
            {!coords && (
              <>
                <Select label="State" value={state} onChange={(e) => patch({ state: e.target.value, district: '' })}>
                  <option value="">All states</option>
                  {(statesQ.data || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Select label="District" value={district} disabled={!state} onChange={(e) => patch({ district: e.target.value })}>
                  <option value="">All districts</option>
                  {(districtsQ.data || []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </>
            )}
            <Select label="Type" value={type} onChange={(e) => patch({ type: e.target.value })}>
              <option value="">Clinics, hospitals and labs</option>
              {CLINIC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select label="Speciality" value={speciality} onChange={(e) => patch({ speciality: e.target.value })}>
              <option value="">Any speciality</option>
              {SPECIALITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Doctor" value={gender} onChange={(e) => patch({ gender: e.target.value })}>
              <option value="">Male or female</option>
              <option value="female">Female doctor</option>
              <option value="male">Male doctor</option>
            </Select>
            <Select label="Fees up to" value={maxFees} onChange={(e) => patch({ maxFees: e.target.value })}>
              <option value="">Any fees</option>
              {FEES.map((f) => (
                <option key={f} value={f}>
                  ₹{f}
                </option>
              ))}
            </Select>
            {activeFilters > 0 && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" icon={X} onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>

          {!coords && (
            <div className="mt-3">
              <Button variant="outline" size="sm" icon={LocateFixed} loading={geo.status === 'loading'} onClick={useMyLocation}>
                Near me
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="container-page py-4">
        {coords || denied || (!state && !district) ? locationBar : null}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-muted" aria-live="polite">
            {loading ? 'Searching...' : `${total} ${total === 1 ? 'clinic' : 'clinics'} found`}
            {clinicsQ.isFetching && !loading && ' · updating'}
          </p>
        </div>

        {isDesktop ? (
          <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6">
            {list}
            <div className="sticky top-20 h-[calc(100vh-6rem)]">{map}</div>
          </div>
        ) : (
          <>
            {map && (
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-soft p-1" role="tablist" aria-label="Show results as">
                {[
                  ['list', 'List', List],
                  ['map', 'Map', MapIcon],
                ].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={clsx(
                      'flex min-h-[44px] items-center justify-center gap-2 rounded-lg font-semibold',
                      view === key ? 'bg-card text-brand shadow' : 'text-muted'
                    )}
                  >
                    <Icon size={18} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            )}
            {view === 'map' && map ? map : list}
          </>
        )}
      </div>
    </div>
  );
}