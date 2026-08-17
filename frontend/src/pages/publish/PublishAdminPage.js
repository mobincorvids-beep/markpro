import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { FiPlus, FiX, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [planModal, setPlanModal] = useState(null);

  useEffect(() => { loadTab(); }, [tab]);
  const loadTab = async () => {
    setFetching(true);
    try {
      if (tab==='stats') { const { data } = await api.get('/publish/admin/stats'); setStats(data); }
      if (tab==='users') { const { data } = await api.get('/publish/admin/users'); setUsers(data.users); }
      if (tab==='plans') { const { data } = await api.get('/publish/admin/plans'); setPlans(data.plans); }
    } catch { toast.error('Failed to load'); }
    finally { setFetching(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop:80 }} />;
  if (!user || user.role!=='admin') return <Navigate to="/" replace />;

  const toggleUser = async u => { await api.put(`/publish/admin/users/${u._id}`, { active: !u.active }); setUsers(us=>us.map(x=>x._id===u._id?{...x,active:!x.active}:x)); };
  const deleteUser = async u => { if (!window.confirm(`Delete ${u.name}?`)) return; await api.delete(`/publish/admin/users/${u._id}`); setUsers(us=>us.filter(x=>x._id!==u._id)); toast.success('Deleted'); };
  const savePlan = async form => {
    try {
      if (form._id) await api.put(`/publish/admin/plans/${form._id}`, form);
      else await api.post('/publish/admin/plans', form);
      toast.success('Plan saved'); setPlanModal(null); loadTab();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const deletePlan = async id => { if (!window.confirm('Delete plan?')) return; await api.delete(`/publish/admin/plans/${id}`); setPlans(p=>p.filter(x=>x._id!==id)); toast.success('Deleted'); };

  return (
    <div>
      <h1 className="page-title mb-4">Admin Panel</h1>
      <div className="tab-bar">
        {[['stats','Overview'],['users','Users'],['plans','Plans']].map(([k,l])=>(
          <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {fetching ? <div className="spinner"/> : (
        <>
          {tab==='stats' && stats && (
            <div className="stats-grid">
              {[
                {icon:'',label:'Total Users',value:stats.users,color:'var(--brand)',bg:'var(--brand-light)'},
                {icon:'',label:'Total Posts',value:stats.posts,color:'#10b981',bg:'#ecfdf5'},
                {icon:'',label:'Active Subs',value:stats.activeSubs,color:'#f59e0b',bg:'#fef3c7'},
                {icon:'',label:'Total Revenue',value:'$'+stats.revenue?.toLocaleString(),color:'#8b5cf6',bg:'#f5f3ff'},
              ].map(s=>(
                <div key={s.label} className="card stat-card">
                  <div className="stat-icon" style={{background:s.bg,color:s.color}}>{s.icon}</div>
                  <div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {tab==='users' && (
            <div className="card">
              <div className="card-header"><span className="card-title">All Users ({users.length})</span></div>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>Joined</th><th></th></tr></thead>
                <tbody>{users.map(u=>(
                  <tr key={u._id}>
                    <td style={{fontWeight:600}}>{u.name}</td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td><span className="badge badge-blue">{u.plan?.name||'None'}</span></td>
                    <td><span className={`badge ${u.active?'badge-green':'badge-red'}`}>{u.active?'Active':'Suspended'}</span></td>
                    <td className="text-muted text-sm">{formatDistanceToNow(new Date(u.createdAt),{addSuffix:true})}</td>
                    <td><div className="flex gap-2">
                      <button className="btn-icon" onClick={()=>toggleUser(u)}>{u.active?<FiToggleRight size={14} style={{color:'var(--green)'}}/>:<FiToggleLeft size={14}/>}</button>
                      <button className="btn-icon" onClick={()=>deleteUser(u)}><FiTrash2 size={12}/></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {tab==='plans' && (
            <div>
              <div className="flex justify-between mb-4"><span className="text-muted">{plans.length} plans</span><button className="btn btn-primary btn-sm" onClick={()=>setPlanModal({})}><FiPlus size={13}/> Add Plan</button></div>
              <div className="card">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Interval</th><th>Price</th><th>Word Tokens</th><th>Status</th><th></th></tr></thead>
                  <tbody>{plans.map(p=>(
                    <tr key={p._id}>
                      <td style={{fontWeight:600}}>{p.name}</td><td>{p.interval}</td><td>${p.price}</td>
                      <td>{p.wordTokens?.toLocaleString()||'∞'}</td>
                      <td><span className={`badge ${p.active?'badge-green':'badge-gray'}`}>{p.active?'Active':'Hidden'}</span></td>
                      <td><div className="flex gap-2"><button className="btn-icon" onClick={()=>setPlanModal(p)}><FiEdit2 size={12}/></button><button className="btn-icon" onClick={()=>deletePlan(p._id)}><FiTrash2 size={12}/></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {planModal!==null && <PlanModal plan={planModal} onClose={()=>setPlanModal(null)} onSave={savePlan} />}
    </div>
  );
}

function PlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    name: plan.name||'', slug: plan.slug||'', interval: plan.interval||'monthly', price: plan.price||0,
    socialProfiles: plan.socialProfiles||0, socialPosts: plan.socialPosts||0,
    wordTokens: plan.wordTokens||0, imageTokens: plan.imageTokens||0,
    webhookAccess: plan.webhookAccess||false, prebuiltTemplates: plan.prebuiltTemplates||false,
    isFeatured: plan.isFeatured||false, active: plan.active!==false, _id: plan._id,
  });
  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const submit = e => { e.preventDefault(); onSave(form); };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:'var(--surface)',borderRadius:14,width:'100%',maxWidth:500,maxHeight:'90vh',overflowY:'auto',padding:26}}>
        <div className="flex justify-between items-center mb-4"><h3 style={{fontWeight:700}}>{plan._id?'Edit':'Add'} Plan</h3><button className="btn-icon" onClick={onClose}><FiX/></button></div>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Name</label><input required value={form.name} onChange={e=>f('name',e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Slug</label><input required value={form.slug} onChange={e=>f('slug',e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Interval</label><select value={form.interval} onChange={e=>f('interval',e.target.value)}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="unlimited">Unlimited (one-time)</option></select></div>
            <div className="form-group"><label className="form-label">Price ($)</label><input type="number" step="0.01" value={form.price} onChange={e=>f('price',+e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Social Profiles (0=∞)</label><input type="number" value={form.socialProfiles} onChange={e=>f('socialProfiles',+e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Posts/month (0=∞)</label><input type="number" value={form.socialPosts} onChange={e=>f('socialPosts',+e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Word Tokens (0=∞)</label><input type="number" value={form.wordTokens} onChange={e=>f('wordTokens',+e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Image Tokens (0=∞)</label><input type="number" value={form.imageTokens} onChange={e=>f('imageTokens',+e.target.value)} /></div>
          </div>
          <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap'}}>
            <label className="flex items-center gap-2" style={{cursor:'pointer'}}><input type="checkbox" checked={form.webhookAccess} onChange={e=>f('webhookAccess',e.target.checked)} style={{width:'auto'}}/> Webhooks</label>
            <label className="flex items-center gap-2" style={{cursor:'pointer'}}><input type="checkbox" checked={form.prebuiltTemplates} onChange={e=>f('prebuiltTemplates',e.target.checked)} style={{width:'auto'}}/> Templates</label>
            <label className="flex items-center gap-2" style={{cursor:'pointer'}}><input type="checkbox" checked={form.isFeatured} onChange={e=>f('isFeatured',e.target.checked)} style={{width:'auto'}}/> Featured</label>
            <label className="flex items-center gap-2" style={{cursor:'pointer'}}><input type="checkbox" checked={form.active} onChange={e=>f('active',e.target.checked)} style={{width:'auto'}}/> Active</label>
          </div>
          <div className="flex gap-2 justify-between"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary">Save Plan</button></div>
        </form>
      </div>
    </div>
  );
}
