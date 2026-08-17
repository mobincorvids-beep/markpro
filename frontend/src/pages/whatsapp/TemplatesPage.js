import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { templatesApi, cannedApi, aiPromptsApi, settingsApi, usersApi } from '../../services/api';

// ── Templates ─────────────────────────────────────────────────
export function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [syncing,   setSyncing]   = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { templatesApi.list().then(r => setTemplates(r.data)).finally(() => setLoading(false)); }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await templatesApi.sync();
      toast.success(`Synced ${data.synced} templates from Meta`);
      templatesApi.list().then(r => setTemplates(r.data));
    } catch (err) { toast.error(err.response?.data?.error || 'Sync failed - check WABA config in .env'); }
    finally { setSyncing(false); }
  };

  const del = async (id) => {
    await templatesApi.delete(id);
    setTemplates(p => p.filter(t => t._id !== id));
    toast.success('Deleted locally');
  };

  const statusBadge = (s) => ({
    APPROVED: 'badge-green', REJECTED: 'badge-red', PENDING: 'badge-yellow',
  }[s] || 'badge-gray');

  return (
    <>
      <div className="page-header">
        <h1>WhatsApp Templates</h1>
        <button className="btn btn-green btn-sm" onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync from Meta'}
        </button>
      </div>
      <div className="page-body">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Language</th><th>Category</th><th>Header</th><th>Body Preview</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {templates.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No templates. Click "Sync from Meta" to import your approved templates.</td></tr>}
                  {templates.map(t => (
                    <tr key={t._id}>
                      <td style={{fontWeight:600}}>{t.templateName}</td>
                      <td className="text-sm">{t.language}</td>
                      <td><span className="badge badge-blue">{t.category}</span></td>
                      <td className="text-xs text-muted">{t.headerDataFormat||'-'}</td>
                      <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} className="text-sm">{t.bodyData}</td>
                      <td><span className={`badge ${statusBadge(t.status)}`}>{t.status}</span></td>
                      <td><button className="btn btn-danger btn-xs" onClick={()=>del(t._id)}>Del</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Canned Replies ────────────────────────────────────────────
export function CannedPage() {
  const [items,    setItems]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ title: '', description: '', isPublic: true });

  useEffect(() => { cannedApi.list().then(r => setItems(r.data)); }, []);

  const save = async () => {
    try {
      if (editing) {
        const { data } = await cannedApi.update(editing, form);
        setItems(p => p.map(i => i._id===editing ? data : i));
      } else {
        const { data } = await cannedApi.create(form);
        setItems(p => [data, ...p]);
      }
      toast.success('Saved'); setShowForm(false); setEditing(null); setForm({title:'',description:'',isPublic:true});
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  const del = async (id) => {
    await cannedApi.delete(id); setItems(p => p.filter(i => i._id!==id)); toast.success('Deleted');
  };

  const openEdit = (item) => { setEditing(item._id); setForm({...item}); setShowForm(true); };

  return (
    <>
      <div className="page-header">
        <h1>Canned Replies</h1>
        <button className="btn btn-green btn-sm" onClick={()=>{setEditing(null);setForm({title:'',description:'',isPublic:true});setShowForm(p=>!p)}}>＋ New</button>
      </div>
      <div className="page-body">
        {showForm && (
          <div className="card card-body mb-2" style={{maxWidth:520}}>
            <div className="form-group"><label className="form-label">Title (shortcut)</label>
              <input className="form-control" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="greeting" /></div>
            <div className="form-group"><label className="form-label">Reply Text</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginBottom:'0.75rem'}}>
              <input type="checkbox" checked={form.isPublic} onChange={e=>setForm({...form,isPublic:e.target.checked})} />
              <span className="text-sm">Visible to all agents</span>
            </label>
            <div className="flex gap-2">
              <button className="btn btn-green btn-sm" onClick={save}>{editing?'Update':'Create'}</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Reply</th><th>Visibility</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length===0 && <tr><td colSpan={4} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No canned replies yet</td></tr>}
                {items.map(item=>(
                  <tr key={item._id}>
                    <td style={{fontWeight:600}}>{item.title}</td>
                    <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} className="text-sm">{item.description}</td>
                    <td><span className={`badge ${item.isPublic?'badge-green':'badge-gray'}`}>{item.isPublic?'Public':'Private'}</span></td>
                    <td><div className="flex gap-1">
                      <button className="btn btn-outline btn-xs" onClick={()=>openEdit(item)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(item._id)}>Del</button>
                    </div></td>
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

// ── AI Prompts ────────────────────────────────────────────────
export function AiPromptsPage() {
  const [items,    setItems]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ name: '', action: '', isPublic: true });

  useEffect(() => { aiPromptsApi.list().then(r => setItems(r.data)); }, []);

  const save = async () => {
    try {
      if (editing) {
        const { data } = await aiPromptsApi.update(editing, form);
        setItems(p => p.map(i => i._id===editing ? data : i));
      } else {
        const { data } = await aiPromptsApi.create(form);
        setItems(p => [data, ...p]);
      }
      toast.success('Saved'); setShowForm(false); setEditing(null); setForm({name:'',action:'',isPublic:true});
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  return (
    <>
      <div className="page-header">
        <h1>AI Prompts</h1>
        <button className="btn btn-green btn-sm" onClick={()=>{setEditing(null);setForm({name:'',action:'',isPublic:true});setShowForm(p=>!p)}}>＋ New</button>
      </div>
      <div className="page-body">
        {showForm && (
          <div className="card card-body mb-2" style={{maxWidth:560}}>
            <div className="form-group"><label className="form-label">Prompt Name</label>
              <input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">System Prompt (instructions for the AI)</label>
              <textarea className="form-control" rows={5} value={form.action} onChange={e=>setForm({...form,action:e.target.value})} placeholder="You are a helpful WhatsApp support agent for [company]. Always be friendly and professional…" /></div>
            <div className="flex gap-2">
              <button className="btn btn-green btn-sm" onClick={save}>{editing?'Update':'Create'}</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>System Prompt (preview)</th><th>Actions</th></tr></thead>
              <tbody>
                {items.length===0 && <tr><td colSpan={3} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No AI prompts yet</td></tr>}
                {items.map(item=>(
                  <tr key={item._id}>
                    <td style={{fontWeight:600}}>{item.name}</td>
                    <td style={{maxWidth:360,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} className="text-sm text-muted">{item.action}</td>
                    <td><div className="flex gap-1">
                      <button className="btn btn-outline btn-xs" onClick={()=>{setEditing(item._id);setForm({...item});setShowForm(true);}}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={async()=>{await aiPromptsApi.delete(item._id);setItems(p=>p.filter(i=>i._id!==item._id));}}>Del</button>
                    </div></td>
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

// ── Settings ──────────────────────────────────────────────────
export function SettingsPage() {
  const [cfg,     setCfg]     = useState({});
  const [tokens,  setTokens]  = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState({ name: '', permissions: ['contacts.read'] });
  const [createdToken, setCreatedToken] = useState(null);

  useEffect(() => {
    Promise.all([settingsApi.get(), settingsApi.tokens()])
      .then(([cRes, tRes]) => { setCfg(cRes.data); setTokens(tRes.data); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await settingsApi.save(cfg); toast.success('Settings saved'); }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setSaving(false); }
  };

  const createToken = async () => {
    try {
      const { data } = await settingsApi.createToken(newToken);
      setCreatedToken(data.token);
      setTokens(p => [data, ...p]);
      toast.success('API token created - copy it now, it won\'t be shown again');
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  const deleteToken = async (id) => {
    await settingsApi.deleteToken(id); setTokens(p => p.filter(t => t._id!==id));
  };

  const F = ({ k, label, type='text', placeholder='' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type==='checkbox'
        ? <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
            <input type="checkbox" checked={!!cfg[k]} onChange={e=>setCfg(p=>({...p,[k]:e.target.checked}))} />
            {cfg[k]?'Enabled':'Disabled'}
          </label>
        : <input className="form-control" type={type} value={cfg[k]||''} placeholder={placeholder} onChange={e=>setCfg(p=>({...p,[k]:e.target.value}))} />
      }
    </div>
  );

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <>
      <div className="page-header"><h1>Settings</h1></div>
      <div className="page-body">
        <div className="grid-2" style={{alignItems:'start'}}>
          <div>
            <div className="card card-body mb-2">
              <div style={{fontWeight:600,marginBottom:'0.75rem'}}>General</div>
              <F k="app_name"       label="App Name" />
              <F k="timezone"       label="Timezone" placeholder="UTC" />
              <F k="bot_enabled"    label="Bot Engine" type="checkbox" />
              <F k="ai_auto_reply"  label="AI Auto-reply (all chats)" type="checkbox" />
              <F k="gemini_model"   label="Gemini Model" placeholder="gemini-2.0-flash" />
              <F k="campaign_delay_ms" label="Campaign send delay (ms)" type="number" />
            </div>
            <div className="card card-body mb-2">
              <div style={{fontWeight:600,marginBottom:'0.75rem'}}>WhatsApp Cloud API</div>
              <div className="alert alert-info text-xs">These can also be set in server/.env - .env values take priority.</div>
              <F k="wa_phone_number_id" label="Phone Number ID" />
              <F k="wa_business_account_id" label="WABA ID" />
              <F k="wa_api_token"   label="API Token" type="password" />
              <F k="wa_webhook_verify_token" label="Webhook Verify Token" />
              <F k="wa_api_version" label="API Version" placeholder="v19.0" />
            </div>
            <button className="btn btn-green" onClick={save} disabled={saving}>{saving?'Saving…':'Save Settings'}</button>
          </div>
          <div>
            <div className="card card-body mb-2">
              <div style={{fontWeight:600,marginBottom:'0.75rem'}}>API Tokens</div>
              <p className="text-muted text-xs mb-2">API tokens let external apps access your contacts and send messages.</p>
              {createdToken && (
                <div className="alert alert-success mb-2">
                  <strong>Token created - copy it now:</strong><br/>
                  <code style={{wordBreak:'break-all',fontSize:'0.75rem'}}>{createdToken}</code>
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input className="form-control" placeholder="Token name" value={newToken.name} onChange={e=>setNewToken(p=>({...p,name:e.target.value}))} />
                <button className="btn btn-green btn-sm" onClick={createToken}>Create</button>
              </div>
              <div className="text-xs text-muted mb-1">Permissions:</div>
              <div className="flex gap-2 mb-2" style={{flexWrap:'wrap'}}>
                {['contacts.read','contacts.write','messages.write'].map(perm=>(
                  <label key={perm} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:'0.78rem'}}>
                    <input type="checkbox" checked={newToken.permissions.includes(perm)}
                      onChange={e=>{const perms=e.target.checked?[...newToken.permissions,perm]:newToken.permissions.filter(p=>p!==perm);setNewToken(p=>({...p,permissions:perms}));}} />
                    {perm}
                  </label>
                ))}
              </div>
              {tokens.map(t=>(
                <div key={t._id} style={{padding:'0.4rem 0.6rem',background:'var(--bg3)',borderRadius:6,marginBottom:'0.35rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'0.82rem',fontWeight:600}}>{t.name}</div>
                    <div className="text-xs text-muted">{t.permissions.join(', ')}</div>
                  </div>
                  <button className="btn btn-danger btn-xs" onClick={()=>deleteToken(t._id)}>Del</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Users ─────────────────────────────────────────────────────
export function UsersPage() {
  const [users,    setUsers]    = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState({ firstname:'', lastname:'', email:'', password:'', is_admin:false, role:'agent' });

  useEffect(() => { usersApi.list().then(r => setUsers(r.data)); }, []);

  const save = async () => {
    try {
      if (editing) {
        const { password, ...rest } = form;
        const payload = password ? form : rest;
        const { data } = await usersApi.update(editing, payload);
        setUsers(p => p.map(u => u._id===editing ? data : u));
      } else {
        const { data } = await usersApi.create(form);
        setUsers(p => [data, ...p]);
      }
      toast.success('Saved'); setShowForm(false); setEditing(null); setForm({firstname:'',lastname:'',email:'',password:'',is_admin:false,role:'agent'});
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await usersApi.delete(id); setUsers(p=>p.filter(u=>u._id!==id)); toast.success('Deleted');
  };

  const toggleEnabled = async (id) => {
    const { data } = await usersApi.toggle(id);
    setUsers(p => p.map(u => u._id===id ? {...u,is_enabled:data.is_enabled} : u));
  };

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn btn-green btn-sm" onClick={()=>{setEditing(null);setForm({firstname:'',lastname:'',email:'',password:'',is_admin:false,role:'agent'});setShowForm(p=>!p)}}>＋ New User</button>
      </div>
      <div className="page-body">
        {showForm && (
          <div className="card card-body mb-2" style={{maxWidth:520}}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">First Name</label><input className="form-control" value={form.firstname} onChange={e=>setForm({...form,firstname:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Last Name</label><input className="form-control" value={form.lastname} onChange={e=>setForm({...form,lastname:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Password {editing&&'(leave blank to keep)'}</label><input className="form-control" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Role</label>
                <select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  {['admin','agent','readonly'].map(r=><option key={r} value={r}>{r}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Admin Access</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginTop:'0.35rem'}}>
                  <input type="checkbox" checked={form.is_admin} onChange={e=>setForm({...form,is_admin:e.target.checked})} />
                  Full admin
                </label></div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-green btn-sm" onClick={save}>{editing?'Update':'Create'}</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Admin</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u._id}>
                    <td style={{fontWeight:600}}>{u.firstname} {u.lastname}</td>
                    <td className="text-sm">{u.email}</td>
                    <td><span className="badge badge-blue">{u.role}</span></td>
                    <td>{u.is_admin?<span className="badge badge-green">Yes</span>:<span className="badge badge-gray">No</span>}</td>
                    <td><span className={`badge ${u.is_enabled?'badge-green':'badge-red'}`}>{u.is_enabled?'Active':'Disabled'}</span></td>
                    <td><div className="flex gap-1">
                      <button className="btn btn-outline btn-xs" onClick={()=>{setEditing(u._id);setForm({...u,password:''});setShowForm(true);}}>Edit</button>
                      <button className="btn btn-outline btn-xs" onClick={()=>toggleEnabled(u._id)}>{u.is_enabled?'Disable':'Enable'}</button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(u._id)}>Del</button>
                    </div></td>
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

export default TemplatesPage;
