import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from '@/services/socket.js';
import { refreshAccessToken } from '@/services/api.js';
import { getUnreadCount } from '@/services/notification.service.js';
import useAuth from '@/hooks/useAuth.js';

export const SocketContext = createContext(null);

const MAX_RETRIES = 3;

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const userId = user?._id;
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const d = await getUnreadCount();
      setUnreadCount(d.unreadCount || 0);
    } catch {
      /* the bell is not important enough to show an error */
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      setUnreadCount(0);
      return undefined;
    }

    const s = connectSocket();
    setSocket(s);
    setConnected(s.connected);

    let retries = 0;
    let busy = false;
    // The token lasts 15 minutes. When the server ends the connection, get a new token and reconnect.
    const reconnectWithFreshToken = async () => {
      if (busy || retries >= MAX_RETRIES) return;
      busy = true;
      retries += 1;
      try {
        await refreshAccessToken();
        s.connect();
      } catch {
        /* the session is over: AuthContext takes care of it */
      } finally {
        busy = false;
      }
    };

    const onConnect = () => {
      retries = 0;
      setConnected(true);
      refreshUnread();
    };
    const onDisconnect = (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') reconnectWithFreshToken();
    };
    const onConnectError = (err) => {
      if (['AUTH_INVALID', 'AUTH_REQUIRED'].includes(err?.message)) reconnectWithFreshToken();
    };
    const onNotification = (n) => {
      setUnreadCount((c) => c + 1);
      toast(`${n.title}: ${n.message}`, { icon: '🔔', duration: 6000 });
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('auth:expired', reconnectWithFreshToken);
    s.on('notification', onNotification);
    if (s.connected) refreshUnread();

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.off('auth:expired', reconnectWithFreshToken);
      s.off('notification', onNotification);
    };
  }, [userId, refreshUnread]);

  const value = useMemo(
    () => ({ socket, connected, unreadCount, setUnreadCount, refreshUnread }),
    [socket, connected, unreadCount, refreshUnread]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}