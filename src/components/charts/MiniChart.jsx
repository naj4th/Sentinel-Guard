import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const COLORS = {
  temp:     '#ef4444',
  humidity: '#3b82f6',
  soil:     '#22c55e',
};

export default function MiniChart({ data, dataKey, color }) {
  const stroke = color || COLORS[dataKey] || '#6366f1';
  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad_${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={stroke} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={stroke} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={1.5} fill={`url(#grad_${dataKey})`} dot={false} />
        <Tooltip
          contentStyle={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, padding: '4px 8px' }}
          labelStyle={{ display: 'none' }}
          itemStyle={{ color: stroke }}
          formatter={v => [v, '']}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
