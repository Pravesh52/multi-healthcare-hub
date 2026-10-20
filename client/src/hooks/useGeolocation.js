import { useCallback, useEffect, useRef, useState } from 'react';

// Straight-line distance between two points on the earth, in meters
export const distanceMeters = (a, b) => {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const MESSAGES = {
  denied: 'Location permission is blocked. Please allow it in your browser settings.',
  unavailable: 'Your device could not find its location. Turn on location (GPS) and try again.',
  timeout: 'Finding your location took too long. Please try again.',
  insecure: 'Location works only on secure (HTTPS) pages.',
  unsupported: 'Your browser does not support location.',
};

const getOnce = (options) =>
  new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

const fromPosition = (pos) => ({
  coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
  accuracy: Math.round(pos.coords.accuracy || 0),
});

// status: idle | loading | granted | denied | unsupported | error
// permission: unknown | prompt | granted | denied (what the browser has remembered)
export default function useGeolocation() {
  const [state, setState] = useState({ coords: null, accuracy: null, status: 'idle', error: '', updatedAt: null });
  const [permission, setPermission] = useState('unknown');
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);
  const lastCoords = useRef(null);

  // Ask the browser what the user already decided, and follow changes
  useEffect(() => {
    if (!navigator.permissions?.query) return undefined;
    let cancelled = false;
    let permStatus = null;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((s) => {
        if (cancelled) return;
        permStatus = s;
        setPermission(s.state);
        s.onchange = () => setPermission(s.state);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  const unsupportedReason = () => {
    if (!('geolocation' in navigator)) return 'unsupported';
    if (!window.isSecureContext) return 'insecure';
    return null;
  };

  const request = useCallback(async () => {
    const blocked = unsupportedReason();
    if (blocked) {
      setState((s) => ({ ...s, status: 'unsupported', error: MESSAGES[blocked] }));
      return null;
    }

    setState((s) => ({ ...s, status: 'loading', error: '' }));
    try {
      let pos;
      try {
        pos = await getOnce({ enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
      } catch (err) {
        if (err.code === 1) throw err; // the user said no
        pos = await getOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      }
      const next = fromPosition(pos);
      lastCoords.current = next.coords;
      setState({ ...next, status: 'granted', error: '', updatedAt: Date.now() });
      return next.coords;
    } catch (err) {
      const kind = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable';
      setState((s) => ({ ...s, status: kind === 'denied' ? 'denied' : 'error', error: MESSAGES[kind] }));
      return null;
    }
  }, []);

  const stopWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setWatching(false);
  }, []);

  // Live location: keeps updating while the user moves
  const startWatch = useCallback(() => {
    if (watchId.current != null || unsupportedReason()) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = fromPosition(pos);
        const prev = lastCoords.current;
        if (prev && distanceMeters(prev, next.coords) < 15) return; // not really moved
        lastCoords.current = next.coords;
        setState({ ...next, status: 'granted', error: '', updatedAt: Date.now() });
      },
      (err) => {
        if (err.code === 1) {
          setState((s) => ({ ...s, status: 'denied', error: MESSAGES.denied }));
          stopWatch();
        } // a timeout while watching is normal, so it is ignored
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    setWatching(true);
  }, [stopWatch]);

  useEffect(() => stopWatch, [stopWatch]); // stop when the page is closed

  return { ...state, permission, watching, request, startWatch, stopWatch };
}