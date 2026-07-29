import { io } from 'socket.io-client';
import { SERVER_URL } from './config.js';

// Single shared socket instance for the whole app.
export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
});

export function emitFaces(descriptors) {
  if (!socket.connected || !descriptors.length) return;
  // Float32Array -> plain array so it serialises cleanly over the wire.
  socket.emit('detection', {
    v: 2,
    faces: descriptors.map((d) => ({ descriptor: Array.from(d) })),
    ts: Date.now(),
  });
}

export function emitReset() {
  socket.emit('reset');
}
