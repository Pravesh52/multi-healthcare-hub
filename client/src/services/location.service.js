import api, { data } from './api.js';

// States and districts come from our own server
export const getStates = () => data(api.get('/locations/states')).then((d) => d.states);

export const getDistricts = (state) =>
  data(api.get('/locations/districts', { params: { state } })).then((d) => d.districts);

// OpenStreetMap's free Nominatim service. Do not wait forever if it is slow.
const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('The place service did not answer');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// A position -> a place name like "Station Road, Umaria, Madhya Pradesh"
export const reverseGeocode = async (lat, lng) => {
  const d = await fetchJson(
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en' +
      `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
  );
  const a = d.address || {};
  const area = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.city_district || a.county;
  const district = a.state_district || a.county;
  const parts = [area, district && district !== area ? district : null, a.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
};

// A place name -> a position. Returns null when nothing is found.
export const searchPlace = async (query) => {
  const list = await fetchJson(
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&accept-language=en' +
      `&q=${encodeURIComponent(query)}`
  );
  const first = Array.isArray(list) ? list[0] : null;
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name };
};