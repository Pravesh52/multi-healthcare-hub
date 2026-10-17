import axios from 'axios';
import { API_URL } from '@/utils/constants.js';

export const SESSION_KEY = 'mh_session'; // only says "this browser has a session"; the token is never stored

let accessToken = null;
let onAuthLost = null;
let refreshPromise = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

export const hasSessionFlag = () => {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
};
export const setSessionFlag = (on) => {
  try {
    if (on) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage can be blocked */
  }
};

// withCredentials: the refresh token travels in an httpOnly cookie
const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });
const bare = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 15000 }); // no interceptors

// If five calls need a new token at once, only one refresh really happens
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = bare
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setSessionFlag(true);
        return res.data;
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setAccessToken(null);
          setSessionFlag(false);
        }
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const AUTH_CALLS = /\/auth\/(login|refresh|patient|doctor|clinic|logout)/;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = AUTH_CALLS.test(original?.url || '');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && hasSessionFlag()) {
      original._retried = true;
      try {
        await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        if (refreshError.response?.status === 401) onAuthLost?.();
      }
    }
    return Promise.reject(error);
  }
);

// Unwraps axios: api.get(...) -> the JSON body
export const data = (promise) => promise.then((res) => res.data);

// Removes empty values so they do not go into the URL
export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Downloads a PDF (needs the login token, so a plain link would not work)
export const downloadFile = async (url, filename) => {
  try {
    const res = await api.get(url, { responseType: 'blob', params: { download: 1 }, timeout: 60000 });
    const blobUrl = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    // An error arrives as a blob. Turn it back into JSON so getErrorMessage can read it
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* keep as is */
      }
    }
    throw err;
  }
};

export default api;