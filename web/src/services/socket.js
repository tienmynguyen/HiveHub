import { io } from 'socket.io-client';

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8889';
const SOCKET_URL = rawSocketUrl.replace(/\/+$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const connectSocket = (userId) => {
  if (!socket.connected) {
    socket.connect();
    if (userId) {
      socket.emit('register_user', userId);
    }
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinProjectRoom = (projectId) => {
  if (socket.connected && projectId) {
    socket.emit('join_project', projectId);
  }
};

export default socket;
