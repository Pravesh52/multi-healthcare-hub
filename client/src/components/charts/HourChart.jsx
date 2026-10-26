import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from './DailyChart.jsx';

const hourLabel = (h) => {
  const n = Number(h);
  return `${n % 12 || 12} ${n >= 12 ? 'PM' : 'AM'}`;
};

export default function HourChart({ data = [], height = 240 }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ hour: hourLabel(d.hour), count: d.count }));
  const max = Math.max(0, ...rows.map((r) => r.count));

  if (!rows.length || max === 0) {
    return <p className="py-10 text-center text-muted">No visits in this period.</p>;
  }

  return (
    <div role="img" aria-label="Bar chart of patients by hour of the day">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" tick={{ fill: c.text, fontSize: 12 }} interval="preserveStartEnd" minTickGap={10} />
          <YAxis allowDecimals={false} tick={{ fill: c.text, fontSize: 12 }} />
          <Tooltip
            formatter={(v) => [v, 'Patients']}
            contentStyle={{ background: c.card, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.ink }}
            labelStyle={{ color: c.ink, fontWeight: 700 }}
            cursor={{ fill: c.grid, opacity: 0.4 }}
          />
          <Bar dataKey="count" name="Patients" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.hour} fill={r.count === max ? c.brand : `${c.brand}88`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}