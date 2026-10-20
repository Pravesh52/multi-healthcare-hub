import { useEffect, useRef } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';
import clsx from 'clsx';
import { isOpenNow } from '@/utils/isOpenNow.js';

const INDIA_CENTER = [22.9734, 78.6569];

// Pins are drawn with HTML, so no image files can go missing
const makeClinicIcon = (active) => {
  const s = active ? 44 : 36;
  const bg = active ? '#D62839' : '#ffffff';
  const fg = active ? '#ffffff' : '#D62839';
  return L.divIcon({
    className: 'mh-marker',
    html: `<div style="position:relative;width:${s}px;height:${s + 10}px">
      <div style="width:${s}px;height:${s}px;border-radius:50%;background:${bg};border:3px solid #D62839;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
        <svg width="${s * 0.5}" height="${s * 0.5}" viewBox="0 0 34 34"><path d="M13 6h8v7h7v8h-7v7h-8v-7H6v-8h7z" fill="${fg}"/></svg>
      </div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #D62839"></div>
    </div>`,
    iconSize: [s, s + 10],
    iconAnchor: [s / 2, s + 10],
    popupAnchor: [0, -(s + 6)],
  });
};

const CLINIC_ICON = makeClinicIcon(false);
const CLINIC_ICON_ACTIVE = makeClinicIcon(true);
const USER_ICON = L.divIcon({
  className: 'mh-marker',
  html: '<div class="mh-user-dot"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// [latitude, longitude] of a clinic (the server stores [longitude, latitude])
const coordsOf = (clinic) => {
  const c = clinic?.location?.coordinates;
  return Array.isArray(c) && c.length === 2 ? [c[1], c[0]] : null;
};

export const directionsUrl = (clinic) => {
  const p = coordsOf(clinic);
  return p ? `https://www.google.com/maps/dir/?api=1&destination=${p[0]},${p[1]}` : '#';
};

const fit = (map, points, single) => {
  if (!points.length) return;
  if (points.length === 1) {
    map.setView(points[0], single ? 15 : 14);
    return;
  }
  map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
};

// Fits the map only when the set of places changes, so a user who moves the map is not pulled back
function FitBounds({ points, signature, single }) {
  const map = useMap();
  useEffect(() => {
    fit(map, points, single);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

// The map must re-measure itself when its box changes size
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function RecenterButton({ points, single }) {
  const map = useMap();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);
  if (points.length < 1) return null;
  return (
    <div ref={ref} className="absolute right-2.5 top-2.5 z-[1000]">
      <button
        type="button"
        onClick={() => fit(map, points, single)}
        aria-label="Show all places on the map"
        title="Recenter"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-ink shadow hover:bg-soft"
      >
        <Crosshair size={20} />
      </button>
    </div>
  );
}

export default function MapView({
  clinics = [],
  userPosition = null, // { lat, lng, accuracy }
  activeId = null,
  onSelect,
  single = false,
  lockOnTouch = false,
  className = '',
}) {
  const items = clinics.map((c) => ({ c, pos: coordsOf(c) })).filter((x) => x.pos);
  const points = items.map((x) => x.pos);
  if (userPosition) points.push([userPosition.lat, userPosition.lng]);
  const signature = items.map((x) => x.c._id).join(',') + (userPosition ? '|u' : '');

  return (
    <div role="region" aria-label="Map" className={clsx('relative overflow-hidden rounded-2xl border border-line', className)}>
      <MapContainer
        center={points[0] || INDIA_CENTER}
        zoom={points.length ? 13 : 5}
        scrollWheelZoom={false}
        dragging={!(lockOnTouch && L.Browser.mobile)}
        className="h-full w-full"
        style={{ minHeight: 240 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ResizeWatcher />
        <FitBounds points={points} signature={signature} single={single} />
        <RecenterButton points={points} single={single} />

        {userPosition && userPosition.accuracy > 0 && userPosition.accuracy < 5000 && (
          <Circle
            center={[userPosition.lat, userPosition.lng]}
            radius={userPosition.accuracy}
            pathOptions={{ color: '#2563EB', weight: 1, fillOpacity: 0.1 }}
          />
        )}
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={USER_ICON} zIndexOffset={500}>
            <Popup>
              <div className="font-semibold">You are here</div>
              {userPosition.accuracy > 0 && <div className="text-xs">Accurate to about {userPosition.accuracy} m</div>}
            </Popup>
          </Marker>
        )}

        {items.map(({ c, pos }) => {
          const status = isOpenNow(c.timings);
          const active = c._id === activeId;
          return (
            <Marker
              key={c._id}
              position={pos}
              icon={active ? CLINIC_ICON_ACTIVE : CLINIC_ICON}
              zIndexOffset={active ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(c._id) }}
              title={c.name}
            >
              <Popup>
                <div className="min-w-[180px] space-y-1">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs">
                    <b className={status.open ? 'text-ok' : 'text-bad'}>{status.label}</b>
                    {typeof c.distanceMeters === 'number' &&
                      ` · ${c.distanceMeters < 1000 ? `${Math.round(c.distanceMeters)} m` : `${(c.distanceMeters / 1000).toFixed(1)} km`} away`}
                  </div>
                  <div className="text-xs">
                    {c.doctors?.length || 0} {(c.doctors?.length || 0) === 1 ? 'doctor' : 'doctors'}
                  </div>
                  <div className="flex gap-3 pt-1 text-sm font-semibold">
                    <Link to={`/clinics/${c._id}`} className="!text-brand hover:underline">
                      View and book
                    </Link>
                    <a href={directionsUrl(c)} target="_blank" rel="noreferrer" className="!text-brand hover:underline">
                      Directions
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}