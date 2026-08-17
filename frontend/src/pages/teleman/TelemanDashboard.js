import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { telemanAPI } from '../../services/api';

export function TelemanDashboard() {
  const [tenant, setTenant] = useState(null);
  const [calls, setCalls]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([telemanAPI.getTenant(), telemanAPI.getCalls({ limit:8 })])
      .then(([t,c]) => { setTenant(t.data.tenant); setCalls(c.data.calls||[]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Teleman</h1><div className="topbar-actions"><Link to="/teleman/dialer"><button className="btn btn-primary">Open Dialer</button></Link></div></div>
      <div className="grid-4 mb-2">
        {[['Minutes Used', tenant?.usage?.minutesUsed||0,'var(--brand)'],['SMS Sent', tenant?.usage?.smsSent||0,'#10b981'],['Status', tenant?.subscriptionStatus||'trial','#f59e0b'],['Recent Calls', calls.length,'#3b82f6']].map(([l,v,c]) => (
          <div key={l} className="card stat-card"><div className="label">{l}</div><div className="value" style={{ color:c, fontSize:18 }}>{v}</div></div>
        ))}
      </div>
      <div className="grid-3">
        {[['Dialer','/teleman/dialer','Make calls'],['Contacts','/teleman/contacts','Manage leads'],['Providers','/teleman/providers','Twilio credentials'],['Campaigns','/teleman/campaigns','Calling campaigns'],['Scripts','/teleman/scripts','Call scripts'],['Support','/teleman/tickets','Get help']].map(([l,to,desc]) => (
          <Link key={to} to={to}><div className="card card-hover"><div style={{ fontWeight:500, marginBottom:4 }}>{l}</div><div className="text-muted text-sm">{desc}</div></div></Link>
        ))}
      </div>
      <div className="card mt-2">
        <div className="card-title mb-1">Recent Calls</div>
        {calls.length===0 ? <p className="text-muted text-sm">No calls yet.</p> :
          <table className="table"><thead><tr><th>To</th><th>Status</th><th>Duration</th><th>Time</th></tr></thead>
            <tbody>{calls.map(c=>(<tr key={c._id}><td>{c.to}</td><td><span className="badge badge-secondary">{c.status}</span></td><td>{c.duration}s</td><td style={{fontSize:11}}>{new Date(c.createdAt).toLocaleString()}</td></tr>))}</tbody>
          </table>
        }
      </div>
    </div>
  );
}

export function TelemanContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  const load = () => telemanAPI.getContacts({ limit:100 }).then(r => setContacts(r.data.contacts||[])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { const r = await telemanAPI.importContacts(fd); alert(r.data.message); load(); } catch (e) { alert(e?.response?.data?.message || 'Import failed'); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await telemanAPI.deleteContact(id); setContacts(c=>c.filter(x=>x._id!==id)); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Contacts</h1><div className="topbar-actions"><button className="btn" onClick={()=>fileRef.current?.click()}>Import CSV</button><input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleImport}/></div></div>
      {contacts.length===0 ? <div className="empty-state"><p>No contacts yet.</p></div> :
        <table className="table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Lead Status</th><th></th></tr></thead>
          <tbody>{contacts.map(c=>(
            <tr key={c._id}><td>{c.firstName} {c.lastName}</td><td>{c.phone}</td><td>{c.email||'-'}</td>
              <td><span className="badge badge-secondary">{c.leadStatus}</span></td>
              <td><button className="btn btn-sm btn-danger" onClick={()=>handleDelete(c._id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export function TelemanProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm] = useState({ name:'', type:'twilio', accountSid:'', authToken:'', apiKey:'', apiSecret:'', appSid:'', fromNumber:'' });

  useEffect(() => { telemanAPI.getProviders().then(r => setProviders(r.data.providers||[])).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!form.name || !form.accountSid || !form.authToken) return;
    try { const r = await telemanAPI.createProvider(form); setProviders(p=>[...p,r.data.provider]); setShowAdd(false); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };
  const handleTest = async (id) => {
    try { const r = await telemanAPI.testProvider(id); alert(r.data.message); } catch (e) { alert(e?.response?.data?.message || 'Test failed'); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await telemanAPI.deleteProvider(id); setProviders(p=>p.filter(x=>x._id!==id)); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Twilio Providers</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Provider</button></div></div>
      {showAdd && (
        <div className="card mb-2">
          <div className="grid-2 gap-2 mb-1">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><label className="label">From Number</label><input className="input" value={form.fromNumber} onChange={e=>setForm(f=>({...f,fromNumber:e.target.value}))} placeholder="+15551234567"/></div>
            <div><label className="label">Account SID</label><input className="input" value={form.accountSid} onChange={e=>setForm(f=>({...f,accountSid:e.target.value}))}/></div>
            <div><label className="label">Auth Token</label><input className="input" type="password" value={form.authToken} onChange={e=>setForm(f=>({...f,authToken:e.target.value}))}/></div>
            <div><label className="label">API Key (for browser dialer)</label><input className="input" value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))}/></div>
            <div><label className="label">API Secret</label><input className="input" type="password" value={form.apiSecret} onChange={e=>setForm(f=>({...f,apiSecret:e.target.value}))}/></div>
            <div><label className="label">TwiML App SID</label><input className="input" value={form.appSid} onChange={e=>setForm(f=>({...f,appSid:e.target.value}))}/></div>
          </div>
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleSave}>Save</button><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {providers.length===0 ? <div className="empty-state"><p>No providers configured. Add your Twilio credentials to start calling.</p></div> :
        <table className="table"><thead><tr><th>Name</th><th>From Number</th><th>Status</th><th></th></tr></thead>
          <tbody>{providers.map(p=>(
            <tr key={p._id}><td>{p.name}</td><td>{p.fromNumber}</td><td><span className="badge badge-success">{p.status}</span></td>
              <td style={{display:'flex',gap:4}}><button className="btn btn-sm" onClick={()=>handleTest(p._id)}>Test</button><button className="btn btn-sm btn-danger" onClick={()=>handleDelete(p._id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export default TelemanDashboard;
