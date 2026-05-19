import { useState } from 'react';
import { useAlerts } from '../hooks/useData';
import { markAllAlertsRead } from '../services';
import { useToast } from '../components/ui/Toast';

const SEV_ORDER = { critical: 0, warning: 1, info: 2 };

function MLBadge({ result }) {
  if (result === 'attack')   return <span className="badge badge-crit">Attack</span>;
  if (result === 'anomaly')  return <span className="badge badge-warn">Anomaly</span>;
  if (result === 'normal')   return <span className="badge badge-ok">Normal</span>;
  if (result === 'false_pos')return <span className="badge badge-info">False +</span>;
  return <span className="badge badge-neu">{result}</span>;
}

function SevBadge({ sev }) {
  if (sev === 'critical') return <span className="badge badge-crit">Critical</span>;
  if (sev === 'warning')  return <span className="badge badge-warn">Warning</span>;
  return <span className="badge badge-neu">Info</span>;
}

export default function AlertsPage() {
  const { data: alerts, loading } = useAlerts();
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);
  const toast = useToast();

  const filtered = (alerts || []).filter(a => {
    if (filter === 'unread')   return !a.read;
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'warning')  return a.severity === 'warning';
    return true;
  });

  const unread = (alerts || []).filter(a => !a.read).length;

  const handleMarkAll = async () => {
    setMarking(true);
    await markAllAlertsRead();
    setMarking(false);
    toast('All alerts marked as read', 'success');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Alert feed</div>
          <div className="page-sub">Attack events · HMAC failures · ML detections</div>
        </div>
        <div className="hdr-btns">
          <button className={`btn${marking?' loading':''}`} onClick={handleMarkAll} disabled={marking}>
            {marking ? <span className="spinner" style={{width:12,height:12}}/> : null} Mark all read
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {[
          { key:'all',      label:'All events' },
          { key:'unread',   label:`Unread (${unread})` },
          { key:'critical', label:'Critical' },
          { key:'warning',  label:'Warnings' },
        ].map(f => (
          <button key={f.key}
            className={`btn${filter===f.key?' primary':''}`}
            onClick={() => setFilter(f.key)}
          >{f.label}</button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Events</span>
          <span className="panel-meta">{filtered.length} shown · {unread} unread</span>
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="spinner"/> Loading events…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            <p>No events matching filter</p><span>Try a different filter</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th style={{width:18}}></th>
                  <th style={{width:90}}>Time</th>
                  <th>Event</th>
                  <th style={{width:80}}>Node</th>
                  <th style={{width:90}}>Severity</th>
                  <th style={{width:90}}>Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>
                      {!a.read && <div style={{width:7,height:7,borderRadius:'50%',background:'var(--blue)'}}/>}
                    </td>
                    <td className="td-mono">{a.time}</td>
                    <td style={{fontSize:13}}>{a.event}</td>
                    <td className="td-mono">{a.node}</td>
                    <td><SevBadge sev={a.severity}/></td>
                    <td><MLBadge result={a.mlResult}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
