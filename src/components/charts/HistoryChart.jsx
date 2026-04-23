import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function HistoryChart({ data, keys, thresholds = {} }) {
  const COLORS = { temp: '#ef4444', humidity: '#3b82f6', soil: '#22c55e' };
  const LABELS = {
    node01_temp: 'Node 01 Temp', node02_temp: 'Node 02 Temp',
    node01_humidity: 'Node 01 Humidity', node02_humidity: 'Node 02 Humidity',
    node01_soil: 'Node 01 Soil', node02_soil: 'Node 02 Soil',
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} interval={5} />
        <YAxis tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontFamily: 'JetBrains Mono' }}
          itemStyle={{ padding: '1px 0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {Object.entries(thresholds).map(([k, v]) => (
          <ReferenceLine key={k} y={v} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} />
        ))}
        {keys.map((k, i) => {
          const type = k.includes('temp') ? 'temp' : k.includes('humidity') ? 'humidity' : 'soil';
          const colors = ['#ef4444','#f87171','#3b82f6','#93c5fd','#22c55e','#86efac'];
          return (
            <Line key={k} type="monotone" dataKey={k} name={LABELS[k] || k}
              stroke={colors[i % colors.length]} strokeWidth={1.5} dot={false}
              activeDot={{ r: 4 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
