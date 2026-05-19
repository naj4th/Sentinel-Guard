import { useState } from 'react';
import { useSystemLogs } from '../hooks/useData';

const LEVEL_STYLE = {
  ERROR: { color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-b)' },
  WARN:  { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-b)' },
  INFO:  { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-b)' },
  DEBUG: { color: 'var(--text3)', bg: 'var(--bg3)',      border: 'var(--border)' },
};

export default function LogsPage() {
  const { data: logs, loading, error } = useSystemLogs();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l => {
    if (filter !== 'ALL' && l.level !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.msg.toLowerCase().includes(q) && !l.source.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">System logs</div>
          <div className="page-sub">Auth · HMAC · ML · MQTT · Firestore · Admin only</div>
        </div>
        <div className="hdr-btns">
          <button className="btn" onClick={() => exportLogs(filtered)}>↓ Export</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map(l => (
          <button
            key={l}
            className={`btn${filter === l ? ' primary' : ''}`}
            onClick={() => setFilter(l)}
            style={filter === l && l !== 'ALL'
              ? { borderColor: LEVEL_STYLE[l]?.border, color: LEVEL_STYLE[l]?.color, background: LEVEL_STYLE[l]?.bg }
              : {}}
          >
            {l}
          </button>
        ))}
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 180, maxWidth: 280, height: 34, padding: '7px 12px' }}
          placeholder="Search logs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Log entries</span>
          <span className="panel-meta">{loading ? '…' : `${filtered.length} entries`}</span>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> Loading logs…</div>
        ) : error ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p>Could not load logs</p>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{error}</span>
            <span style={{ marginTop: 6 }}>Check Firestore rules for the system_logs collection</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p>No log entries</p>
            <span>Try a different filter</span>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
            {filtered.map((l, i) => {
              const s = LEVEL_STYLE[l.level] || LEVEL_STYLE.DEBUG;
              return (
                <div key={l.id} style={{
                  display: 'flex', gap: 12, padding: '8px 16px', alignItems: 'flex-start',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  <span style={{ color: 'var(--text3)', flexShrink: 0, fontSize: 11 }}>{l.ts}</span>
                  <span style={{
                    color: s.color, background: s.bg, border: `1px solid ${s.border}`,
                    borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                    flexShrink: 0, letterSpacing: '0.05em',
                  }}>
                    {l.level}
                  </span>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{l.source}</span>
                  <span style={{ color: 'var(--text)', flex: 1, lineHeight: 1.5 }}>{l.msg}</span>
                  <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{l.user}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function exportLogs(logs) {
  const lines = ['Timestamp,Level,Source,Message,User'];
  for (const l of logs) {
    lines.push([
      l.ts,
      l.level,
      l.source,
      `"${(l.msg ?? '').replace(/"/g, '""')}"`,
      l.user,
    ].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `sentinel-guard-logs-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}