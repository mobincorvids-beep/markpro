import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { genTypeBadge } from '../../utils/genTypes';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiZap } from 'react-icons/fi';

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab]   = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [pkgModal, setPkgModal] = useState(null);
  const [grantModal, setGrantModal] = useState(null);

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setFetching(true);
    try {
      if (tab === 'stats')    { const { data } = await api.get('/ai/aigen-admin/stats');       setStats(data); }
      if (tab === 'users')    { const { data } = await api.get('/ai/aigen-admin/users');       setUsers(data.users); }
      if (tab === 'packages') { const { data } = await api.get('/ai/credits/packages');  setPackages(data.packages); }
    } catch { toast.error('Failed to load'); }
    finally { setFetching(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const toggleUser = async u => {
    await api.put(`/ai/aigen-admin/users/${u._id}`, { active: !u.active });
    setUsers(us => us.map(x => x._id === u._id ? { ...x, active: !x.active } : x));
  };

  const deleteUser = async u => {
    if (!window.confirm(`Delete "${u.name}"?`)) return;
    await api.delete(`/ai/aigen-admin/users/${u._id}`);
    setUsers(us => us.filter(x => x._id !== u._id));
    toast.success('User deleted');
  };

  const grantCredits = async ({ userId, credits, description }) => {
    try {
      await api.post('/ai/credits/grant', { userId, credits: Number(credits), description });
      toast.success('Credits granted');
      setGrantModal(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const savePkg = async form => {
    try {
      if (form._id) await api.put(`/ai/credits/packages/${form._id}`, form);
      else await api.post('/ai/credits/packages', form);
      toast.success('Package saved');
      setPkgModal(null);
      loadTab();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const deletePkg = async id => {
    if (!window.confirm('Delete package?')) return;
    await api.delete(`/ai/credits/packages/${id}`);
    setPackages(p => p.filter(x => x._id !== id));
    toast.success('Deleted');
  };

  return (
    <div>
      <h1 className="page-title mb-4">Admin Panel</h1>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
        {[['stats','Overview'],['users','Users'],['packages','Credit Packages']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '9px 18px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: `3px solid ${tab===k?'var(--accent)':'transparent'}`, color: tab===k?'var(--accent)':'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px', transition: 'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {fetching ? <div className="spinner" /> : (
        <>
          {tab === 'stats' && stats && (
            <div>
              <div className="stats-grid">
                {[
                  { icon:'', label:'Total Users',      value: stats.users,       color:'var(--brand)' },
                  { icon:'', label:'Total Prompts',    value: stats.prompts,     color:'#8b5cf6' },
                  { icon:'', label:'Credits Consumed', value: stats.creditsUsed, color:'#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="card stat-card">
                    <div className="stat-icon" style={{ background: `${s.color}22`, color: s.color, fontSize: 20 }}>{s.icon}</div>
                    <div><div className="stat-value">{s.value?.toLocaleString()}</div><div className="stat-label">{s.label}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card">
                  <div className="card-header"><span className="card-title">Usage by Type</span></div>
                  <table className="data-table">
                    <thead><tr><th>Type</th><th>Count</th></tr></thead>
                    <tbody>{stats.topUsage?.map(t => { const tb = genTypeBadge(t._id); return <tr key={t._id}><td>{tb.icon} {tb.label}</td><td><span className="badge badge-purple">{t.count}</span></td></tr>; })}</tbody>
                  </table>
                </div>
                <div className="card">
                  <div className="card-header"><span className="card-title">Recent Signups</span></div>
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Credits</th><th>Joined</th></tr></thead>
                    <tbody>{stats.recentUsers?.map(u => (
                      <tr key={u._id}><td style={{ fontWeight: 600 }}>{u.name}</td><td><FiZap size={11} style={{ color:'var(--accent)' }} /> {u.credits}</td><td className="text-muted text-sm">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="card">
              <div className="card-header"><span className="card-title">All Users ({users.length})</span></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Credits</th><th>Status</th><th>Joined</th><th></th></tr></thead>
                  <tbody>{users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td className="text-sm text-muted">{u.email}</td>
                      <td><span className={`badge ${u.role==='admin'?'badge-purple':'badge-gray'}`}>{u.role}</span></td>
                      <td><FiZap size={11} style={{ color:'var(--accent)' }} /> {u.credits?.toLocaleString()}</td>
                      <td><span className={`badge ${u.active?'badge-green':'badge-red'}`}>{u.active?'Active':'Suspended'}</span></td>
                      <td className="text-muted text-sm">{formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => setGrantModal(u)} title="Grant credits"><FiZap size={12} style={{ color:'var(--accent)' }} /></button>
                          <button className="btn-icon" onClick={() => toggleUser(u)}>{u.active ? <FiToggleRight size={14} style={{ color:'var(--green)' }} /> : <FiToggleLeft size={14} />}</button>
                          <button className="btn-icon" onClick={() => deleteUser(u)}><FiTrash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'packages' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted">{packages.length} packages</span>
                <button className="btn btn-primary btn-sm" onClick={() => setPkgModal({})}><FiPlus size={13} /> Add Package</button>
              </div>
              <div className="card">
                <table className="data-table">
                  <thead><tr><th>Title</th><th>Credits</th><th>Price</th><th>Featured</th><th>Status</th><th></th></tr></thead>
                  <tbody>{packages.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td>{p.credits?.toLocaleString()}</td>
                      <td>${p.price}</td>
                      <td>{p.isFeatured ? 'Yes' : '-'}</td>
                      <td><span className={`badge ${p.active?'badge-green':'badge-gray'}`}>{p.active?'Active':'Hidden'}</span></td>
                      <td><div className="flex gap-2"><button className="btn-icon" onClick={() => setPkgModal(p)}><FiEdit2 size={12} /></button><button className="btn-icon" onClick={() => deletePkg(p._id)}><FiTrash2 size={12} /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {pkgModal !== null && <PackageModal pkg={pkgModal} onClose={() => setPkgModal(null)} onSave={savePkg} />}
      {grantModal && <GrantModal user={grantModal} onClose={() => setGrantModal(null)} onGrant={grantCredits} />}
    </div>
  );
}

function PackageModal({ pkg, onClose, onSave }) {
  const [form, setForm] = useState({ title: pkg.title||'', credits: pkg.credits||100, price: pkg.price||9.99, description: pkg.description||'', isFeatured: pkg.isFeatured||false, active: pkg.active!==false, features: (pkg.features||[]).join('\n'), _id: pkg._id });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const submit = e => { e.preventDefault(); onSave({ ...form, features: form.features.split('\n').filter(Boolean) }); };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', padding:26 }}>
        <div className="flex justify-between items-center mb-4"><h3 style={{ fontWeight:700 }}>{pkg._id?'Edit':'Add'} Package</h3><button className="btn-icon" onClick={onClose}><FiX /></button></div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Title</label><input required value={form.title} onChange={e => f('title', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Credits</label><input type="number" min={1} required value={form.credits} onChange={e => f('credits', +e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Price (USD)</label><input type="number" min={0} step={0.01} required value={form.price} onChange={e => f('price', +e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><input value={form.description} onChange={e => f('description', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Features (one per line)</label><textarea value={form.features} onChange={e => f('features', e.target.value)} style={{ minHeight:80 }} /></div>
          <div style={{ display:'flex', gap:16, marginBottom:16 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}><input type="checkbox" checked={form.isFeatured} onChange={e => f('isFeatured', e.target.checked)} style={{ width:'auto' }} /> Featured</label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}><input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} style={{ width:'auto' }} /> Active</label>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Package</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrantModal({ user, onClose, onGrant }) {
  const [credits, setCredits] = useState(100);
  const [description, setDesc] = useState('Admin credit grant');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:380, padding:26 }}>
        <div className="flex justify-between items-center mb-4"><h3 style={{ fontWeight:700 }}>Grant Credits to {user.name}</h3><button className="btn-icon" onClick={onClose}><FiX /></button></div>
        <div className="form-group"><label className="form-label">Credits to Grant</label><input type="number" min={1} value={credits} onChange={e => setCredits(+e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Description</label><input value={description} onChange={e => setDesc(e.target.value)} /></div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onGrant({ userId: user._id, credits, description })}><FiZap size={13} /> Grant</button>
        </div>
      </div>
    </div>
  );
}
