// ─── SERVICE LAYER ───────────────────────────────────────────────────────────
// Flip USE_MOCK = false and fill in the Firebase implementations
// when your teammate's backend is ready. Components stay unchanged.

import { MOCK_USER, MOCK_USERS, MOCK_SENSORS, MOCK_HISTORY, MOCK_ALERTS, MOCK_STATS } from '../mock';

const USE_MOCK = true;

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  if (USE_MOCK) {
    await delay(800);
    return { ...MOCK_USER };
    // TODO: return signInWithEmailAndPassword(auth, email, password)
  }
}

export async function signOut() {
  if (USE_MOCK) { await delay(300); return; }
  // TODO: return firebaseSignOut(auth);
}

export function getCurrentUser() {
  if (USE_MOCK) return MOCK_USER;
  // TODO: return auth.currentUser;
}

// ── Sensors ──────────────────────────────────────────────────────────────────
export function subscribeSensors(callback) {
  if (USE_MOCK) {
    callback({ data: MOCK_SENSORS, loading: false, error: null });
    const interval = setInterval(() => {
      const jitter = (n, d) => +(n + (Math.random() - 0.5) * d).toFixed(1);
      callback({
        loading: false, error: null,
        data: MOCK_SENSORS.map(s => ({
          ...s,
          temp: jitter(s.temp, 0.4),
          humidity: jitter(s.humidity, 1),
          soil: jitter(s.soil, 1),
        })),
      });
    }, 5000);
    return () => clearInterval(interval);
    // TODO: return onSnapshot(collection(db,'sensors'), snap => callback({data: snap.docs.map(d=>d.data()), loading:false, error:null}))
  }
}

export async function getSensorHistory(nodeId, hours = 24) {
  if (USE_MOCK) {
    await delay(400);
    return MOCK_HISTORY.slice(-hours);
  }
  // TODO: query Firestore for historical readings
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export function subscribeAlerts(callback) {
  if (USE_MOCK) {
    let alerts = [...MOCK_ALERTS];
    callback({ data: alerts, loading: false, error: null });
    return () => {};
    // TODO: return onSnapshot(query(collection(db,'alerts'), orderBy('time','desc')), ...)
  }
}

export async function markAlertRead(alertId) {
  if (USE_MOCK) { await delay(200); return; }
  // TODO: updateDoc(doc(db,'alerts',alertId), {read: true})
}

export async function markAllAlertsRead() {
  if (USE_MOCK) { await delay(300); return; }
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUsers() {
  if (USE_MOCK) { await delay(500); return MOCK_USERS; }
  // TODO: getDocs(collection(db,'users'))
}

export async function updateUserRole(uid, role) {
  if (USE_MOCK) { await delay(400); return; }
  // TODO: updateDoc + update Firebase custom claim via Cloud Function
}

export async function inviteUser(email) {
  if (USE_MOCK) { await delay(600); return; }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function subscribeStats(callback) {
  if (USE_MOCK) {
    callback({ data: MOCK_STATS, loading: false, error: null });
    return () => {};
  }
}

// ── Mitigations ───────────────────────────────────────────────────────────────
export async function isolateNode(nodeId) {
  if (USE_MOCK) { await delay(1000); return { success: true }; }
}

export async function blockIP(ip) {
  if (USE_MOCK) { await delay(800); return { success: true }; }
}

export async function resetHMACKeys() {
  if (USE_MOCK) { await delay(1200); return { success: true }; }
}

export async function forceReauth() {
  if (USE_MOCK) { await delay(600); return { success: true }; }
}

// ── helpers ───────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
