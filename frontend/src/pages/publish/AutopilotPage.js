import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { TONES } from '../../utils/platforms';
import PlatformChip from '../../components/publish/PlatformChip';
import { FiPlus, FiX, FiPause, FiPlay, FiTrash2, FiBox } from 'react-icons/fi';

export default function Autopilot() {
  const [campaigns, setCampaigns] = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([api.get('/publish/campaigns'), api.get('/publish/social/accounts')]);
      setCampaigns(c.data.campaigns); setAccounts(a.data.accounts);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (c) => {
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await api.put(`/publish/campaigns/${c._id}`, { status: newStatus });
    toast.success(newStatus === 'active' ? 'Campaign resumed' : 'Campaign paused');
    load();
  };
  const deleteCampaign = async id => {
    if (!window.confirm('Delete this autopilot campaign?')) return;
    await api.delete(`/publish/campaigns/${id}`);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Autopilot</h1>
          <p className="text-muted text-sm mt-2">Automatically generate and post AI content on a schedule</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}><FiPlus size={14}/> New Campaign</button>
      </div>

      {loading ? <div className="spinner"/> : campaigns.length===0 ? (
        <div className="empty-state"><div className="empty-icon"></div><p>No autopilot campaigns yet</p></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {campaigns.map(c=>(
            <div key={c._id} className="card card-body">
              <div className="flex justify-between items-start">
                <div style={{flex:1}}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiBox size={15} style={{color:'var(--accent)'}}/>
                    <span style={{fontWeight:700,fontSize:14}}>{c.name}</span>
                    <span className={`badge ${c.status==='active'?'badge-green':'badge-gray'}`}>{c.status}</span>
                  </div>
                  <p className="text-muted text-sm mb-2">{c.topic}</p>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {c.accounts?.map(a=><PlatformChip key={a._id} platform={a.platform} size="xs"/>)}
                  </div>
                  <div className="text-sm text-muted">Frequency: {c.frequency} · {c.postsCreated} posts created</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-icon" onClick={()=>toggleStatus(c)}>{c.status==='active'?<FiPause size={13}/>:<FiPlay size={13}/>}</button>
                  <button className="btn-icon" onClick={()=>deleteCampaign(c._id)}><FiTrash2 size={13}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <CampaignModal accounts={accounts} onClose={()=>setShowModal(false)} onSaved={load} />}
    </div>
  );
}

function CampaignModal({ accounts, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', topic:'', tone:'Professional', frequency:'daily',
    accounts:[], includeEmoji:true, includeHashtags:true,
  });
  const [saving, setSaving] = useState(false);

  const toggleAccount = id => setForm(f => ({ ...f, accounts: f.accounts.includes(id) ? f.accounts.filter(x=>x!==id) : [...f.accounts, id] }));

  const submit = async e => {
    e.preventDefault();
    if (!form.accounts.length) return toast.error('Select at least one account');
    setSaving(true);
    try {
      await api.post('/publish/campaigns', { ...form, status:'active', startDate:new Date(), nextRunAt: new Date() });
      toast.success('Autopilot campaign created');
      onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:'var(--surface)',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',padding:26}}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{fontWeight:700}}>New Autopilot Campaign</h3>
          <button className="btn-icon" onClick={onClose}><FiX/></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Campaign Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Daily Motivation Posts" /></div>
          <div className="form-group"><label className="form-label">Topic</label><textarea required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Motivational quotes for entrepreneurs" /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Tone</label><select value={form.tone} onChange={e=>setForm({...form,tone:e.target.value})}>{TONES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Frequency</label><select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>
          </div>
          <div className="form-group">
            <label className="form-label">Accounts</label>
            <div className="flex gap-2 flex-wrap">
              {accounts.map(a=>(
                <button type="button" key={a._id} onClick={()=>toggleAccount(a._id)} className={`btn btn-sm ${form.accounts.includes(a._id)?'btn-indigo':'btn-secondary'}`}>
                  <PlatformChip platform={a.platform} size="xs"/> {a.accountName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-between mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="inline-spin"/>} Create Campaign</button>
          </div>
        </form>
      </div>
    </div>
  );
}
