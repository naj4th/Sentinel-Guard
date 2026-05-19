import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSensors, useAlerts, useStats } from '../hooks/useData';
import { exportDashboardCSV } from '../services';
import MiniChart from '../components/charts/MiniChart';

function StatCard({ label, val, sub, variant }) {
  return (
    <div className={`stat-card${variant ? ' ' + variant : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{val}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function AlertDot({ severity }) {
  if (severity === 'critical') return <div className="alert-dot dot-crit" />;
  if (severity === 'warning')  return <div className="alert-dot dot-warn" />;
  return <div className="alert-dot dot-ok" />;
}

// Shows a value or "—" when the node is offline
function SensorVal({ val, unit, online, loading }) {
  if (loading)  return <span>…</span>;
  if (!online)  return <span style={{ color: 'var(--text3)' }}>—</span>;
  if (val == null) return <span style={{ color: 'var(--text3)' }}>—</span>;
  return <span>{val}{unit}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting]   = useState(false);

  const { data: sensors, loading: sensorsLoading, refresh: refreshSensors } = useSensors(refreshKey);
  const { data: alerts,  loading: alertsLoading,  refresh: refreshAlerts  } = useAlerts(refreshKey);
  const { data: stats,   loading: statsLoading                             } = useStats(refreshKey);

  // Poll sensor history every 30 s so the chart stays fresh
  const [history, setHistory] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { getSensorHistory } = await import('../services');
      const h = await getSensorHistory('node_01', 24);
      if (!cancelled) setHistory(h);
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshKey]);

  const node1 = sensors?.[0];

  const recentAlerts = (alerts || []).slice(0, 3);
  const unread = (alerts || []).filter(a => !a.read).length;

  const handleRefresh = useCallback(() => {
    // Bump the key — hooks that accept it will re-subscribe / re-fetch
    setRefreshKey(k => k + 1);
    // Also call explicit refresh helpers if the hook exposes them
    refreshSensors?.();
    refreshAlerts?.();
  }, [refreshSensors, refreshAlerts]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportDashboardCSV(sensors, alerts);
    } finally {
      setExporting(false);
    }
  }, [sensors, alerts]);

  return (
    <>
      {!isAdmin && (
        <div className="rbac-banner">
          ⚠ Read-only mode — you can view data but cannot manage users or trigger mitigations
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Live system overview · updated every 3s</div>
        </div>
        <div className="hdr-btns">
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? '…' : '↓ Export'}
          </button>
          <button className="btn primary" onClick={handleRefresh}>↻ Refresh</button>
        </div>
      </div>

      {statsLoading ? (
        <div className="stats-grid">
          {[1,2,3,4].map(i => <div key={i} className="stat-card"><div className="skeleton" style={{height:60}} /></div>)}
        </div>
      ) : (
        <div className="stats-grid">
          <StatCard label="System status"    val={stats?.systemOnline ? 'Online' : 'Offline'} sub="All sensors active"  variant={stats?.systemOnline ? 'ok' : 'danger'} />
          <StatCard label="Active alerts"    val={stats?.activeAlerts ?? '—'}  sub={`${stats?.criticalAlerts ?? 0} critical`}  variant="danger" />
          <StatCard label="HMAC failures"    val={stats?.hmacFailures ?? 0}    sub="Last hour"  variant={stats?.hmacFailures > 0 ? 'warn' : 'ok'} />
          <StatCard label="Uptime"           val={stats?.uptime ?? '—'}        sub="30-day average" variant="ok" />
        </div>
      )}

      <div className="two-col" style={{marginBottom:16}}>
        {/* Temperature chart */}
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Temperature - Node 01</span>
            {node1?.online
              ? <span className="live-dot">Live</span>
              : <span className="panel-meta" style={{color:'var(--red)'}}>Offline</span>
            }
          </div>
          <div className="chart-wrap">
            <MiniChart data={history} dataKey="node01_temp" />
          </div>
          <div className="chart-footer">
            <span>24h ago</span>
            <strong>
              <SensorVal val={node1?.temp} unit=" °C" online={node1?.online} loading={sensorsLoading} />
            </strong>
          </div>
        </div>
        {/* Humidity chart */}
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Humidity - Node 01</span>
            {node1?.online
              ? <span className="live-dot">Live</span>
              : <span className="panel-meta" style={{color:'var(--red)'}}>Offline</span>
            }
          </div>
          <div className="chart-wrap">
            <MiniChart data={history} dataKey="node01_humidity" />
          </div>
          <div className="chart-footer">
            <span>24h ago</span>
            <strong>
              <SensorVal val={node1?.humidity} unit=" %" online={node1?.online} loading={sensorsLoading} />
            </strong>
          </div>
        </div>
      </div>

      {/* Recent alerts */}
      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">
            Recent alerts {unread > 0 && <span className="badge badge-crit" style={{marginLeft:6}}>{unread} unread</span>}
          </span>
          <Link to="/alerts" className="panel-link">View all →</Link>
        </div>
        {alertsLoading ? (
          <div className="loading-overlay"><div className="spinner" /> Loading alerts…</div>
        ) : recentAlerts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            <p>No alerts</p><span>All systems normal</span>
          </div>
        ) : (
          <div className="alert-list">
            {recentAlerts.map(a => (
              <div key={a.id} className={`alert-item ${a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : ''}`}>
                <AlertDot severity={a.severity} />
                <div className="alert-body">
                  <p>{a.event}</p>
                  <span>{a.node} · HMAC {a.mlResult === 'attack' ? 'verification failed' : 'verified'}</span>
                </div>
                <div className="alert-time">{a.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
