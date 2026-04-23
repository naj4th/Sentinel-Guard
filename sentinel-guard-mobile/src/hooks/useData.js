import { useState, useEffect } from 'react';
import { subscribeSensors, subscribeAlerts, subscribeStats, getSensorHistory } from '../services';

export function useSensors() {
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    const unsub = subscribeSensors(setState);
    return unsub;
  }, []);
  return state;
}

export function useAlerts() {
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    const unsub = subscribeAlerts(setState);
    return unsub;
  }, []);
  return state;
}

export function useStats() {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    const unsub = subscribeStats(setState);
    return unsub;
  }, []);
  return state;
}

export function useSensorHistory(nodeId, hours = 24) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    getSensorHistory(nodeId, hours).then(d => { setData(d); setLoading(false); });
  }, [nodeId, hours]);
  return { data, loading };
}
