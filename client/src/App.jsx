import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { socket, emitReset } from './socket.js';
import { useStore } from './store/useStore.js';
import CameraFeed from './components/CameraFeed.jsx';
import StatCard from './components/StatCard.jsx';
import FootfallChart from './components/FootfallChart.jsx';
import NewVsReturningChart from './components/NewVsReturningChart.jsx';
import RollingHeatmap from './components/RollingHeatmap.jsx';
import EventFeed from './components/EventFeed.jsx';
import TopVisitors from './components/TopVisitors.jsx';

function StatusChip({ ok, okText, pending }) {
  return (
    <span
      className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:flex ${
        ok
          ? 'border-success/20 bg-success-soft text-success'
          : 'border-amber/20 bg-amber-soft text-amber'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-amber animate-pulse'}`} />
      {ok ? okText : pending}
    </span>
  );
}

export default function App() {
  const connected = useStore((s) => s.connected);
  const totals = useStore((s) => s.snapshot.totals);
  const modelStatus = useStore((s) => s.modelStatus);
  const cameraStatus = useStore((s) => s.cameraStatus);
  const setConnected = useStore((s) => s.setConnected);
  const setSnapshot = useStore((s) => s.setSnapshot);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onAnalytics = (snap) => setSnapshot(snap);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('analytics', onAnalytics);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('analytics', onAnalytics);
    };
  }, [setConnected, setSnapshot]);

  const handleReset = () => {
    if (window.confirm('Clear all visitor data and analytics?')) emitReset();
  };

  return (
    <div className="app-bg min-h-screen px-4 py-6 md:px-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-xl text-white shadow-[0_6px_16px_-4px_rgba(79,70,229,0.5)]">
            👁️
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none tracking-tight text-slate-900 md:text-2xl">
              Visitor Analytics
            </h1>
            <p className="mt-1.5 text-xs text-slate-500">
              Real-time face-detection footfall · privacy-first
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusChip ok={modelStatus === 'ready'} okText="AI READY" pending="LOADING AI" />
          <StatusChip ok={cameraStatus === 'live'} okText="CAMERA" pending="NO CAMERA" />
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              connected
                ? 'border-success/20 bg-success-soft text-success'
                : 'border-rose/20 bg-rose-soft text-rose'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-rose'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <button
            onClick={handleReset}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose/40 hover:text-rose"
          >
            Reset
          </button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-7xl space-y-4">
        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Unique Visitors"
            value={totals.uniqueVisitors}
            sublabel="distinct people · counted once"
            tone="indigo"
            icon="🧍"
            delay={0.02}
          />
          <StatCard
            label="Returning"
            value={totals.returningVisitors}
            sublabel="came back for another visit"
            tone="amber"
            icon="🔁"
            delay={0.06}
          />
          <StatCard
            label="Total Visits"
            value={totals.totalVisits}
            sublabel="footfall · all check-ins"
            tone="blue"
            icon="📈"
            delay={0.1}
          />
          <StatCard
            label="Present Now"
            value={totals.presentNow}
            sublabel="people in frame right now"
            tone="green"
            icon="🟢"
            live
            delay={0.14}
          />
        </section>

        {/* Footfall + Camera */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <FootfallChart />
          </div>
          <div className="order-first lg:order-none lg:col-span-4">
            <CameraFeed />
          </div>
        </section>

        {/* Donut + Heatmap + Present/Recent */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="sm:col-span-1 lg:col-span-3">
            <NewVsReturningChart />
          </div>
          <div className="lg:col-span-5">
            <RollingHeatmap />
          </div>
          <div className="lg:col-span-4">
            <EventFeed />
          </div>
        </section>

        {/* Frequent visitors */}
        <section>
          <TopVisitors />
        </section>
      </main>

      <footer className="mx-auto mt-8 max-w-7xl text-center text-xs text-slate-400">
        Privacy-first · only 128-d face embeddings are stored, never raw images · each person is
        recognised once
      </footer>
    </div>
  );
}
