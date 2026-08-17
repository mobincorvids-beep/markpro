import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PLATFORMS } from '../../utils/platforms';
import { FiTrash2, FiPlus, FiX, FiExternalLink } from 'react-icons/fi';

export default function SocialAccounts() {
  const [params] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showManual, setManual] = useState(false);

  useEffect(() => {
    load();
    if (params.get('connected')) toast.success(`${params.get('connected')} connected successfully!`);
    if (params.get('error'))     toast.error(`Connection failed: ${params.get('error')}`);
  }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/publish/social/accounts'); setAccounts(data.accounts); }
    catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };

  const connect = async (platform) => {
    try {
      const { data } = await api.get(`/publish/social/oauth/${platform}`);
      window.location.href = data.url;
    } catch (e) { toast.error(e.response?.data?.message || 'OAuth not configured for this platform'); }
  };

  const disconnect = async (id) => {
    if (!window.confirm('Disconnect this account?')) return;
    await api.delete(`/publish/social/accounts/${id}`);
    toast.success('Account disconnected');
    load();
  };

  const connectedPlatforms = new Set(accounts.map(a=>a.platform));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Social Accounts</h1>
        <button className="btn btn-secondary" onClick={()=>setManual(true)}><FiPlus size={14}/> Add Manually</button>
      </div>

      {loading ? <div className="spinner"/> : (
        <>
          {accounts.length > 0 && (
            <>
              <h2 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Connected Accounts</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:32}}>
                {accounts.map(a=>{
                  const p = PLATFORMS[a.platform];
                  return (
                    <div key={a._id} className="account-card">
                      <div className="account-avatar" style={{background:p?.bg,color:p?.color}}>
                        {a.avatar ? <img src={a.avatar} alt="" style={{width:'100%',height:'100%',borderRadius:'50%'}}/> : p?.icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.accountName}</div>
                        <div className="text-muted text-sm">{p?.label} {a.accountHandle}</div>
                      </div>
                      <button className="btn-icon" onClick={()=>disconnect(a._id)}><FiTrash2 size={13}/></button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h2 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Connect a Platform</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
            {Object.entries(PLATFORMS).map(([key,p])=>(
              <button key={key} onClick={()=>connect(key)} className="card card-body"
                style={{display:'flex',alignItems:'center',gap:12,textAlign:'left',cursor:'pointer',border:'1.5px solid var(--border)'}}>
                <div style={{width:42,height:42,borderRadius:10,background:p.bg,color:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{p.icon}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{p.label}</div>
                  <div className="text-muted text-sm">{connectedPlatforms.has(key)?'Add another':'Connect now'}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showManual && <ManualAccountModal onClose={()=>setManual(false)} onSaved={load} />}
    </div>
  );
}

function ManualAccountModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ platform:'facebook', accountName:'', accountHandle:'', accessToken:'' });
  const [saving, setSaving] = useState(false);

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/publish/social/accounts/manual', form);
      toast.success('Account added');
      onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
      <div style={{background:'var(--surface)',borderRadius:14,width:'100%',maxWidth:420,padding:26}}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{fontWeight:700}}>Add Account Manually</h3>
          <button className="btn-icon" onClick={onClose}><FiX/></button>
        </div>
        <p className="text-muted text-sm mb-4">For testing, or platforms without OAuth configured. Add an API access token directly.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Platform</label>
            <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>
              {Object.entries(PLATFORMS).map(([k,p])=><option key={k} value={k}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Account Name</label><input required value={form.accountName} onChange={e=>setForm({...form,accountName:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Handle (optional)</label><input value={form.accountHandle} onChange={e=>setForm({...form,accountHandle:e.target.value})} placeholder="@username" /></div>
          <div className="form-group"><label className="form-label">Access Token</label><input value={form.accessToken} onChange={e=>setForm({...form,accessToken:e.target.value})} placeholder="API access token" /></div>
          <div className="flex gap-2 justify-between" style={{marginTop:20}}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="inline-spin"/>} Add Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}
