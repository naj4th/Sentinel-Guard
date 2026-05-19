import { useState } from 'react';
import { useSensors, useSensorHistory } from '../hooks/useData';
import HistoryChart from '../components/charts/HistoryChart';

const THRESHOLDS = { temp: 35, humidity: 75};

export default function SensorsPage() {
  const { data: sensors, loading } = useSensors();
  const [timeRange, setTimeRange] = useState(24);
  const { data: history, loading: histLoading } = useSensorHistory('node_01', timeRange);

  const node1 = sensors?.[0];

  const sensorCards = [
    { node: 'Node 01', key: 'node_01', label: 'Temperature', val: node1?.temp, unit: '°C', status: node1?.tempStatus, threshold: THRESHOLDS.temp },
    { node: 'Node 01', key: 'node_01', label: 'Humidity',    val: node1?.humidity, unit: '%', status: node1?.humStatus, threshold: THRESHOLDS.humidity },
  ];

  const histKeys = ['node01_temp', 'node01_humidity'];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Sensor data</div>
          <div className="page-sub">ESP32 + soil moisture · real-time via Firestore onSnapshot</div>
        </div>
        <div className="hdr-btns">
          {[1, 6, 24].map(h => (
            <button key={h} className={`btn${timeRange === h ? ' primary' : ''}`} onClick={() => setTimeRange(h)}>{h}h</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="sensor-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="sensor-card"><div className="skeleton" style={{height:80}}/></div>)}
        </div>
      ) : (
        <div className="sensor-grid">
          {sensorCards.map((s, i) => (
            <div key={i} className={`sensor-card${s.status === 'warn' ? ' warn' : ''}`}>
              <div className="sensor-name">{s.label} - {s.node}</div>
              <div>
                <span className="sensor-val" style={s.status === 'warn' ? {color:'var(--amber)'} : {}}>
                  {s.val ?? '…'}
                </span>
                <span className="sensor-unit">{s.unit}</span>
              </div>
              <div className={`sensor-status ${s.status === 'warn' ? 's-warn' : 's-ok'}`}>
                {s.status === 'warn' ? `⚠ Above threshold (${s.threshold}${s.unit})` : '✓ Within normal range'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-hdr">
          <span className="panel-title">Historical data</span>
          <span className="panel-meta">Node 01</span>
        </div>
        <div className="chart-wrap">
          {histLoading ? (
            <div className="loading-overlay"><div className="spinner"/> Loading history…</div>
          ) : (
            <HistoryChart data={history} keys={histKeys} thresholds={{ node01_temp: 35, node02_temp: 35 }} />
          )}
        </div>
        <div className="chart-footer">
          <span>{timeRange}h ago</span>
          <span style={{color:'var(--amber)',fontFamily:'var(--mono)',fontSize:11}}>— — threshold</span>
          <span>Now</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr"><span className="panel-title">Node status</span></div>
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Node</th><th>IP Address</th><th>Last seen</th><th>Status</th><th>HMAC</th></tr></thead>
            <tbody>
              {node1 && (
                <tr>
                  <td className="td-name">Node 01</td>
                  <td className="td-mono">192.168.1.101</td>
                  <td className="td-mono">Just now</td>
                  <td><span className={`badge ${node1.online ? 'badge-ok' : 'badge-crit'}`}>{node1.online ? 'Online' : 'Offline'}</span></td>
                  <td><span className="badge badge-ok">Valid</span></td>
                  
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
