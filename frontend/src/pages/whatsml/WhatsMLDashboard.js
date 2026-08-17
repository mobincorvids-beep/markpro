import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { whatsmlAPI } from '../../services/api';

export default function WhatsMLDashboard() {
  const [cloudApps, setCloudApps] = useState([]);
  const [webApps, setWebApps]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddCloud, setShowAddCloud] = useState(false);
  const [cloudForm, setCloudForm] = useState({ name:'', phoneNumberId:'', accessToken:'', wabaId:'' });
  const [qrFor, setQrFor]         = useState(null);
  const [qrCode, setQrCode]       = useState(null);

  const load = useCallback(() => {
    Promise.all([whatsmlAPI.getCloudApps(), whatsmlAPI.getWebApps(), whatsmlAPI.getCustomers({ limit:1 })])
      .then(([c, w, cust]) => { setCloudApps(c.data.apps||[]); setWebApps(w.data.apps||[]); setCustomers(cust.data.customers||[]); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAddCloud = async () => {
    if (!cloudForm.phoneNumberId || !cloudForm.accessToken) return;
    try { const r = await whatsmlAPI.createCloudApp(cloudForm); setCloudApps(c=>[...c,r.data.app]); setShowAddCloud(false); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleAddWebApp = async () => {
    const name = window.prompt('Name this WhatsApp Web connection:', 'My WhatsApp');
    if (!name) return;
    try {
      const r = await whatsmlAPI.createWebApp({ name });
      setWebApps(w => [...w, r.data.app]);
      setQrFor(r.data.app._id);
      pollQr(r.data.app._id);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const pollQr = async (id) => {
    try {
      const r = await whatsmlAPI.getQrCode(id);
      setQrCode(r.data.qr);
      if (r.data.status !== 'connected') setTimeout(() => pollQr(id), 3000);
    } catch {}
  };

  const handleDeleteWebApp = async (id) => {
    if (!window.confirm('Disconnect this WhatsApp Web session?')) return;
    await whatsmlAPI.deleteWebApp(id);
    setWebApps(w => w.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>WhatsML - Dual Channel</h1></div>

      <div className="grid-4 mb-2">
        {[['Cloud API Apps', cloudApps.length, '#25D366'],['Web Sessions', webApps.length, '#075E54'],['Customers', customers.length || 0, 'var(--brand)'],['Active Channels', cloudApps.length+webApps.length, '#10b981']].map(([l,v,c])=>(
          <div key={l} className="card stat-card"><div className="label">{l}</div><div className="value" style={{color:c}}>{v}</div></div>
        ))}
      </div>

      <div className="grid-2 mb-2">
        {/* Cloud API */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="card-title">Meta Cloud API</div>
            <button className="btn btn-sm btn-primary" onClick={() => setShowAddCloud(true)}>+ Connect</button>
          </div>
          {showAddCloud && (
            <div style={{ background:'var(--bg)', padding:12, borderRadius:8, marginBottom:10 }}>
              <input className="input mb-1" placeholder="Connection name" value={cloudForm.name} onChange={e=>setCloudForm(f=>({...f,name:e.target.value}))}/>
              <input className="input mb-1" placeholder="Phone Number ID" value={cloudForm.phoneNumberId} onChange={e=>setCloudForm(f=>({...f,phoneNumberId:e.target.value}))}/>
              <input className="input mb-1" placeholder="Access Token" type="password" value={cloudForm.accessToken} onChange={e=>setCloudForm(f=>({...f,accessToken:e.target.value}))}/>
              <input className="input mb-1" placeholder="WABA ID (optional)" value={cloudForm.wabaId} onChange={e=>setCloudForm(f=>({...f,wabaId:e.target.value}))}/>
              <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary btn-sm" onClick={handleAddCloud}>Save</button><button className="btn btn-sm" onClick={()=>setShowAddCloud(false)}>Cancel</button></div>
            </div>
          )}
          {cloudApps.length === 0 ? <p className="text-muted text-sm">No Cloud API connections.</p> :
            cloudApps.map(a => (
              <div key={a._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div><div style={{ fontWeight:500, fontSize:13 }}>{a.name}</div><div className="text-muted text-sm">{a.displayPhoneNumber || a.phoneNumberId}</div></div>
                <span className={`badge badge-${a.status==='connected'?'success':'warning'}`}>{a.status}</span>
              </div>
            ))
          }
        </div>

        {/* WhatsApp Web (Baileys) */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="card-title">WhatsApp Web (QR)</div>
            <button className="btn btn-sm btn-primary" onClick={handleAddWebApp}>+ New Session</button>
          </div>
          {qrFor && qrCode && (
            <div style={{ textAlign:'center', padding:16, background:'var(--bg)', borderRadius:8, marginBottom:10 }}>
              <p className="text-sm mb-1">Scan with WhatsApp on your phone</p>
              <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" style={{ width:180, height:180, margin:'0 auto' }} />
              <button className="btn btn-sm mt-1" onClick={() => setQrFor(null)}>Close</button>
            </div>
          )}
          {webApps.length === 0 ? <p className="text-muted text-sm">No WhatsApp Web sessions. Requires the Baileys microservice running.</p> :
            webApps.map(a => (
              <div key={a._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div><div style={{ fontWeight:500, fontSize:13 }}>{a.name}</div><div className="text-muted text-sm">{a.phoneNumber || a.sessionId}</div></div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span className={`badge badge-${a.status==='connected'?'success':a.status==='qr_pending'?'warning':'secondary'}`}>{a.status}</span>
                  {a.status !== 'connected' && <button className="btn btn-sm" onClick={() => { setQrFor(a._id); pollQr(a._id); }}>Show QR</button>}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteWebApp(a._id)}></button>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className="grid-3">
        {[
          ['Inbox', '/whatsml/inbox', 'Unified conversations'],
          ['Customers', '/whatsml/customers', 'CRM contacts'],
          ['Campaigns', '/whatsml/campaigns', 'Bulk messaging'],
          ['Auto-Reply Bots', '/whatsml/bots', 'Keyword & AI rules'],
          ['AI Training', '/whatsml/training', 'RAG knowledge base'],
          ['Number Checker', '/whatsml/scanner', 'Verify WhatsApp numbers'],
          ['Web Scraping', '/whatsml/scrape', 'Lead generation'],
        ].map(([l, to, desc]) => (
          <Link key={to} to={to}><div className="card card-hover"><div style={{ fontWeight:500, marginBottom:4 }}>{l}</div><div className="text-muted text-sm">{desc}</div></div></Link>
        ))}
      </div>
    </div>
  );
}
