import { useCallback, useState } from 'react';

// status: idle | loading | granted | denied | unsupported | error
export default function useGeolocation() {
  const [state, setState] = useState({ coords: null, status: 'idle', error: '' });

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          setState({ coords: null, status: 'unsupported', error: 'Your browser does not support location.' });
          resolve(null);
          return;
        }
        setState((s) => ({ ...s, status: 'loading', error: '' }));
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setState({ coords, status: 'granted', error: '' });
            resolve(coords);
          },
          (err) => {
            const denied = err.code === 1;
            setState({
              coords: null,
              status: denied ? 'denied' : 'error',
              error: denied
                ? 'Location permission is blocked. Please allow it in your browser settings.'
                : 'Could not get your location. Please try again.',
            });
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      }),
    []
  );

  return { ...state, request };
}