// Seeds the backend with synthetic visitors so the dashboard can be reviewed
// populated. Emits v2 multi-face frames and repeats them so identities pass the
// confirmFrames guard, then (after a short gap) re-sends some to create returns.
//
// For a good demo run the server with a short gap + wide presence window:
//   SESSION_GAP_SECONDS=2 PRESENCE_WINDOW_SECONDS=180 npm start
import { io } from 'socket.io-client';

const URL = process.argv[2] || 'http://localhost:4000';
const UNIQUE = Number(process.argv[3] || 9);

const socket = io(URL, { transports: ['websocket'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Distinct 128-d descriptor per identity (far enough apart to stay unique).
function descriptor(seed) {
  const v = new Array(128);
  for (let i = 0; i < 128; i++) v[i] = ((seed * 31 + i * 7) % 100) / 100;
  return v;
}

const frame = (seeds) =>
  socket.emit('detection', {
    v: 2,
    faces: seeds.map((s) => ({ descriptor: descriptor(s) })),
    ts: Date.now(),
  });

socket.on('connect', async () => {
  const all = Array.from({ length: UNIQUE }, (_, i) => i);

  // Confirm everyone as unique visitors (>= confirmFrames identical frames).
  for (let f = 0; f < 3; f++) {
    frame(all);
    await wait(120);
  }

  // After a gap, a few people "come back" -> returning visits.
  await wait(2600);
  const returners = all.slice(0, Math.min(4, UNIQUE));
  for (let f = 0; f < 3; f++) {
    frame(returners);
    await wait(120);
  }

  await wait(500);
  console.log(`seeded ${UNIQUE} unique visitors (+${returners.length} returns)`);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (e) => {
  console.error('connect_error:', e.message);
  process.exit(1);
});
