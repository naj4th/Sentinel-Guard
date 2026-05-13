import { useState, useEffect } from 'react';
import { getUsers, updateUserRole, createUser, deleteUser, isolateNode, blockIP, resetHMACKeys, forceReauth } from '../services';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/Modal';

function RoleBadge({ role }) {
  return <span className={`badge ${role === 'admin' ? 'badge-admin' : 'badge-std'}`}>{role === 'admin' ? 'Admin' : 'Standard'}</span>;
}

const AVATAR_COLORS = { blue: '', blue: ' blue', amber: ' amber' };

const inputStyle = {
  background: 'var(--bg3)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  borderRadius: 5,
  padding: '6px 10px',
  fontSize: 13,
};

export default function AdminPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null);
  const [mitigating, setMitigating] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Add user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', password: '', role: 'standard' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getUsers().then(u => { setUsers(u); setLoading(false); });
  }, []);

  // ── Role change ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (uid, newRole) => {
    await updateUserRole(uid, newRole);
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role: newRole } : x));
    setEditingRole(null);
    toast(`Role updated to ${newRole}`, 'success');
  };

  // ── Delete user ──────────────────────────────────────────────────────────────
  const handleDelete = (uid, name) => {
    setConfirm({
      title: `Delete ${name}?`,
      message: 'This will permanently remove the user from the system. This cannot be undone.',
      label: 'Delete user',
      danger: true,
      action: async () => {
        setConfirm(null);
        try {
          await deleteUser(uid);
          setUsers(u => u.filter(x => x.uid !== uid));
          toast(`${name} deleted`, 'success');
        } catch {
          toast('Failed to delete user', 'error');
        }
      }
    });
  };

  // ── Create user ──────────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUser.displayName || !newUser.email || !newUser.password) {
      toast('Please fill in all fields', 'warn');
      return;
    }
    setCreating(true);
    try {
      await createUser(newUser.email, newUser.password, newUser.displayName, newUser.role);
      toast('User created successfully', 'success');
      setShowAddUser(false);
      setNewUser({ displayName: '', email: '', password: '', role: 'standard' });
      const updated = await getUsers();
      setUsers(updated);
    } catch {
      toast('Failed to create user', 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Mitigation ───────────────────────────────────────────────────────────────
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

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">User management</div>
          <div className="page-sub">Firebase Auth · RBAC roles · Admin access only</div>
        </div>
        <div className="hdr-btns">
          <button className="btn primary" onClick={() => setShowAddUser(s => !s)}>
            {showAddUser ? 'Cancel' : '+ Add user'}
          </button>
        </div>
      </div>

      {/* ── Add user form ── */}
      {showAddUser && (
        <div className="panel" style={{ marginBottom: 14, padding: 16 }}>
          <div className="panel-title" style={{ marginBottom: 12 }}>New User</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Full name"
              value={newUser.displayName}
              onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              type="email"
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Password"
              type="password"
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              style={inputStyle}
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              style={inputStyle}
            >
              <option value="standard">Standard</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="btn primary"
              onClick={handleCreateUser}
              disabled={creating}
            >
              {creating ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
              {creating ? ' Creating…' : 'Create'}
            </button>
            <button className="btn" onClick={() => setShowAddUser(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Users table ── */}
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
                  <th style={{ width: 160 }}>Actions</th>
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
                    <td className="td-name">{u.name ?? u.displayName}</td>
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
                        <button className="act-btn danger" onClick={() => handleDelete(u.uid, u.name ?? u.displayName)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
    </>
  );
}
