import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';
import Button from '@/components/common/Button.jsx';
import useGeolocation from '@/hooks/useGeolocation.js';
import { searchPlace } from '@/services/location.service.js';

const INDIA_CENTER = [22.9734, 78.6569];
const round = (n) => Math.round(n * 1e6) / 1e6;

const PIN = L.divIcon({
  className: 'mh-marker',
  html: `<div style="position:relative;width:44px;height:54px">
    <div style="width:44px;height:44px;border-radius:50%;background:#D62839;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
      <svg width="22" height="22" viewBox="0 0 34 34"><path d="M13 6h8v7h7v8h-7v7h-8v-7H6v-8h7z" fill="#fff"/></svg>
    </div>
    <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #D62839"></div>
  </div>`,
  iconSize: [44, 54],
  iconAnchor: [22, 54],
});

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }) });
  return null;
}

// Moves the map to a place chosen by search or GPS (not when the user taps the map)
function Focus({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 17);
  }, [target, map]);
  return null;
}

function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function LocationPicker({ value, onChange, error }) {
  const geo = useGeolocation();
  const [focus, setFocus] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');

  const place = (p) => {
    onChange({ lat: round(p.lat), lng: round(p.lng) });
    setFocus({ lat: p.lat, lng: p.lng });
  };

  const useMine = async () => {
    setNote('');
    const c = await geo.request();
    if (c) place(c);
  };

  const search = async (e) => {
    e.preventDefault();
    const text = query.trim();
    if (text.length < 3) {
      setNote('Type the name of your area or town.');
      return;
    }
    setSearching(true);
    setNote('');
    try {
      const r = await searchPlace(text);
      if (r) place(r);
      else setNote('We could not find that place. Try a nearby town, or tap the map yourself.');
    } catch {
      setNote('Place search is not working right now. You can tap the map to place the pin.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={search} className="flex flex-1 gap-2" role="search" aria-label="Search for your area">
          <label htmlFor="place-search" className="sr-only">
            Search for your area or town
          </label>
          <input
            id="place-search"
            className="input flex-1"
            placeholder="Search your area, for example: Station Road, Umaria"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" variant="outline" icon={Search} loading={searching} aria-label="Search place">
            <span className="hidden xs:inline">Search</span>
          </Button>
        </form>
        <Button variant="outline" icon={LocateFixed} loading={geo.status === 'loading'} onClick={useMine}>
          Use my current location
        </Button>
      </div>

      {(note || geo.error) && (
        <p role="alert" className="mt-2 text-sm font-medium text-warn">
          {note || geo.error}
        </p>
      )}

      <div className="relative mt-3 h-72 overflow-hidden rounded-2xl border border-line sm:h-96" role="region" aria-label="Map for placing the clinic pin">
        <MapContainer
          center={value ? [value.lat, value.lng] : INDIA_CENTER}
          zoom={value ? 16 : 5}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <ResizeWatcher />
          <Focus target={focus} />
          <ClickToPlace onPick={onChange} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={PIN}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  onChange({ lat: round(p.lat), lng: round(p.lng) });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="mt-2 text-sm text-muted">
        {value ? (
          <>
            Pin placed at <b className="text-ink">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</b>. Drag the pin to adjust it.
          </>
        ) : (
          'Tap on the map to place the pin at your clinic, or use one of the buttons above.'
        )}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}