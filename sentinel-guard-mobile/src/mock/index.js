// ─── MOCK DATA (Mobile) ───────────────────────────────────────────────────────
// Same shape as web mock — swap for Firebase when backend is ready.

export const MOCK_USER = {
  uid: 'usr_najath',
  name: 'Najath Najeem',
  initials: 'NJ',
  email: 'najath@sg.app',
  role: 'admin',
};

export const MOCK_SENSORS = [
  { id: 'node_01', name: 'Node 01', temp: 28.4, humidity: 61,  soil: 42, tempStatus: 'ok',   humStatus: 'ok',   soilStatus: 'ok',   online: true },
  { id: 'node_02', name: 'Node 02', temp: 41.7, humidity: 83,  soil: 78, tempStatus: 'warn', humStatus: 'warn', soilStatus: 'warn', online: true },
];

export const MOCK_HISTORY = Array.from({ length: 20 }, (_, i) => ({
  time: `${String(i).padStart(2,'0')}:00`,
  node01_temp:     +(22 + Math.sin(i / 3) * 6 + Math.random() * 2).toFixed(1),
  node01_humidity: +(55 + Math.cos(i / 4) * 10 + Math.random() * 3).toFixed(1),
  node01_soil:     +(40 + Math.sin(i / 5) * 8  + Math.random() * 2).toFixed(1),
  node02_temp:     +(35 + Math.sin(i / 2) * 8  + Math.random() * 3).toFixed(1),
  node02_humidity: +(70 + Math.cos(i / 3) * 12 + Math.random() * 3).toFixed(1),
  node02_soil:     +(65 + Math.sin(i / 4) * 10 + Math.random() * 2).toFixed(1),
}));

export const MOCK_ALERTS = [
  { id: 'a1', time: '14:02', event: 'MiTM — HMAC invalid',           node: 'node_01', severity: 'critical', mlResult: 'attack',    read: false },
  { id: 'a2', time: '13:48', event: 'Replay attack — duplicate nonce', node: 'node_01', severity: 'warning',  mlResult: 'anomaly',   read: false },
  { id: 'a3', time: '13:21', event: 'ARP poisoning attempt',           node: 'node_02', severity: 'warning',  mlResult: 'anomaly',   read: false },
  { id: 'a4', time: '12:55', event: 'Normal traffic — payload accepted',node: 'node_01', severity: 'info',     mlResult: 'normal',    read: true  },
  { id: 'a5', time: '12:33', event: 'False positive — ML reclassified', node: 'node_02', severity: 'info',     mlResult: 'false_pos', read: true  },
];

export const MOCK_STATS = {
  systemOnline: true,
  activeAlerts: 3,
  criticalAlerts: 2,
  payloadsVerified: 1284,
  hmacFailures: 7,
  mlAccuracy: 97.3,
};
