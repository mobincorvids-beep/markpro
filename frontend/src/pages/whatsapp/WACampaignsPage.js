import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { campaignsApi, templatesApi, contactsApi } from '../../services/api';

// ── Campaigns list ────────────────────────────────────────────
export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { campaignsApi.list().then(r => setCampaigns(r.data.campaigns)).finally(() => setLoading(false)); }, []);

  const pause  = async (id) => { await campaignsApi.pause(id);  setCampaigns(p => p.map(c => c._id===id?{...c,pauseCampaign:true}:c)); };
  const resume = async (id) => { await campaignsApi.resume(id); setCampaigns(p => p.map(c => c._id===id?{...c,pauseCampaign:false}:c)); };
  const del    = async (id) => { if (!window.confirm('Delete?')) return; await campaignsApi.delete(id); setCampaigns(p=>p.filter(c=>c._id!==id)); toast.success('Deleted'); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <>
      <div className="page-header">
        <h1>Campaigns</h1>
        <Link to="/campaigns/new"><button className="btn btn-green">＋ New Campaign</button></Link>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Sending</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {campaigns.length===0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No campaigns yet</td></tr>}
                {campaigns.map(c=>(
                  <tr key={c._id}>
                    <td><Link to={`/campaigns/${c._id}`} style={{fontWeight:600}}>{c.name}</Link></td>
                    <td><span className="badge badge-blue">{c.relType}</span></td>
                    <td>{c.sendingCount.toLocaleString()}</td>
                    <td>
                      {c.isSent ? <span className="badge badge-green">Sent</span>
                       : c.pauseCampaign ? <span className="badge badge-yellow">Paused</span>
                       : <span className="badge badge-blue">Active</span>}
                    </td>
                    <td className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/campaigns/${c._id}`}><button className="btn btn-outline btn-xs">Details</button></Link>
                        {!c.isSent && (c.pauseCampaign
                          ? <button className="btn btn-green btn-xs" onClick={()=>resume(c._id)}>▶ Resume</button>
                          : <button className="btn btn-outline btn-xs" onClick={()=>pause(c._id)}>⏸ Pause</button>
                        )}
                        <button className="btn btn-danger btn-xs" onClick={()=>del(c._id)}></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Campaign Detail ───────────────────────────────────────────
export function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [details,  setDetails]  = useState([]);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([campaignsApi.get(id), campaignsApi.details(id, { page:1, limit:30 })])
      .then(([cRes,dRes]) => { setCampaign(cRes.data); setDetails(dRes.data.details); setPages(dRes.data.pages); })
      .finally(() => setLoading(false));
  }, [id]);

  const retry = async () => { await campaignsApi.retry(id); setCampaign(p=>({...p,isSent:false})); toast.success('Queued for retry'); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  if (!campaign) return null;
  const s = campaign.stats || {};

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/campaigns')}>← Back</button>
          <h1 style={{marginTop:'0.25rem'}}>{campaign.name}</h1>
        </div>
        {campaign.isSent && s.failed>0 && <button className="btn btn-outline btn-sm" onClick={retry}>Retry Failed</button>}
      </div>
      <div className="page-body">
        <div className="grid-4 mb-2">
          {[['Total',s.total,'var(--accent2)'],['Sent',s.sent,'var(--success)'],['Failed',s.failed,'var(--danger)'],['Pending',s.pending,'var(--warn)']].map(([l,v,c])=>(
            <div className="card stat-card" key={l}><div className="stat-label">{l}</div><div className="stat-value" style={{color:c}}>{v??0}</div></div>
          ))}
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Contact</th><th>Phone</th><th>Status</th><th>WAMID</th><th>Sent</th></tr></thead>
              <tbody>
                {details.map(d=>(
                  <tr key={d._id}>
                    <td>{d.relId?.firstname} {d.relId?.lastname}</td>
                    <td className="text-sm">{d.relId?.phone}</td>
                    <td><span className={`badge ${d.status===1?'badge-green':d.status===2?'badge-red':'badge-yellow'}`}>{d.status===1?'Sent':d.status===2?'Failed':'Pending'}</span></td>
                    <td className="text-xs text-muted" style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{d.whatsappId||'-'}</td>
                    <td className="text-xs text-muted">{d.status===1?new Date(d.updatedAt).toLocaleString():'-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── New Campaign ──────────────────────────────────────────────
export function NewCampaign() {
  const navigate  = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [contacts,  setContacts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [form, setForm] = useState({ name:'', relType:'lead', templateId:'', sendNow:true, scheduledSendTime:'', selectAll:true, bodyParams:[], headerParams:[] });

  useEffect(() => {
    templatesApi.list().then(r => setTemplates(r.data.filter(t=>t.status==='APPROVED')));
    contactsApi.list({ limit:999 }).then(r => setContacts(r.data.contacts));
  }, []);

  const onTemplateChange = (tid) => {
    const tpl = templates.find(t => t.templateId === tid || t._id === tid);
    setSelectedTpl(tpl);
    const bp = Array(tpl?.bodyParamsCount||0).fill('');
    const hp = Array(tpl?.headerParamsCount||0).fill('');
    setForm(p => ({ ...p, templateId: tid, bodyParams: bp, headerParams: hp }));
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => {
      if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
      else fd.append(k, v);
    });
    try {
      await campaignsApi.create(fd);
      toast.success('Campaign created!'); navigate('/campaigns');
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/campaigns')}>← Back</button>
          <h1 style={{marginTop:'0.25rem'}}>New Campaign</h1>
        </div>
      </div>
      <div className="page-body">
        <form onSubmit={submit} style={{maxWidth:680}}>
          <div className="card card-body mb-2">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input className="form-control" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Type</label>
                <select className="form-control" value={form.relType} onChange={e=>setForm({...form,relType:e.target.value})}>
                  {['lead','customer','contact'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Template (Approved only)</label>
                <select className="form-control" required value={form.templateId} onChange={e=>onTemplateChange(e.target.value)}>
                  <option value="">Select template…</option>
                  {templates.map(t=><option key={t._id} value={t.templateId}>{t.templateName} ({t.language})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Send</label>
                <select className="form-control" value={form.sendNow?'now':'scheduled'} onChange={e=>setForm({...form,sendNow:e.target.value==='now'})}>
                  <option value="now">Send Now</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
              {!form.sendNow && (
                <div className="form-group">
                  <label className="form-label">Schedule Date & Time</label>
                  <input className="form-control" type="datetime-local" value={form.scheduledSendTime} onChange={e=>setForm({...form,scheduledSendTime:e.target.value})} />
                </div>
              )}
            </div>
            <div className="form-group">
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                <input type="checkbox" checked={form.selectAll} onChange={e=>setForm({...form,selectAll:e.target.checked})} />
                <span className="form-label" style={{margin:0}}>Send to all {form.relType}s</span>
              </label>
            </div>
          </div>

          {selectedTpl && (
            <div className="card card-body mb-2">
              <div className="text-sm" style={{fontWeight:600,marginBottom:'0.5rem'}}>Template Parameters</div>
              {selectedTpl.bodyParamsCount>0 && (
                <div>
                  <div className="text-xs text-muted mb-1">Body params ({selectedTpl.bodyParamsCount})</div>
                  {Array.from({length:selectedTpl.bodyParamsCount},(_,i)=>(
                    <div className="form-group" key={i}>
                      <label className="form-label">{'{{'+String(i+1)+'}}'}</label>
                      <input className="form-control" value={form.bodyParams[i]||''} onChange={e=>{const bp=[...form.bodyParams];bp[i]=e.target.value;setForm({...form,bodyParams:bp});}} placeholder={`Use {{firstname}}, {{lastname}}, {{phone}}…`} />
                    </div>
                  ))}
                </div>
              )}
              <div className="alert alert-info text-xs">Preview: {selectedTpl.bodyData}</div>
            </div>
          )}

          <button className="btn btn-green" disabled={loading}>{loading?'Creating…':'Create Campaign'}</button>
        </form>
      </div>
    </>
  );
}

export default CampaignsPage;
