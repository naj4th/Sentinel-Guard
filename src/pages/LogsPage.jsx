import { useState } from 'react';

const MOCK_LOGS = [
  { id: 1, ts: '2024-01-15 14:02:11', level: 'ERROR',   source: 'hmac_verifier',   msg: 'HMAC verification failed — node_01 payload rejected',        user: 'system' },
  { id: 2, ts: '2024-01-15 14:02:10', level: 'INFO',    source: 'mqtt_broker',     msg: 'Message received from node_01 (192.168.1.10)',               user: 'system' },
  { id: 3, ts: '2024-01-15 13:48:30', level: 'WARN',    source: 'nonce_guard',     msg: 'Duplicate nonce detected — replay attack blocked',           user: 'system' },
  { id: 4, ts: '2024-01-15 13:21:07', level: 'WARN',    source: 'ml_classifier',   msg: 'ARP anomaly flagged on node_02 (confidence 91%)',            user: 'system' },
  { id: 5, ts: '2024-01-15 13:00:00', level: 'INFO',    source: 'auth',            msg: 'User najath@sg.app signed in',                               user: 'najath' },
  { id: 6, ts: '2024-01-15 12:55:44', level: 'INFO',    source: 'firestore',       msg: 'Payload written to /sensors/node_01 (1284 total today)',      user: 'system' },
  { id: 7, ts: '2024-01-15 12:33:19', level: 'INFO',    source: 'ml_classifier',   msg: 'False positive reclassified — node_02 reading normalised',   user: 'system' },
  { id: 8, ts: '2024-01-15 12:00:00', level: 'INFO',    source: 'backup',          msg: 'Cloud backup snapshot completed successfully',               user: 'system' },
  { id: 9, ts: '2024-01-15 11:50:02', level: 'WARN',    source: 'threshold_guard', msg: 'Soil moisture above 70% on node_02 (78%)',                   user: 'system' },
  { id:10, ts: '2024-01-15 11:12:44', level: 'ERROR',   source: 'sensor_node',     msg: 'Temperature spike on node_02: 41.7°C',                       user: 'system' },
  { id:11, ts: '2024-01-15 10:45:11', level: 'INFO',    source: 'hmac_verifier',   msg: 'HMAC key rotation completed — all nodes updated',            user: 'najath' },
  { id:12, ts: '2024-01-15 10:00:00', level: 'DEBUG',   source: 'mqtt_broker',     msg: 'Heartbeat received from node_01 and node_02',               user: 'system' },
  { id:13, ts: '2024-01-15 09:30:00', level: 'INFO',    source: 'auth',            msg: 'User akila@sg.app signed in',                                user: 'akila'  },
  { id:14, ts: '2024-01-15 09:00:00', level: 'INFO',    source: 'system',          msg: 'Sentinel Guard started — all services initialised',          user: 'system' },
  { id:15, ts: '2024-01-15 08:55:00', level: 'DEBUG',   source: 'tls',             msg: 'TLS certificate valid — expires 2025-01-15',                 user: 'system' },
];

const LEVEL_STYLE = {
  ERROR: { color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-b)' },
  WARN:  { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-b)' },
  INFO:  { color: 'var(--blue)',  bg: 'var(--blue-bg)',  border: 'var(--blue-b)' },
  DEBUG: { color: 'var(--text3)', bg: 'var(--bg3)',      border: 'var(--border)' },
};

export default function LogsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = MOCK_LOGS.filter(l => {
    if (filter !== 'ALL' && l.level !== filter) return false;
    if (search && !l.msg.toLowerCase().includes(search.toLowerCase()) && !l.source.includes(search.toLowerCase())) return false;
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
          <button className="btn" onClick={() => {}}>↓ Export</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {['ALL','ERROR','WARN','INFO','DEBUG'].map(l => (
          <button key={l} className={`btn${filter===l?' primary':''}`} onClick={() => setFilter(l)}
            style={filter===l && l!=='ALL' ? { borderColor: LEVEL_STYLE[l]?.border, color: LEVEL_STYLE[l]?.color, background: LEVEL_STYLE[l]?.bg } : {}}>
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
          <span className="panel-meta">{filtered.length} entries</span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            <p>No log entries</p><span>Try a different filter</span>
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
                  <span style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: '0.05em' }}>
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
