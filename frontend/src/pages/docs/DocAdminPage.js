import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatBytes } from '../../utils/fileUtils';
import { formatDistanceToNow } from 'date-fns';
import {
  FiUsers, FiFile, FiFolder, FiHardDrive, FiPlus, FiEdit2, FiTrash2,
  FiX, FiKey, FiToggleLeft, FiToggleRight,
} from 'react-icons/fi';

export default function Admin() {
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(null);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'stats') { const { data } = await api.get('/docs/admin/stats'); setStats(data); }
      if (tab === 'users') { const { data } = await api.get('/docs/admin/users'); setUsers(data.users); }
      if (tab === 'logs')  { const { data } = await api.get('/docs/admin/audit-logs'); setLogs(data.logs); }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const toggleActive = async u => {
    await api.put(`/docs/admin/users/${u._id}`, { active: !u.active });
    load();
  };
  const deleteUser = async u => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/docs/admin/users/${u._id}`); toast.success('User deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <h1 className="page-title mb-4">Admin Dashboard</h1>

      <div className="tab-bar">
        {[['stats','Overview'],['users','Users'],['logs','Audit Logs']].map(([k,l]) => (
          <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : (
        <>
          {tab === 'stats' && stats && (
            <div>
              <div className="stats-grid">
                <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--accent-light)', color:'var(--accent)' }}><FiUsers/></div><div><div className="stat-value">{stats.users}</div><div className="stat-label">Total Users</div></div></div>
                <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--green-light)', color:'var(--green)' }}><FiFile/></div><div><div className="stat-value">{stats.documents}</div><div className="stat-label">Documents</div></div></div>
                <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--yellow-light)', color:'var(--yellow)' }}><FiFolder/></div><div><div className="stat-value">{stats.folders}</div><div className="stat-label">Folders</div></div></div>
                <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--red-light)', color:'var(--red)' }}><FiHardDrive/></div><div><div className="stat-value">{stats.totalStorageMB} MB</div><div className="stat-label">Storage Used</div></div></div>
                <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--accent-light)', color:'var(--accent)' }}><FiUsers/></div><div><div className="stat-value">{stats.activeUsers}</div><div className="stat-label">Active (30d)</div></div></div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="card">
                  <div className="card-header"><span className="card-title">Documents by Type</span></div>
                  <table className="data-table">
                    <thead><tr><th>Type</th><th>Count</th><th>Size</th></tr></thead>
                    <tbody>{stats.byType?.map(t => (
                      <tr key={t._id}><td>{t._id}</td><td><span className="badge badge-blue">{t.count}</span></td><td>{formatBytes(t.size)}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">Recent Activity</span></div>
                  <table className="data-table">
                    <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
                    <tbody>{stats.recentLogs?.slice(0,10).map(l => (
                      <tr key={l._id}><td style={{ fontWeight:600, fontSize:12 }}>{l.user?.name}</td><td className="text-sm">{l.action.replace(/_/g,' ')}</td><td className="text-muted text-sm">{formatDistanceToNow(new Date(l.createdAt),{addSuffix:true})}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">All Users ({users.length})</span>
                <button className="btn btn-sm btn-primary" style={{ marginLeft:'auto' }} onClick={()=>setShowUserModal({})}><FiPlus size={13}/> Add User</button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Docs</th><th>Storage</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight:600 }}>{u.name}</td>
                        <td className="text-sm">{u.email}</td>
                        <td><span className={`badge ${u.role==='admin'?'badge-blue':'badge-gray'}`}>{u.role}</span></td>
                        <td>{u.docCount}</td>
                        <td className="text-sm">{u.storageUsedMB?.toFixed(1)||0} / {u.storageQuotaMB} MB</td>
                        <td><span className={`badge ${u.active?'badge-green':'badge-red'}`}>{u.active?'Active':'Suspended'}</span></td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn-icon" onClick={()=>toggleActive(u)} title={u.active?'Suspend':'Activate'}>
                              {u.active ? <FiToggleRight size={14} style={{color:'var(--green)'}}/> : <FiToggleLeft size={14}/>}
                            </button>
                            <button className="btn-icon" onClick={()=>setShowUserModal(u)} title="Edit"><FiEdit2 size={12}/></button>
                            <button className="btn-icon" onClick={()=>deleteUser(u)} title="Delete"><FiTrash2 size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="card">
              <table className="data-table">
                <thead><tr><th>User</th><th>Action</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l._id}>
                      <td style={{ fontWeight:600, fontSize:12 }}>{l.user?.name || '-'}</td>
                      <td><span className="badge badge-blue">{l.action.replace(/_/g,' ')}</span></td>
                      <td className="text-sm">{l.targetType}: {l.targetName}</td>
                      <td className="text-muted text-sm">{l.details}</td>
                      <td className="text-muted text-sm">{formatDistanceToNow(new Date(l.createdAt),{addSuffix:true})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showUserModal !== null && (
        <UserModal user={showUserModal._id ? showUserModal : null} onClose={()=>setShowUserModal(null)} onSaved={load} />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name||'', email: user?.email||'', password:'',
    role: user?.role||'user', storageQuotaMB: user?.storageQuotaMB||1024,
    department: user?.department||'', jobTitle: user?.jobTitle||'',
  });
  const [saving, setSaving] = useState(false);
  const [resetPw, setResetPw] = useState('');

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (user) await api.put(`/docs/admin/users/${user._id}`, form);
      else await api.post('/docs/admin/users', form);
      toast.success(user?'User updated':'User created');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const doReset = async () => {
    if (!resetPw || resetPw.length<6) return toast.error('Min 6 characters');
    try { await api.put(`/docs/admin/users/${user._id}/reset-password`, { newPassword: resetPw }); toast.success('Password reset'); setResetPw(''); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Edit User' : 'Add User'}</h3>
          <button className="btn-icon" onClick={onClose}><FiX/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" required disabled={!!user} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            </div>
            {!user && (
              <div className="form-group"><label className="form-label">Password</label><input type="password" required minLength={6} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
            )}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Role</label>
                <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="user">User</option><option value="manager">Manager</option><option value="admin">Admin</option><option value="client">Client</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Storage Quota (MB)</label><input type="number" value={form.storageQuotaMB} onChange={e=>setForm({...form,storageQuotaMB:+e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Department</label><input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Job Title</label><input value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})} /></div>
            </div>

            {user && (
              <div className="form-group">
                <label className="form-label">Reset Password</label>
                <div className="flex gap-2">
                  <input type="password" placeholder="New password" value={resetPw} onChange={e=>setResetPw(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={doReset}><FiKey size={13}/></button>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="inline-spin"/>} Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
