import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Count-up animation so KPI numbers feel alive on update.
function useCountUp(value) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const duration = 650;
    cancelAnimationFrame(rafRef.current);

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else {
        fromRef.current = to;
        startRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return display;
}

const TONES = {
  indigo: { num: 'text-brand', chip: 'bg-brand-soft', dot: 'bg-brand' },
  amber: { num: 'text-amber', chip: 'bg-amber-soft', dot: 'bg-amber' },
  blue: { num: 'text-blue2', chip: 'bg-blue-50', dot: 'bg-blue2' },
  green: { num: 'text-success', chip: 'bg-success-soft', dot: 'bg-success' },
};

export default function StatCard({
  label,
  value,
  sublabel,
  tone = 'indigo',
  icon,
  live = false,
  delay = 0,
}) {
  const display = useCountUp(value);
  const t = TONES[tone] || TONES.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 130, damping: 18 }}
      className="card card-hover p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${t.chip} text-sm`}>
          {icon}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className={`font-sans text-4xl font-bold leading-none tracking-tight ${t.num}`}>
          {display.toLocaleString()}
        </span>
        {live && value > 0 && (
          <span className="mb-1 flex items-center gap-1 text-[0.7rem] font-medium text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            live
          </span>
        )}
      </div>

      {sublabel && <p className="mt-1.5 text-xs text-slate-400">{sublabel}</p>}
    </motion.div>
  );
}
