import { useCallback, useEffect, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notification.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import useSocket from './useSocket.js';

export default function useNotifications({ unreadOnly = false, limit = 20 } = {}) {
  const { socket, setUnreadCount } = useSocket();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextPage = 1) => {
      setLoading(true);
      setError('');
      try {
        const d = await listNotifications({ page: nextPage, limit, unread: unreadOnly ? 'true' : undefined });
        setItems((prev) => (nextPage === 1 ? d.notifications : [...prev, ...d.notifications]));
        setPage(d.page);
        setPages(d.pages);
        setUnreadCount(d.unreadCount || 0);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [limit, unreadOnly, setUnreadCount]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // A new notification arrives live: show it at the top
  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (n) =>
      setItems((prev) => [
        { _id: n.id, type: n.type, title: n.title, message: n.message, data: n.data, createdAt: n.createdAt, read: false },
        ...prev,
      ]);
    socket.on('notification', onNew);
    return () => socket.off('notification', onNew);
  }, [socket]);

  const markRead = useCallback(
    async (id) => {
      const target = items.find((n) => n._id === id);
      if (!target || target.read) return;
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(id);
      } catch {
        setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)));
        setUnreadCount((c) => c + 1);
      }
    },
    [items, setUnreadCount]
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [setUnreadCount]);

  return {
    items,
    loading,
    error,
    hasMore: page < pages,
    loadMore: () => load(page + 1),
    refresh: () => load(1),
    markRead,
    markAllRead,
  };
}