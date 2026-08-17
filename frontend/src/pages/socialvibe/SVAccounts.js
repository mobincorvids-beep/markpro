import { useState, useEffect } from 'react';
import { socialvibeAPI } from '../../services/api';

const PLATFORMS = [
  { id:'facebook',  label:'Facebook',  icon:'' },
  { id:'instagram', label:'Instagram', icon:'' },
  { id:'twitter',   label:'Twitter/X', icon:'' },
  { id:'linkedin',  label:'LinkedIn',  icon:'' },
];

export function SVAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = () => socialvibeAPI.getAccounts().then(r => setAccounts(r.data.accounts || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleConnect = (platform) => {
    // In production this triggers OAuth flow. Stub: prompt for manual entry.
    const accountName = window.prompt(`Enter ${platform} account/page name to connect:`);
    if (!accountName) return;
    socialvibeAPI.connectAccount({ platform, accountId: `manual_${Date.now()}`, accountName, accountType:'profile' })
      .then(() => load()).catch(e => alert(e?.response?.data?.message || 'Error'));
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this account?')) return;
    await socialvibeAPI.disconnectAccount(id);
    setAccounts(a => a.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Connected Accounts</h1></div>

      <div className="grid-4 mb-2">
        {PLATFORMS.map(p => (
          <div key={p.id} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{p.icon}</div>
            <div style={{ fontWeight:500, marginBottom:10 }}>{p.label}</div>
            <button className="btn btn-primary btn-sm w-full" onClick={() => handleConnect(p.id)}>+ Connect</button>
          </div>
        ))}
      </div>

      <div className="card-title mb-1">Your Accounts ({accounts.length})</div>
      {accounts.length === 0 ? <div className="empty-state"><p>No accounts connected yet.</p></div> :
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Account</th><th>Platform</th><th>Followers</th><th>Status</th><th></th></tr></thead>
            <tbody>{accounts.map(a => (
              <tr key={a._id}>
                <td style={{ fontWeight:500 }}>{a.accountName}</td>
                <td>{PLATFORMS.find(p=>p.id===a.platform)?.icon} {a.platform}</td>
                <td>{a.followers?.toLocaleString() || 0}</td>
                <td><span className={`badge badge-${a.isActive?'success':'danger'}`}>{a.isActive?'Active':'Disconnected'}</span></td>
                <td><button className="btn btn-sm btn-danger" onClick={() => handleDisconnect(a._id)}>Disconnect</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      }
    </div>
  );
}

export function SVTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name:'', content:'', category:'general' });

  useEffect(() => { socialvibeAPI.getTemplates().then(r => setTemplates(r.data.templates || [])).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!form.name || !form.content) return;
    try {
      const r = await socialvibeAPI.createTemplate(form);
      setTemplates(t => [r.data.template, ...t]);
      setShowAdd(false); setForm({ name:'', content:'', category:'general' });
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete template?')) return;
    await socialvibeAPI.deleteTemplate(id);
    setTemplates(t => t.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Post Templates</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New Template</button></div></div>
      {showAdd && (
        <div className="card mb-2">
          <h3 className="mb-1">New Template</h3>
          <div style={{ marginBottom:10 }}><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ marginBottom:10 }}><label className="label">Content</label><textarea className="input" rows={4} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}/></div>
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleSave}>Save</button><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {templates.length === 0 ? <div className="empty-state"><p>No templates yet.</p></div> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
          {templates.map(t => (
            <div key={t._id} className="card">
              <div style={{ fontWeight:500, marginBottom:6 }}>{t.name}</div>
              <div className="text-muted text-sm mb-2" style={{ maxHeight:60, overflow:'hidden' }}>{t.content}</div>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t._id)}>Delete</button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

export function SVTeam() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState('editor');

  useEffect(() => { socialvibeAPI.getTeam().then(r => setMembers(r.data.members || [])).finally(() => setLoading(false)); }, []);

  const handleInvite = async () => {
    if (!email) return;
    try {
      await socialvibeAPI.inviteMember({ email, role });
      alert(`Invitation sent to ${email}`);
      setEmail('');
      socialvibeAPI.getTeam().then(r => setMembers(r.data.members || []));
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove team member?')) return;
    await socialvibeAPI.removeMember(id);
    setMembers(m => m.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Team</h1></div>
      <div className="card mb-2">
        <div className="card-title mb-1">Invite Team Member</div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" style={{ flex:1 }} placeholder="email@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <select className="input" style={{ width:140 }} value={role} onChange={e=>setRole(e.target.value)}>
            <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
          </select>
          <button className="btn btn-primary" onClick={handleInvite}>Invite</button>
        </div>
      </div>
      {members.length === 0 ? <div className="empty-state"><p>No team members yet.</p></div> :
        <table className="table">
          <thead><tr><th>Member</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>{members.map(m => (
            <tr key={m._id}>
              <td>{m.member?.name || m.email}</td>
              <td><span className="badge badge-secondary">{m.role}</span></td>
              <td><span className={`badge badge-${m.status==='active'?'success':'warning'}`}>{m.status}</span></td>
              <td><button className="btn btn-sm btn-danger" onClick={() => handleRemove(m._id)}>Remove</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export default SVAccounts;
