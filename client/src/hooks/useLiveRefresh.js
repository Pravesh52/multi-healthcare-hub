import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useSocket from './useSocket.js';

// queryKeys: the first part of the query keys to refresh, for example ['my-appts']
export default function useLiveRefresh(queryKeys = []) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const keyString = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!socket) return undefined;
    const onNotification = () => {
      JSON.parse(keyString).forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [socket, queryClient, keyString]);
}