import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ShieldIcon = () => (
  <svg viewBox="0 0 14 14"><path d="M7 1L1 4v4c0 3 2.5 5 6 6 3.5-1 6-3 6-6V4L7 1z"/></svg>
);
const GridIcon = () => (
  <svg viewBox="0 0 14 14" stroke="currentColor" fill="none" strokeWidth="1.5">
    <rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/>
    <rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/>
  </svg>
);
const ChartIcon = () => (
  <svg viewBox="0 0 14 14" stroke="currentColor" fill="none" strokeWidth="1.5">
    <polyline points="1,10 4,5 7,8 10,3 13,7"/>
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 14 14" stroke="currentColor" fill="none" strokeWidth="1.5">
    <path d="M7 1L1 4v4c0 3 2.5 5 6 6 3.5-1 6-3 6-6V4L7 1z"/>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 14 14" stroke="currentColor" fill="none" strokeWidth="1.5">
    <circle cx="7" cy="5" r="2.5"/><path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
  </svg>
);
const LogsIcon = () => (
  <svg viewBox="0 0 14 14" stroke="currentColor" fill="none" strokeWidth="1.5">
    <rect x="1" y="1" width="12" height="12" rx="1"/>
    <line x1="1" y1="5" x2="13" y2="5"/><line x1="5" y1="5" x2="5" y2="13"/>
  </svg>
);

export default function Sidebar({ alertCount = 0 }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const avatarClass = `avatar${user?.color === 'green' ? ' green' : user?.color === 'amber' ? ' amber' : ''}`;

  return (
    <div className="sidebar">
      <NavLink to="/dashboard" className="sb-logo">
        <div className="sb-logo-icon"><ShieldIcon /></div>
        Sentinel Guard
      </NavLink>

      <NavLink to="/dashboard" className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
        <GridIcon /> Dashboard
      </NavLink>
      <NavLink to="/sensors" className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
        <ChartIcon /> Sensor data
      </NavLink>
      <NavLink to="/alerts" className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
        <AlertIcon /> Alert feed
        {alertCount > 0 && <div className="sb-dot" />}
      </NavLink>

      {isAdmin ? (
        <>
          <div className="sb-section">Admin only</div>
          <NavLink to="/admin" className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
            <UserIcon /> User management
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
            <LogsIcon /> Logs
          </NavLink>
        </>
      ) : (
        <div style={{ padding: '12px 16px 6px', fontSize: '10px', color: 'var(--text3)', borderTop: '1px solid var(--border)', marginTop: '8px', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
          Admin panel hidden by RBAC
        </div>
      )}

      <div className="sb-user">
        <div className={avatarClass}>{user?.initials}</div>
        <div>
          <div className="sb-user-name">{user?.name?.split(' ')[0]}</div>
          <div className="sb-user-role">
            <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-std'}`}>
              {isAdmin ? 'Admin' : 'Standard'}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', fontSize: '11px', cursor: 'pointer', padding: '4px' }}
          title="Sign out"
        >
          ↩
        </button>
      </div>
    </div>
  );
}
