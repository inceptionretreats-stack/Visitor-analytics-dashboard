import { useStore } from '../store/useStore.js';

// Indigo intensity ramp from a normalised value (0..1).
function intensityStyle(t, isCurrent) {
  let bg;
  if (t <= 0) bg = '#f1f5f9';
  else if (t < 0.34) bg = '#e0e7ff';
  else if (t < 0.67) bg = '#a5b4fc';
  else bg = '#4f46e5';
  return {
    background: bg,
    boxShadow: t > 0.66 ? '0 0 10px rgba(79,70,229,0.4)' : 'none',
    outline: isCurrent ? '2px solid #4f46e5' : 'none',
    outlineOffset: isCurrent ? '1px' : 0,
  };
}

export default function RollingHeatmap() {
  const timeline = useStore((s) => s.snapshot.timeline);
  const counts = timeline.map((t) => t.count || 0);
  const max = Math.max(1, ...counts);
  const peak = timeline.reduce(
    (best, t) => (t.count > (best?.count ?? -1) ? t : best),
    null
  );

  return (
    <div className="card card-hover flex h-full flex-col p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-xs">🗺️</span>
          <div>
            <h3 className="panel-title">Crowd heatmap · last 24h</h3>
            <p className="panel-sub mt-0.5">new arrivals per hour</p>
          </div>
        </div>
        {peak && peak.count > 0 && (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[0.7rem] font-medium text-brand">
            busiest {peak.hourLabel} · {peak.count}
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-12 gap-1.5 sm:grid-cols-12 lg:flex lg:items-end">
        {timeline.length === 0
          ? Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-square w-full rounded-md bg-slate-100 lg:flex-1" />
            ))
          : timeline.map((slot) => (
              <div key={slot.startTs} className="flex flex-col items-center gap-1 lg:flex-1">
                <div
                  className="aspect-square w-full rounded-md ring-1 ring-slate-200/60 transition-all duration-300 hover:scale-110 lg:aspect-auto lg:h-12"
                  style={intensityStyle(slot.count / max, slot.isCurrent)}
                  title={`${slot.hourLabel} — ${slot.count} new ${slot.count === 1 ? 'arrival' : 'arrivals'}`}
                />
                {Number(slot.hourLabel.slice(0, 2)) % 3 === 0 && (
                  <span className="text-[8px] tabular-nums text-slate-400">
                    {slot.hourLabel.slice(0, 2)}
                  </span>
                )}
              </div>
            ))}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[0.65rem] text-slate-400">
        <span>quiet</span>
        <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-slate-100 via-[#a5b4fc] to-brand" />
        <span>busy</span>
      </div>
    </div>
  );
}
