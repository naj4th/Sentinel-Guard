// ─── SERVICE LAYER (Mobile) ───────────────────────────────────────────────────
// Flip USE_MOCK = false and wire Firebase when backend is ready.

import { MOCK_USER, MOCK_SENSORS, MOCK_HISTORY, MOCK_ALERTS, MOCK_STATS } from '../mock';

const USE_MOCK = true;
const delay = ms => new Promise(r => setTimeout(r, ms));

export async function signIn(email, password) {
  if (USE_MOCK) { await delay(800); return { ...MOCK_USER }; }
  // TODO: signInWithEmailAndPassword(auth, email, password)
}

export async function signOut() {
  if (USE_MOCK) { await delay(300); return; }
}

export function getCurrentUser() {
  if (USE_MOCK) return MOCK_USER;
}

export function subscribeSensors(callback) {
  if (USE_MOCK) {
    callback({ data: MOCK_SENSORS, loading: false });
    const iv = setInterval(() => {
      const jitter = (n, d) => +(n + (Math.random() - 0.5) * d).toFixed(1);
      callback({
        loading: false,
        data: MOCK_SENSORS.map(s => ({ ...s, temp: jitter(s.temp, 0.4), humidity: jitter(s.humidity, 1), soil: jitter(s.soil, 1) })),
      });
    }, 5000);
    return () => clearInterval(iv);
  }
}

export function subscribeAlerts(callback) {
  if (USE_MOCK) {
    callback({ data: MOCK_ALERTS, loading: false });
    return () => {};
  }
}

export function subscribeStats(callback) {
  if (USE_MOCK) {
    callback({ data: MOCK_STATS, loading: false });
    return () => {};
  }
}

export async function getSensorHistory(nodeId, hours = 24) {
  if (USE_MOCK) { await delay(300); return MOCK_HISTORY.slice(-hours); }
}
