import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/context/ThemeContext.jsx';
import { formatDate } from '@/utils/formatDate.js';

export const useChartColors = () => {
  const { isDark } = useTheme();
  return isDark
    ? { ok: '#4ADE80', bad: '#F87171', brand: '#38B2C6', text: '#9DB8BE', grid: '#244650', card: '#13292F', ink: '#E6F3F5' }
    : { ok: '#16A34A', bad: '#DC2626', brand: '#0B7285', text: '#566F78', grid: '#D6E5E8', card: '#FFFFFF', ink: '#12303A' };
};

const dayTick = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}`;
};

export default function DailyChart({ data = [], height = 260 }) {
  const c = useChartColors();
  const rows = data.map((d) => ({ ...d, upcoming: Math.max(0, d.booked - d.completed - d.noShow) }));

  if (rows.every((d) => d.booked === 0)) {
    return <p className="py-10 text-center text-muted">No visits in this period.</p>;
  }

  return (
    <div role="img" aria-label="Bar chart of patients per day">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayTick} tick={{ fill: c.text, fontSize: 12 }} interval="preserveStartEnd" minTickGap={18} />
          <YAxis allowDecimals={false} tick={{ fill: c.text, fontSize: 12 }} />
          <Tooltip
            labelFormatter={formatDate}
            contentStyle={{ background: c.card, border: `1px solid ${c.grid}`, borderRadius: 12, color: c.ink }}
            labelStyle={{ color: c.ink, fontWeight: 700 }}
            cursor={{ fill: c.grid, opacity: 0.4 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="completed" name="Completed" stackId="a" fill={c.ok} />
          <Bar dataKey="noShow" name="No-show" stackId="a" fill={c.bad} />
          <Bar dataKey="upcoming" name="Not finished" stackId="a" fill={c.brand} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}