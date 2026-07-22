import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://egapi.arc360hub.com/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

function getToken() {
  try {
    const stored = localStorage.getItem('earthguesser-auth');
    if (stored) return JSON.parse(stored)?.state?.token || null;
  } catch {}
  return null;
}

let socket = null;

export function getDuelSocket() {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() }),
  });
  return socket;
}

export function disconnectDuelSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
