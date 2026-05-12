import { io } from 'socket.io-client';

// Single shared socket instance — connects to same origin (proxied by Vite)
const socket = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
