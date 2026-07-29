import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore.js';

export default function NewVsReturningChart() {
  const totals = useStore((s) => s.snapshot.totals);
  const newV = totals.newVisitors || 0;
  const returning = totals.returningVisitors || 0;
  const unique = totals.uniqueVisitors || 0;

  const hasData = newV + returning > 0;
  const data = hasData
    ? [
        { name: 'New', value: newV, color: '#4f46e5' },
        { name: 'Returning', value: returning, color: '#d97706' },
      ]
    : [{ name: 'None', value: 1, color: '#e2e8f0' }];

  return (
    <div className="card card-hover flex h-full flex-col p-4">
      <h3 className="panel-title mb-1">New vs Returning</h3>
      <p className="panel-sub">share of unique people</p>

      <div className="relative mt-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={hasData ? 3 : 0}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none text-slate-900">{unique}</span>
          <span className="panel-sub mt-0.5">unique</span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" /> New {newV}
        </span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber" /> Returning {returning}
        </span>
      </div>
    </div>
  );
}
