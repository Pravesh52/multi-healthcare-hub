import api, { data } from './api.js';

// States and districts come from our own server
export const getStates = () => data(api.get('/locations/states')).then((d) => d.states);

export const getDistricts = (state) =>
  data(api.get('/locations/districts', { params: { state } })).then((d) => d.districts);

// Turns a position into a place name. Uses OpenStreetMap's free Nominatim service.
export const reverseGeocode = async (lat, lng) => {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en' +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  // Do not wait forever if the service is slow
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('Could not find the place name');
    const d = await res.json();
    const a = d.address || {};
    const area = a.suburb || a.neighbourhood || a.village || a.town || a.city || a.city_district || a.county;
    const district = a.state_district || a.county;
    const parts = [area, district && district !== area ? district : null, a.state].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
  } finally {
    clearTimeout(timer);
  }
};