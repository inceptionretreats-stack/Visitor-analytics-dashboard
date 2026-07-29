import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStore } from '../store/useStore.js';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-card">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-brand">{payload[0].value}</span> visit
        {payload[0].value === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function FootfallChart() {
  const timeline = useStore((s) => s.snapshot.timeline);
  const total = timeline.reduce((sum, t) => sum + (t.visits || 0), 0);

  return (
    <div className="card card-hover flex h-full flex-col p-5">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h3 className="panel-title">Footfall over last 24 hours</h3>
          <p className="panel-sub mt-0.5">visit check-ins per hour · rolling window</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold leading-none text-slate-900">{total}</div>
          <div className="panel-sub mt-0.5">visits / 24h</div>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="footfallFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
            <XAxis
              dataKey="hourLabel"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={3}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#c7d2fe', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="visits"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#footfallFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
