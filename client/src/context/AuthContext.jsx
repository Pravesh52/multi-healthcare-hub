import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as authService from '@/services/auth.service.js';
import {
  SESSION_KEY,
  hasSessionFlag,
  refreshAccessToken,
  setAccessToken,
  setAuthLostHandler,
  setSessionFlag,
} from '@/services/api.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // doctor or clinic details
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setSessionFlag(false);
    setUser(null);
    setProfile(null);
    queryClient.clear(); // the next person must not see this person's data
  }, [queryClient]);

  const loadMe = useCallback(async () => {
    const d = await authService.me();
    setUser(d.user);
    setProfile(d.profile || null);
    return d;
  }, []);

  const startSession = useCallback(
    async (accessToken, nextUser) => {
      setAccessToken(accessToken);
      setSessionFlag(true);
      setUser(nextUser);
      try {
        return (await loadMe()).user;
      } catch {
        return nextUser;
      }
    },
    [loadMe]
  );

  // The login ended while the app was open (for example the account was disabled)
  useEffect(() => {
    setAuthLostHandler(() => {
      clearSession();
      toast.error('Your session ended. Please log in again.');
    });
    return () => setAuthLostHandler(null);
  }, [clearSession]);

  // On page load: if this browser had a session, get a new token quietly
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasSessionFlag()) {
        setLoading(false);
        return;
      }
      try {
        const d = await refreshAccessToken();
        if (cancelled) return;
        setUser(d.user);
        await loadMe();
      } catch (err) {
        if (!cancelled && err?.response?.status === 401) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, clearSession]);

  // Logged out in another tab: log out here too
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSION_KEY && e.newValue === null) {
        setAccessToken(null);
        setUser(null);
        setProfile(null);
        queryClient.clear();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  const verifyOtp = useCallback(
    async (body) => {
      const d = await authService.verifyOtp(body);
      const u = await startSession(d.accessToken, d.user);
      return { ...d, user: u };
    },
    [startSession]
  );

  const login = useCallback(
    async (body) => {
      const d = await authService.login(body);
      const u = await startSession(d.accessToken, d.user);
      return { ...d, user: u };
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* the local session is cleared anyway */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      role: user?.role || null,
      isAuthenticated: !!user,
      sendOtp: authService.sendOtp,
      verifyOtp,
      login,
      logout,
      reloadMe: loadMe,
    }),
    [user, profile, loading, verifyOtp, login, logout, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}