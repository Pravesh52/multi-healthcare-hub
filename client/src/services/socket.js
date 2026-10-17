import { io } from 'socket.io-client';
import { SOCKET_URL } from '@/utils/constants.js';
import { getAccessToken } from './api.js';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getAccessToken() }), // read again on every (re)connect
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};