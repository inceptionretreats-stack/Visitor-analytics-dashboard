import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore.js';

function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function EventFeed() {
  const events = useStore((s) => s.snapshot.recentEvents);
  const presentNow = useStore((s) => s.snapshot.totals.presentNow);

  return (
    <div className="card card-hover flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-success-soft text-xs">👥</span>
          <h3 className="panel-title">Present &amp; Recent</h3>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
          <span className={`h-1.5 w-1.5 rounded-full bg-success ${presentNow > 0 ? 'animate-pulse' : ''}`} />
          {presentNow} present now
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {events.length === 0 && (
          <p className="pt-2 text-xs text-slate-400">
            Waiting for arrivals… point your face at the camera.
          </p>
        )}
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div
              key={`${e.visitorId}-${e.at}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${e.type === 'new' ? 'bg-brand' : 'bg-amber'}`}
                />
                <span className="text-xs font-medium text-slate-700">
                  {e.type === 'new' ? 'New visitor' : `Returning · visit ${e.visitCount}`}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  #{String(e.visitorId).slice(0, 6)}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{timeAgo(e.at)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
