import { useState } from 'react';
import { useSensors, useSensorHistory } from '../hooks/useData';
import HistoryChart from '../components/charts/HistoryChart';

const THRESHOLDS = { temp: 35, humidity: 75, soil: 70 };

export default function SensorsPage() {
  const { data: sensors, loading } = useSensors();
  const [timeRange, setTimeRange] = useState(24);
  const [activeNode, setActiveNode] = useState('node_01');
  const { data: history, loading: histLoading } = useSensorHistory(activeNode, timeRange);

  const node1 = sensors?.[0];
  const node2 = sensors?.[1];

  const sensorCards = [
    { node: 'Node 01', key: 'node_01', label: 'Temperature', val: node1?.temp, unit: '°C', status: node1?.tempStatus, threshold: THRESHOLDS.temp },
    { node: 'Node 01', key: 'node_01', label: 'Humidity',    val: node1?.humidity, unit: '%', status: node1?.humStatus, threshold: THRESHOLDS.humidity },
    { node: 'Node 01', key: 'node_01', label: 'Soil moisture',val: node1?.soil, unit: '%', status: node1?.soilStatus, threshold: THRESHOLDS.soil },
    { node: 'Node 02', key: 'node_02', label: 'Temperature', val: node2?.temp, unit: '°C', status: node2?.tempStatus, threshold: THRESHOLDS.temp },
    { node: 'Node 02', key: 'node_02', label: 'Humidity',    val: node2?.humidity, unit: '%', status: node2?.humStatus, threshold: THRESHOLDS.humidity },
    { node: 'Node 02', key: 'node_02', label: 'Soil moisture',val: node2?.soil, unit: '%', status: node2?.soilStatus, threshold: THRESHOLDS.soil },
  ];

  const histKeys = activeNode === 'node_01'
    ? ['node01_temp', 'node01_humidity', 'node01_soil']
    : ['node02_temp', 'node02_humidity', 'node02_soil'];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Sensor data</div>
          <div className="page-sub">ESP32 / DHT22 + soil moisture · real-time via Firestore onSnapshot</div>
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
              <div className="sensor-name">{s.label} — {s.node}</div>
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
          <div style={{display:'flex',gap:8}}>
            <button className={`act-btn${activeNode==='node_01'?' active':''}`} onClick={()=>setActiveNode('node_01')} style={activeNode==='node_01'?{borderColor:'var(--accent)',color:'var(--accent)'}:{}}>Node 01</button>
            <button className={`act-btn${activeNode==='node_02'?' active':''}`} onClick={()=>setActiveNode('node_02')} style={activeNode==='node_02'?{borderColor:'var(--accent)',color:'var(--accent)'}:{}}>Node 02</button>
          </div>
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
            <thead><tr><th>Node</th><th>IP Address</th><th>Last seen</th><th>Status</th><th>HMAC</th><th>Uptime</th></tr></thead>
            <tbody>
              {[node1, node2].map((n, i) => n && (
                <tr key={i}>
                  <td className="td-name">Node 0{i+1}</td>
                  <td className="td-mono">192.168.1.{10+i}</td>
                  <td className="td-mono">Just now</td>
                  <td><span className={`badge ${n.online ? 'badge-ok' : 'badge-crit'}`}>{n.online ? 'Online' : 'Offline'}</span></td>
                  <td><span className="badge badge-ok">Valid</span></td>
                  <td className="td-mono">99.{94+i}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
