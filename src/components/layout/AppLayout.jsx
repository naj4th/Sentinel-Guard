import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAlerts } from '../../hooks/useData';

export default function AppLayout() {
  const { data: alerts } = useAlerts();
  const unread = (alerts || []).filter(a => !a.read).length;

  return (
    <div className="app-shell">
      <Sidebar alertCount={unread} />
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
