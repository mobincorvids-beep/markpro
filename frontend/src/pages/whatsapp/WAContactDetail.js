import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { contactsApi } from '../../services/api';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact,  setContact]  = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({});
  const [noteText, setNoteText] = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([contactsApi.get(id), contactsApi.statuses()])
      .then(([cRes, sRes]) => { setContact(cRes.data); setForm(cRes.data); setStatuses(sRes.data); })
      .catch(() => navigate('/contacts'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const save = async () => {
    try { const { data } = await contactsApi.update(id, form); setContact({...contact,...data}); setEditing(false); toast.success('Saved'); }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      const { data } = await contactsApi.addNote(id, { note: noteText });
      setContact(prev => ({ ...prev, notes: [data, ...(prev.notes||[])] }));
      setNoteText('');
    } catch (err) { toast.error('Failed to add note'); }
  };

  const deleteNote = async (nid) => {
    await contactsApi.deleteNote(id, nid);
    setContact(prev => ({ ...prev, notes: prev.notes.filter(n => n._id !== nid) }));
  };

  const deleteContact = async () => {
    if (!window.confirm('Delete this contact?')) return;
    await contactsApi.delete(id);
    toast.success('Deleted'); navigate('/contacts');
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  if (!contact) return null;

  const F = ({ label, field, type='text' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {editing
        ? <input className="form-control" type={type} value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})} />
        : <div className="text-sm" style={{padding:'0.4rem 0',color:form[field]?'var(--text)':'var(--text2)'}}>{form[field]||'-'}</div>
      }
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/contacts')}>← Back</button>
          <h1 style={{marginTop:'0.25rem'}}>{contact.firstname} {contact.lastname}</h1>
        </div>
        <div className="flex gap-2">
          {editing
            ? <><button className="btn btn-green btn-sm" onClick={save}>Save</button><button className="btn btn-ghost btn-sm" onClick={()=>setEditing(false)}>Cancel</button></>
            : <><button className="btn btn-outline btn-sm" onClick={()=>setEditing(true)}>Edit</button><button className="btn btn-danger btn-sm" onClick={deleteContact}>Delete</button></>
          }
        </div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{alignItems:'start'}}>
          <div className="card card-body">
            <div className="text-sm" style={{fontWeight:600,marginBottom:'0.75rem'}}>Contact Info</div>
            <div className="grid-2">
              <F label="First Name" field="firstname" />
              <F label="Last Name"  field="lastname" />
              <F label="Phone"      field="phone" />
              <F label="Email"      field="email" type="email" />
              <F label="Company"    field="company" />
              <F label="Website"    field="website" />
              <div className="form-group">
                <label className="form-label">Type</label>
                {editing
                  ? <select className="form-control" value={form.type||'lead'} onChange={e=>setForm({...form,type:e.target.value})}>
                      {['lead','customer','contact'].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  : <div className="text-sm">{form.type}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                {editing
                  ? <select className="form-control" value={form.statusId?._id||form.statusId||''} onChange={e=>setForm({...form,statusId:e.target.value})}>
                      <option value="">None</option>
                      {statuses.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  : <div className="text-sm">{contact.statusId?.name||'-'}</div>}
              </div>
            </div>
            <F label="Description" field="description" />
            <div className="text-muted text-xs mt-1">Added {new Date(contact.createdAt).toLocaleString()}</div>
          </div>

          <div className="card card-body">
            <div className="text-sm" style={{fontWeight:600,marginBottom:'0.75rem'}}>Notes</div>
            <form onSubmit={addNote} className="flex gap-2 mb-2">
              <input className="form-control" placeholder="Add a note…" value={noteText} onChange={e=>setNoteText(e.target.value)} />
              <button className="btn btn-green btn-sm">Add</button>
            </form>
            {(contact.notes||[]).length===0 && <div className="text-muted text-sm">No notes yet</div>}
            {(contact.notes||[]).map(note=>(
              <div key={note._id} style={{padding:'0.6rem',background:'var(--bg3)',borderRadius:6,marginBottom:'0.4rem'}}>
                <div className="text-sm">{note.note}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted">by {note.addedFrom?.firstname} · {new Date(note.createdAt).toLocaleDateString()}</span>
                  <button className="btn btn-ghost btn-xs text-danger" onClick={()=>deleteNote(note._id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
