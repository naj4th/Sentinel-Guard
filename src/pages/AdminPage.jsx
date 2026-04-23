import { useState, useEffect } from 'react';
import { getUsers, updateUserRole, isolateNode, blockIP, resetHMACKeys, forceReauth } from '../services';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/Modal';

function RoleBadge({ role }) {
  return <span className={`badge ${role === 'admin' ? 'badge-admin' : 'badge-std'}`}>{role === 'admin' ? 'Admin' : 'Standard'}</span>;
}

const AVATAR_COLORS = { blue: '', green: ' green', amber: ' amber' };

export default function AdminPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null); // { uid, name, currentRole }
  const [mitigating, setMitigating] = useState(null);  // { action, label }
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    getUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    await updateUserRole(uid, newRole);
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role: newRole } : x));
    setEditingRole(null);
    toast(`Role updated to ${newRole}`, 'success');
  };

  const runMitigation = async (action, label, fn) => {
    setConfirm({
      title: `Confirm: ${label}`,
      message: 'This action is immediate and may disrupt active sessions. Are you sure?',
      label,
      danger: true,
      action: async () => {
        setMitigating(action);
        setConfirm(null);
        try {
          await fn();
          toast(`${label} executed successfully`, 'success');
        } catch {
          toast(`Failed to execute ${label}`, 'error');
        } finally {
          setMitigating(null);
        }
      }
    });
  };

  return (
    <>
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">User management</div>
          <div className="page-sub">Firebase Auth · RBAC roles · Admin access only</div>
        </div>
        <div className="hdr-btns">
          <button className="btn primary" onClick={() => toast('Invite flow coming with Firebase Auth', 'warn')}>
            + Invite user
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-hdr">
          <span className="panel-title">Users</span>
          <span className="panel-meta">{users.length} total</span>
        </div>
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /> Loading users…</div>
        ) : (
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <th style={{ width: 38 }}></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ width: 100 }}>Role</th>
                  <th style={{ width: 90 }}>Last login</th>
                  <th style={{ width: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div className={`avatar${AVATAR_COLORS[u.color] || ''}`} style={{ width: 26, height: 26, fontSize: 10 }}>
                        {u.initials}
                      </div>
                    </td>
                    <td className="td-name">{u.name}</td>
                    <td className="td-mono" style={{ color: 'var(--text)' }}>{u.email}</td>
                    <td>
                      {editingRole?.uid === u.uid ? (
                        <select
                          autoFocus
                          defaultValue={u.role}
                          onChange={e => handleRoleChange(u.uid, e.target.value)}
                          onBlur={() => setEditingRole(null)}
                          style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 5, padding: '3px 6px', fontSize: 12, fontFamily: 'var(--mono)' }}
                        >
                          <option value="admin">Admin</option>
                          <option value="standard">Standard</option>
                        </select>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td className="td-mono">{u.lastLogin}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="act-btn" onClick={() => setEditingRole(u)}>Edit role</button>
                        <button className="act-btn danger" onClick={() => toast('Force logout coming with Firebase', 'warn')}>Logout</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mitigation controls */}
      <div className="panel">
        <div className="panel-hdr">
          <span className="panel-title">Mitigation controls</span>
          <span className="panel-meta" style={{ color: 'var(--red)' }}>Admin only · irreversible</span>
        </div>
        <div className="mit-btns">
          {[
            { action: 'isolate_01', label: 'Isolate Node 01', fn: () => isolateNode('node_01'), danger: true },
            { action: 'isolate_02', label: 'Isolate Node 02', fn: () => isolateNode('node_02'), danger: true },
            { action: 'block_ip',  label: 'Block suspected IP', fn: () => blockIP('192.168.1.99'), danger: true },
            { action: 'hmac',      label: 'Reset HMAC keys', fn: resetHMACKeys, danger: false },
            { action: 'reauth',    label: 'Force re-auth all users', fn: forceReauth, danger: false },
          ].map(m => (
            <button
              key={m.action}
              className={`btn${m.danger ? ' danger' : ''}${mitigating === m.action ? ' loading' : ''}`}
              disabled={!!mitigating}
              onClick={() => runMitigation(m.action, m.label, m.fn)}
            >
              {mitigating === m.action ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
              {m.label}
            </button>
          ))}
        </div>

        {/* Security overview */}
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10, marginTop: 4 }}>
          {[
            { label: 'AES-128', status: 'Active', ok: true },
            { label: 'HMAC-SHA256', status: 'Active', ok: true },
            { label: 'MQTTs / TLS', status: 'Active', ok: true },
            { label: 'HTTPS / TLS', status: 'Active', ok: true },
            { label: 'Nonce protection', status: 'Active', ok: true },
            { label: 'ML classifier', status: 'Running', ok: true },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: s.ok ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 500 }}>
                {s.ok ? '● ' : '○ '}{s.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
