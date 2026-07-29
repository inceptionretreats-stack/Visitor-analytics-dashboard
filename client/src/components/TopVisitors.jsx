import { useStore } from '../store/useStore.js';

export default function TopVisitors() {
  const top = useStore((s) => s.snapshot.topVisitors);
  const max = Math.max(1, ...top.map((v) => v.visitCount));

  return (
    <div className="card card-hover p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-soft text-xs">🏆</span>
        <h3 className="panel-title">Frequent Visitors</h3>
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-slate-400">No recognised visitors yet.</p>
      ) : (
        <div className="space-y-3">
          {top.map((v, i) => (
            <div key={v.id} className="flex items-center gap-3">
              <span className="w-4 text-xs font-semibold text-slate-400">{i + 1}</span>
              <span className="w-16 font-mono text-xs text-slate-500">#{v.id}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-blue2 transition-all duration-500"
                  style={{ width: `${(v.visitCount / max) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right text-xs font-semibold text-slate-700">
                {v.visitCount} {v.visitCount === 1 ? 'visit' : 'visits'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
