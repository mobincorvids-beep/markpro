import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatflowAPI } from '../../services/api';

export default function ChatFlowDashboard() {
  const [tenant, setTenant]   = useState(null);
  const [pages, setPages]     = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPage, setShowAddPage] = useState(false);
  const [pageForm, setPageForm] = useState({ name:'', facebookPageId:'', connectionMode:'mock' });

  useEffect(() => {
    Promise.all([chatflowAPI.getTenant(), chatflowAPI.getPages(), chatflowAPI.getSubscribers({ limit:5 })])
      .then(([t, p, s]) => { setTenant(t.data.tenant); setPages(p.data.pages || []); setSubscribers(s.data.subscribers || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleAddPage = async () => {
    if (!pageForm.name) return;
    try {
      const r = await chatflowAPI.createPage(pageForm);
      setPages(p => [...p, r.data.page]);
      setShowAddPage(false);
      setPageForm({ name:'', facebookPageId:'', connectionMode:'mock' });
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>ChatFlow</h1>
        <div className="topbar-actions">
          {tenant?.subscriptionStatus === 'trialing' && <span className="badge badge-warning">Trial - {tenant.trialEndsAt ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt) - new Date())/86400000)) : 0} days left</span>}
          <button className="btn btn-primary" onClick={() => setShowAddPage(true)}>+ Connect Page</button>
        </div>
      </div>

      <div className="grid-4 mb-2">
        {[['Pages Connected', pages.length, 'var(--brand)'],
          ['Subscribers', subscribers.length, '#10b981'],
          ['Mode', pages.find(p=>p.connectionMode==='live')?'Live':'Mock','#f59e0b'],
          ['Plan', tenant?.subscriptionStatus || 'trial', '#3b82f6']].map(([l,v,c]) => (
          <div key={l} className="card stat-card"><div className="label">{l}</div><div className="value" style={{ color:c, fontSize:18 }}>{v}</div></div>
        ))}
      </div>

      {showAddPage && (
        <div className="card mb-2">
          <h3 className="mb-1">Connect Facebook Page</h3>
          <div style={{ marginBottom:10 }}><label className="label">Page Name</label><input className="input" value={pageForm.name} onChange={e=>setPageForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ marginBottom:10 }}>
            <label className="label">Mode</label>
            <select className="input" value={pageForm.connectionMode} onChange={e=>setPageForm(f=>({...f,connectionMode:e.target.value}))}>
              <option value="mock">Mock (test bot simulator - no Facebook App needed)</option>
              <option value="live">Live (requires Facebook Page Access Token)</option>
            </select>
          </div>
          {pageForm.connectionMode === 'live' && (
            <div style={{ marginBottom:10 }}><label className="label">Facebook Page ID</label><input className="input" value={pageForm.facebookPageId} onChange={e=>setPageForm(f=>({...f,facebookPageId:e.target.value}))}/></div>
          )}
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleAddPage}>Connect</button><button className="btn" onClick={()=>setShowAddPage(false)}>Cancel</button></div>
        </div>
      )}

      <div className="grid-3">
        {[
          ['Inbox', '/chatflow/inbox', 'View conversations'],
          ['Automation Rules', '/chatflow/rules', 'Keyword triggers'],
          ['Sequences', '/chatflow/sequences', 'Drip campaigns'],
          ['Broadcasts', '/chatflow/broadcasts', 'Bulk messages'],
          ['Products', '/chatflow/products', 'Manage catalog'],
          ['Orders', '/chatflow/orders', 'View orders'],
        ].map(([l, to, desc]) => (
          <Link key={to} to={to}><div className="card card-hover"><div style={{ fontWeight:500, marginBottom:4 }}>{l}</div><div className="text-muted text-sm">{desc}</div></div></Link>
        ))}
      </div>

      <div className="card mt-2">
        <div className="card-title mb-1">Connected Pages</div>
        {pages.length === 0 ? <p className="text-muted text-sm">No pages connected yet.</p> :
          <table className="table">
            <thead><tr><th>Page</th><th>Mode</th><th>Status</th></tr></thead>
            <tbody>{pages.map(p => (
              <tr key={p._id}>
                <td style={{ fontWeight:500 }}>{p.name}</td>
                <td><span className={`badge badge-${p.connectionMode==='live'?'success':'secondary'}`}>{p.connectionMode}</span></td>
                <td><span className={`badge badge-${p.isActive?'success':'danger'}`}>{p.isActive?'Active':'Inactive'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  );
}
