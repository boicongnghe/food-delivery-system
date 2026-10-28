import { io } from 'socket.io-client';

let socket = null;

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('connect_error', () => {
    // Connection error handled silently
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
