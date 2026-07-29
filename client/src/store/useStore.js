import { create } from 'zustand';

const emptySnapshot = {
  totals: {
    uniqueVisitors: 0, // distinct people, counted once forever (headline)
    returningVisitors: 0, // distinct people with > 1 visit
    newVisitors: 0, // uniqueVisitors - returningVisitors
    totalVisits: 0, // footfall: sum of visits
    presentNow: 0, // people currently in frame
  },
  timeline: [], // rolling last 24h: { hourLabel, startTs, count, visits, isCurrent }
  topVisitors: [], // [{ id, visitCount, lastSeen }]
  recentEvents: [], // [{ type:'new'|'return', visitorId, visitCount, at }]
  updatedAt: 0,
};

export const useStore = create((set) => ({
  // connection + pipeline status
  connected: false,
  modelStatus: 'idle', // idle | loading | ready | error
  cameraStatus: 'idle', // idle | starting | live | error | denied
  detecting: false,
  facePresent: false,
  lastDistance: null,

  // analytics snapshot from the backend
  snapshot: emptySnapshot,

  setConnected: (connected) => set({ connected }),
  setModelStatus: (modelStatus) => set({ modelStatus }),
  setCameraStatus: (cameraStatus) => set({ cameraStatus }),
  setDetecting: (detecting) => set({ detecting }),
  setFacePresent: (facePresent) => set({ facePresent }),
  setLastDistance: (lastDistance) => set({ lastDistance }),
  setSnapshot: (snapshot) => set({ snapshot }),
}));
