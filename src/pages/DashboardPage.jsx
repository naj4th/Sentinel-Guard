import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSensors, useAlerts, useStats, useSensorHistory } from '../hooks/useData';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: sensors, loading: sensorsLoading } = useSensors();
  const { data: alerts, loading: alertsLoading } = useAlerts();
  const { data: stats, loading: statsLoading } = useStats();
  const { data: history } = useSensorHistory('node_01');

  const recentAlerts = (alerts || []).slice(0, 3);
  const unread = (alerts || []).filter(a => !a.read).length;

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
          <div className="page-sub">Live system overview · updated every 5s</div>
        </div>
        <div className="hdr-btns">
          <button className="btn">Export</button>
          <button className="btn primary">↻ Refresh</button>
        </div>
      </div>

      {statsLoading ? (
        <div className="stats-grid">
          {[1,2,3,4].map(i => <div key={i} className="stat-card"><div className="skeleton" style={{height:60}} /></div>)}
        </div>
      ) : (
        <div className="stats-grid">
          <StatCard label="System status"    val={stats?.systemOnline ? 'Online' : 'Offline'} sub="All sensors active"  variant={stats?.systemOnline ? 'ok' : 'danger'} />
          <StatCard label="Active alerts"    val={stats?.activeAlerts}  sub={`${stats?.criticalAlerts} critical`}  variant="danger" />
          <StatCard label="Payloads verified" val={stats?.payloadsVerified?.toLocaleString()} sub="Last 24h" />
          <StatCard label="HMAC failures"    val={stats?.hmacFailures}  sub="Last hour"  variant="warn" />
          <StatCard label="ML accuracy"      val={`${stats?.mlAccuracy}%`} sub="Classification" variant="ok" />
          <StatCard label="Uptime"           val={stats?.uptime}        sub="30-day average" variant="ok" />
        </div>
      )}

      <div className="two-col" style={{marginBottom:16}}>
        {/* Temperature chart */}
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Temperature — Node 01</span>
            <span className="live-dot">Live</span>
          </div>
          <div className="chart-wrap">
            <MiniChart data={history} dataKey="node01_temp" />
          </div>
          <div className="chart-footer">
            <span>24h ago</span>
            <strong>{sensorsLoading ? '…' : `${sensors?.[0]?.temp} °C`}</strong>
          </div>
        </div>
        {/* Humidity chart */}
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Humidity — Node 01</span>
            <span className="live-dot">Live</span>
          </div>
          <div className="chart-wrap">
            <MiniChart data={history} dataKey="node01_humidity" />
          </div>
          <div className="chart-footer">
            <span>24h ago</span>
            <strong>{sensorsLoading ? '…' : `${sensors?.[0]?.humidity} %`}</strong>
          </div>
        </div>
      </div>

      {/* Soil moisture */}
      <div className="two-col" style={{marginBottom:16}}>
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Soil moisture — Node 01</span>
            <span className="live-dot">Live</span>
          </div>
          <div className="chart-wrap">
            <MiniChart data={history} dataKey="node01_soil" color="#22c55e" />
          </div>
          <div className="chart-footer">
            <span>24h ago</span>
            <strong style={{color:'var(--green)'}}>{sensorsLoading ? '…' : `${sensors?.[0]?.soil} %`}</strong>
          </div>
        </div>
        <div className="panel">
          <div className="panel-hdr">
            <span className="panel-title">Node 02 — all sensors</span>
            <span className="panel-meta" style={{color: sensors?.[1]?.tempStatus === 'warn' ? 'var(--amber)' : 'var(--text3)'}}>
              {sensors?.[1]?.tempStatus === 'warn' ? '⚠ Above threshold' : 'Normal'}
            </span>
          </div>
          <div style={{padding:'12px 16px',display:'flex',gap:16}}>
            {[
              { label:'Temp', val:`${sensors?.[1]?.temp}°C`, color: sensors?.[1]?.tempStatus === 'warn' ? 'var(--amber)' : 'var(--text)' },
              { label:'Humidity', val:`${sensors?.[1]?.humidity}%`, color: sensors?.[1]?.humStatus === 'warn' ? 'var(--amber)' : 'var(--text)' },
              { label:'Soil', val:`${sensors?.[1]?.soil}%`, color: sensors?.[1]?.soilStatus === 'warn' ? 'var(--amber)' : 'var(--text)' },
            ].map(s => (
              <div key={s.label} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
                <div style={{fontSize:22,fontWeight:700,fontFamily:'var(--mono)',color:s.color}}>{sensorsLoading ? '…' : s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent alerts */}
      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Recent alerts {unread > 0 && <span className="badge badge-crit" style={{marginLeft:6}}>{unread} unread</span>}</span>
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
