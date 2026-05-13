// ─── SERVICE LAYER ───────────────────────────────────────────────────────────
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query,
  orderBy, limit, updateDoc, getDocs, writeBatch, getDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';


// A node is considered offline if its last reading is older than this.
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// Event types written by the Python backend that map to "critical" severity
const CRITICAL_EVENT_TYPES = new Set([
  'integrity_violation',
  'replay_attack',
  'ddos_attack',
  'fdi_attack',
  'anomaly_detected',
  'mitigation_applied',
]);

const WARNING_EVENT_TYPES = new Set([
  'sequence_mismatch',
  'processing_error',
]);

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid  = cred.user.uid;

    const roleDoc = await getDoc(doc(db, 'users', uid));
    const role    = roleDoc.exists() ? roleDoc.data().role ?? 'standard' : 'standard';

    return {
      uid,
      name:     cred.user.displayName ?? email.split('@')[0],
      initials: email.slice(0, 2).toUpperCase(),
      email:    cred.user.email,
      role,
    };
  } catch (error) {
    console.error('🔥 LOGIN ERROR:', error.code, error.message);
    throw error;
  }
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ── Sensors ───────────────────────────────────────────────────────────────────
export function subscribeSensors(callback) {
  const q = query(
    collection(db, 'sensor_data'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q,
    snap => {
      const byNode = new Map();
      for (const docSnap of snap.docs) {
        const adapted = adaptSensorDoc(docSnap);
        if (!byNode.has(adapted.node)) byNode.set(adapted.node, adapted);
      }

      const now = Date.now();

      const data = Array.from(byNode.values()).map(s => {
        const tsMs     = resolveTimestampMs(s.timestamp);
        const isRecent = tsMs !== null && (now - tsMs) < STALE_THRESHOLD_MS;
        const online   = isRecent && (s.temp !== null || s.humidity !== null);

        return {
          ...s,
          // Null out stale values so the UI renders "—" instead of old data
          temp:       online ? s.temp     : null,
          humidity:   online ? s.humidity : null,
          soil:       online ? s.soil     : null,
          // FIX (Bug 4): offline nodes must not report 'ok' status
          tempStatus: !online ? 'offline' : s.temp     > 35 ? 'warn' : 'ok',
          humStatus:  !online ? 'offline' : s.humidity > 75 ? 'warn' : 'ok',
          soilStatus: !online ? 'offline' : s.soil     > 70 ? 'warn' : 'ok',
          online,
          name:       s.node,
          lastSeenMs: tsMs,
        };
      });

      callback({ data, loading: false, error: null });
    },
    err => {
      console.error('subscribeSensors error:', err.message);
      callback({ data: [], loading: false, error: err.message });
    }
  );
}

export async function getSensorHistory(nodeId, hours = 24) {
  try {
    const fetchLimit = hours * 24 + 50;
    const q = query(
      collection(db, 'sensor_data'),
      orderBy('timestamp', 'desc'),
      limit(fetchLimit)
    );
    const snap = await getDocs(q);

    const node01Docs = [];
    const node02Docs = [];

    for (const d of snap.docs) {
      const adapted = adaptSensorDoc(d);
      if (isNode(adapted.node, '01'))      node01Docs.unshift(adapted);
      else if (isNode(adapted.node, '02')) node02Docs.unshift(adapted);
    }

    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const filterRecent = docs => docs.filter(d => {
      const ms = resolveTimestampMs(d.timestamp);
      return ms !== null && ms >= cutoff;
    });

    const n1 = filterRecent(node01Docs);
    const n2 = filterRecent(node02Docs);

    const buckets = new Map();

    const addToBucket = (docs, getFields) => {
      for (const d of docs) {
        const ms = resolveTimestampMs(d.timestamp);
        if (ms === null) continue;
        const date = new Date(ms);
        const key  = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        if (!buckets.has(key)) buckets.set(key, { time: formatTimestampMs(ms), _ms: ms });
        const bucket = buckets.get(key);
        for (const [field, val] of Object.entries(getFields(d))) {
          if (val !== null) bucket[field] = val;
        }
      }
    };

    addToBucket(n1, d => ({
      node01_temp:     d.temp,
      node01_humidity: d.humidity,
      node01_soil:     d.soil,
    }));

    addToBucket(n2, d => ({
      node02_temp:     d.temp,
      node02_humidity: d.humidity,
      node02_soil:     d.soil,
    }));

    return Array.from(buckets.values())
      .sort((a, b) => a._ms - b._ms)
      .map(({ _ms, ...rest }) => rest);

  } catch (err) {
    console.error('getSensorHistory failed:', err.message);
    return [];
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export function subscribeAlerts(callback) {
  const q = query(
    collection(db, 'security_events'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  let debounceTimer = null;
  let latestSnap    = null;

  const flush = () => {
    if (!latestSnap) return;
    const data = latestSnap.docs.map(d => adaptAlertDoc(d));
    callback({ data, loading: false, error: null });
  };

  const unsub = onSnapshot(q,
    snap => {
      latestSnap = snap;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flush, 300);
    },
    err => {
      console.error('subscribeAlerts error:', err.message);
      callback({ data: [], loading: false, error: err.message });
    }
  );

  return () => { clearTimeout(debounceTimer); unsub(); };
}

export async function markAlertRead(alertId) {
  try {
    await updateDoc(doc(db, 'security_events', alertId), { acknowledged: true });
  } catch (err) {
    console.warn('markAlertRead failed:', err.message);
  }
}

export async function markAllAlertsRead() {
  try {
    const snap = await getDocs(collection(db, 'security_events'));
    const unacknowledged = snap.docs.filter(d => !d.data().acknowledged);
    if (unacknowledged.length === 0) return;

    const batch = writeBatch(db);
    for (const d of unacknowledged) {
      batch.update(doc(db, 'security_events', d.id), { acknowledged: true });
    }
    await batch.commit();
  } catch (err) {
    console.error('markAllAlertsRead failed:', err.message);
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error('getUsers failed:', err.message);
    return [];
  }
}

export async function updateUserRole(uid, role) {
  try {
    const token = await auth.currentUser.getIdToken();
    await fetch(`http://localhost:8000/admin/users/${uid}/role`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  } catch (err) {
    console.warn('updateUserRole failed:', err.message);
  }
}

export async function createUser(email, password, displayName, role) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch('http://localhost:8000/admin/users', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName, role }),
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

export async function deleteUser(uid) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`http://localhost:8000/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

export async function inviteUser(email) {
  console.log('inviteUser: needs Cloud Function, email =', email);
}

// ── System Logs ───────────────────────────────────────────────────────────────
export function subscribeSystemLogs(callback) {
  const q = query(
    collection(db, 'system_logs'),
    orderBy('timestamp', 'desc'),
    limit(200)
  );

  return onSnapshot(q,
    snap => {
      const data = snap.docs.map(d => adaptLogDoc(d));
      callback({ data, loading: false, error: null });
    },
    err => {
      console.error('subscribeSystemLogs error:', err.message);
      callback({ data: [], loading: false, error: err.message });
    }
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function subscribeStats(callback) {
  let latestSensors = [];
  let latestAlerts  = [];

  const pushStats = () => {
    const unacknowledged = latestAlerts.filter(a => !a.acknowledged);
    const activeAlerts   = unacknowledged.length;

    // FIX (Bug 2): match the actual eventType strings the Python backend writes
    const criticalAlerts = unacknowledged.filter(a =>
      CRITICAL_EVENT_TYPES.has(a.eventType)
    ).length;

    // FIX (Bug 1): integrity_violation is what the backend writes for HMAC failures
    const hmacFailures = latestAlerts.filter(a =>
      a.eventType === 'integrity_violation'
    ).length;

    const systemOnline = latestSensors.some(s => s.online);

    callback({
      loading: false,
      error:   null,
      data: {
        systemOnline,
        activeAlerts,
        criticalAlerts,
        hmacFailures,
        payloadsVerified: null,
        mlAccuracy:       null,
        uptime:           null,
      },
    });
  };

  const unsubAlerts = onSnapshot(
    query(collection(db, 'security_events'), orderBy('timestamp', 'desc'), limit(200)),
    snap => {
      latestAlerts = snap.docs.map(d => d.data());
      pushStats();
    },
    () => callback({ data: { systemOnline: false }, loading: false, error: null })
  );

  const unsubSensors = subscribeSensors(({ data }) => {
    latestSensors = data ?? [];
    pushStats();
  });

  return () => { unsubAlerts(); unsubSensors(); };
}

// ── Export ────────────────────────────────────────────────────────────────────
export async function exportDashboardCSV(sensors, alerts) {
  const lines = [];

  lines.push('=== SENSOR STATUS ===');
  lines.push('Node,Online,Temperature (°C),Humidity (%),Soil Moisture,Last Seen');
  for (const s of sensors ?? []) {
    const lastSeen = s.lastSeenMs ? new Date(s.lastSeenMs).toLocaleString() : 'Unknown';
    lines.push([
      s.node ?? s.name,
      s.online ? 'Online' : 'Offline',
      s.temp     ?? '—',
      s.humidity ?? '—',
      s.soil     ?? '—',
      lastSeen,
    ].join(','));
  }

  lines.push('');
  lines.push('=== RECENT ALERTS ===');
  lines.push('Time,Event,Node,Severity,ML Result,Acknowledged');
  for (const a of (alerts ?? []).slice(0, 50)) {
    lines.push([
      a.time,
      `"${(a.event ?? '').replace(/"/g, '""')}"`,
      a.node,
      a.severity,
      a.mlResult,
      a.read ? 'Yes' : 'No',
    ].join(','));
  }

  lines.push('');
  lines.push(`Exported at,${new Date().toLocaleString()}`);

  const csv  = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `sentinel-guard-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Mitigations ───────────────────────────────────────────────────────────────
export async function isolateNode(nodeId) {
  console.log('isolateNode:', nodeId, '— needs Cloud Function from Akila');
  return { success: false, message: 'Cloud Function not yet deployed' };
}

export async function blockIP(ip) {
  console.log('blockIP:', ip, '— needs Cloud Function from Akila');
  return { success: false, message: 'Cloud Function not yet deployed' };
}

export async function resetHMACKeys() {
  console.log('resetHMACKeys — needs Cloud Function from Akila');
  return { success: false, message: 'Cloud Function not yet deployed' };
}

export async function forceReauth() {
  console.log('forceReauth — needs Cloud Function from Akila');
  return { success: false, message: 'Cloud Function not yet deployed' };
}

// ── Adapters ──────────────────────────────────────────────────────────────────
function adaptSensorDoc(docSnap) {
  const d = docSnap.data();
  return {
    id:        docSnap.id,
    // FIX (Bug 3): prioritise deviceId — the field the Python backend actually writes
    node:      d.deviceId ?? d.node_id ?? d.nodeId ?? d.device_id ?? d.device ?? docSnap.id,
    ip:        d.ip ?? d.ipAddress ?? null,
    temp:      d.temperature   ?? d.temp        ?? d.temp_c       ?? null,
    humidity:  d.humidity      ?? d.hum         ?? d.humidity_pct ?? null,
    soil:      d.soil_moisture ?? d.soil        ?? d.moisture     ?? null,
    timestamp: d.timestamp ?? null,
    status:    d.status ?? 'active',
  };
}

function adaptLogDoc(docSnap) {
  const d = docSnap.data();
  const tsMs = resolveTimestampMs(d.timestamp ?? d.ts ?? d.createdAt ?? null);
  const formatTs = ms => ms
    ? new Date(ms).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  return {
    id:     docSnap.id,
    ts:     formatTs(tsMs),
    _ms:    tsMs ?? 0,
    level:  (d.level ?? d.severity ?? 'info').toUpperCase(),
    source: d.source ?? d.component ?? d.service ?? d.deviceId ?? 'system',
    msg:    d.message ?? d.msg ?? d.description ?? '',
    user:   d.user ?? d.uid ?? 'system',
  };
}

function adaptAlertDoc(docSnap) {
  const d = docSnap.data();
  return {
    id:               docSnap.id,
    time:             formatTimestamp(d.timestamp),
    event:            d.message ?? d.description ?? 'Alert',
    node:             d.deviceId ?? 'unknown',
    // FIX (Bug 2): map raw eventType to a CSS-compatible severity class
    severity:         mapSeverity(d.eventType),
    mlResult:         d.eventType ?? 'normal',
    acknowledged:     d.acknowledged === true,
    read:             d.acknowledged === true,
    mitigated:        d.mitigated ?? false,
    mitigationAction: d.mitigationAction ?? null,
    rawPayload:       d.rawPayload ?? null,
  };
}

// Maps Python backend eventType strings → dashboard severity classes
function mapSeverity(eventType) {
  if (CRITICAL_EVENT_TYPES.has(eventType)) return 'critical';
  if (WARNING_EVENT_TYPES.has(eventType))  return 'warning';
  return 'info';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveTimestampMs(ts) {
  if (ts === null || ts === undefined) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts instanceof Date)             return ts.getTime();
  if (typeof ts === 'number')         return ts;
  if (typeof ts === 'string') {
    const ms = Date.parse(ts);
    return isNaN(ms) ? null : ms;
  }
  return null;
}

function formatTimestamp(ts) {
  const ms = resolveTimestampMs(ts);
  if (ms === null) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimestampMs(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isNode(nodeId, number) {
  if (!nodeId) return false;
  return nodeId.includes(number) || nodeId.toLowerCase().endsWith(number);
}

function pad(n) {
  return String(n).padStart(2, '0');
}