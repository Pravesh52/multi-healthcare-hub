import { useCallback, useEffect, useState } from 'react';
import { getLiveQueue, getMyQueueStatus } from '@/services/queue.service.js';
import { getErrorMessage } from '@/utils/apiError.js';
import { todayIST } from '@/utils/formatDate.js';
import useSocket from './useSocket.js';

// ---------- Doctor or clinic: the full queue of one doctor ----------
export function useLiveQueue(doctorId = 'me') {
  const { socket } = useSocket();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { success, ...rest } = await getLiveQueue(doctorId);
      setQueue(rest);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (q) => {
      if (q.date !== todayIST()) return; // an update for another day is not for this screen
      if (doctorId !== 'me' && String(q.doctorId) !== String(doctorId)) return;
      setQueue(q);
    };
    socket.on('queue:update', onUpdate);
    socket.on('connect', refresh); // after a break in connection, load again
    return () => {
      socket.off('queue:update', onUpdate);
      socket.off('connect', refresh);
    };
  }, [socket, doctorId, refresh]);

  return { queue, loading, error, refresh };
}

// ---------- Patient: my place in today's queue ----------
export function usePatientQueue() {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const d = await getMyQueueStatus();
      setItems(d.appointments || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return undefined;
    const onStatus = (s) => {
      if (s.date !== todayIST()) return;
      setItems((list) => {
        if (!list.some((a) => String(a.appointmentId) === String(s.appointmentId))) {
          refresh(); // an appointment we did not know about yet
          return list;
        }
        return list.map((a) =>
          String(a.appointmentId) === String(s.appointmentId)
            ? {
                ...a,
                state: s.state,
                ahead: s.ahead,
                etaMinutes: s.etaMinutes,
                nowServingToken: s.nowServingToken,
                paused: s.paused,
              }
            : a
        );
      });
    };
    socket.on('queue:status', onStatus);
    socket.on('connect', refresh);
    return () => {
      socket.off('queue:status', onStatus);
      socket.off('connect', refresh);
    };
  }, [socket, refresh]);

  return { items, loading, error, refresh };
}

export default useLiveQueue;