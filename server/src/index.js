import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { store } from './store.js';
import { processFrame, buildSnapshot, resetAnalytics } from './analytics.js';

async function main() {
  await store.init();

  const app = express();
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Simple health + REST snapshot endpoints (handy for debugging / curl).
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', store: store.usingMongo ? 'mongodb' : 'in-memory' });
  });
  app.get('/api/analytics', (_req, res) => res.json(buildSnapshot()));
  app.post('/api/reset', async (_req, res) => {
    await resetAnalytics();
    io.emit('analytics', buildSnapshot());
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.clientOrigins, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    // Send the current snapshot immediately so the dashboard isn't empty.
    socket.emit('analytics', buildSnapshot());

    // A detection frame carries one or more 128-d descriptors from the browser.
    //   v2: { v:2, faces:[{descriptor:[...]}], ts }
    //   v1 (fallback): { descriptor:[...] }
    socket.on('detection', async (payload) => {
      try {
        const faces = Array.isArray(payload?.faces)
          ? payload.faces
          : payload?.descriptor
            ? [{ descriptor: payload.descriptor }]
            : [];
        if (!faces.length) return;

        const results = await processFrame(faces);
        const counted = results.filter((r) => r.type === 'new' || r.type === 'return');
        if (counted.length) {
          // Broadcast the updated snapshot once, plus a per-event message.
          io.emit('analytics', buildSnapshot());
          for (const event of counted) io.emit('event', event);
        }
      } catch (err) {
        console.warn('[socket] detection error:', err.message);
      }
    });

    socket.on('reset', async () => {
      await resetAnalytics();
      io.emit('analytics', buildSnapshot());
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  // Periodic heartbeat — presence + rolling heatmap are time-sensitive.
  setInterval(() => io.emit('analytics', buildSnapshot()), config.snapshotIntervalMs);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n────────────────────────────────────────────────────────────');
      console.error(`  ✖ Port ${config.port} is already in use.`);
      console.error('    Another instance of the backend is probably still running.');
      console.error('    Stop it, or start this one on a different port, e.g.:');
      console.error(`        PORT=4001 npm run dev   (and set VITE_SERVER_URL on the client)`);
      console.error('    On Windows you can find/kill the holder with:');
      console.error(`        npx kill-port ${config.port}`);
      console.error('────────────────────────────────────────────────────────────\n');
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(config.port, () => {
    console.log('============================================================');
    console.log(' Face Detection Visitor Analytics — Backend');
    console.log(`  Listening on   http://localhost:${config.port}`);
    console.log(`  Storage        ${store.usingMongo ? 'MongoDB' : 'in-memory (no MONGODB_URI)'}`);
    console.log(`  Allowed origins ${config.clientOrigins.join(', ')}`);
    console.log('============================================================');
  });

  // Graceful shutdown so the port is released cleanly on Ctrl-C / restart.
  const shutdown = () => {
    console.log('\n[server] shutting down…');
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
