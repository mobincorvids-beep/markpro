import { useState, useEffect } from 'react';
import { mailerAPI } from '../../services/api';

export default function MailerGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: 'var(--brand)' });

  useEffect(() => { mailerAPI.getGroups().then(r => setGroups(r.data.groups || [])).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const r = await mailerAPI.createGroup(form);
      setGroups(g => [...g, r.data.group]);
      setShowAdd(false);
      setForm({ name:'', description:'', color:'var(--brand)' });
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this group? Contacts will not be deleted.')) return;
    await mailerAPI.deleteGroup(id);
    setGroups(g => g.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Contact Groups</h1>
        <div className="topbar-actions"><button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New Group</button></div>
      </div>
      {showAdd && (
        <div className="card mb-2">
          <h3 className="mb-1">New Group</h3>
          <div className="grid-2 gap-2 mb-1">
            <div><label className="label">Group Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Newsletter Subscribers"/></div>
            <div><label className="label">Color</label><input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{width:'100%',height:38,cursor:'pointer',border:'none',padding:0}}/></div>
            <div className="col-span-2"><label className="label">Description</label><input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {groups.length===0?<div className="empty-state"><div className="empty-icon"></div><p>No groups yet.</p><button className="btn btn-primary" onClick={()=>setShowAdd(true)}>Create Group</button></div>:
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
          {groups.map(g=>(
            <div key={g._id} className="card" style={{borderLeft:`4px solid ${g.color||'var(--brand)'}`}}>
              <div style={{fontWeight:500,fontSize:15,marginBottom:4}}>{g.name}</div>
              {g.description&&<div className="text-muted text-sm mb-1">{g.description}</div>}
              <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>{g.contactCount||0} contacts</div>
              <button className="btn btn-sm btn-danger" onClick={()=>handleDelete(g._id)}>Delete</button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
