// Central front-end configuration.
// The backend URL can be overridden at build/run time with VITE_SERVER_URL.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Path (relative to /public) where the face-api.js model weights live.
export const MODELS_URL = '/models';

// How often we run the detection loop (ms). The spec suggests ~300ms.
export const DETECTION_INTERVAL_MS = 350;

// How often we forward recognised descriptors to the backend (ms).
// Throttled so continuously-visible faces don't flood the socket.
export const EMIT_INTERVAL_MS = 800;

// Maximum number of simultaneous faces to detect/track per frame.
export const MAX_FACES = 8;
