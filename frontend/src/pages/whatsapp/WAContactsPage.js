import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { contactsApi } from '../../services/api';

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-outline btn-xs" disabled={page<=1} onClick={()=>onChange(page-1)}>‹</button>
      {Array.from({length:Math.min(pages,7)},(_,i)=>i+Math.max(1,page-3)).filter(n=>n<=pages).map(n=>(
        <button key={n} className={`btn btn-xs ${n===page?'btn-primary':'btn-outline'}`} onClick={()=>onChange(n)}>{n}</button>
      ))}
      <button className="btn btn-outline btn-xs" disabled={page>=pages} onClick={()=>onChange(page+1)}>›</button>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [search,   setSearch]   = useState('');
  const [typeF,    setTypeF]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [importing,setImporting]= useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [form,     setForm]     = useState({ firstname:'', phone:'', type:'lead' });
  const fileRef = useRef();

  const load = (p=1) => {
    setLoading(true);
    contactsApi.list({ page:p, limit:25, search:search||undefined, type:typeF||undefined })
      .then(r => { setContacts(r.data.contacts); setPages(r.data.pages); setTotal(r.data.total); setPage(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, [typeF]); // eslint-disable-line
  useEffect(() => { contactsApi.statuses().then(r => setStatuses(r.data)); }, []);

  const createContact = async (e) => {
    e.preventDefault();
    try {
      await contactsApi.create(form);
      toast.success('Contact created'); setShowNew(false); setForm({ firstname:'', phone:'', type:'lead' }); load(1);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file); fd.append('type', 'lead');
    try {
      const { data } = await contactsApi.importCsv(fd);
      toast.success(`Imported ${data.imported} contacts`);
      if (data.errors?.length) toast.warn(`${data.errors.length} rows had errors`);
      load(1);
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed'); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const typeColor = { lead: 'var(--warn)', customer: 'var(--success)', contact: 'var(--accent2)' };

  return (
    <>
      <div className="page-header">
        <h1>Contacts <span className="text-muted text-sm">({total})</span></h1>
        <div className="flex gap-2 items-center">
          <input className="form-control" style={{width:180}} placeholder="Search…" value={search}
            onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(1)} />
          <select className="form-control" style={{width:'auto'}} value={typeF} onChange={e=>setTypeF(e.target.value)}>
            <option value="">All Types</option>
            {['lead','customer','contact'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleImport} />
          <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button className="btn btn-green btn-sm" onClick={()=>setShowNew(p=>!p)}>＋ Add Contact</button>
        </div>
      </div>
      <div className="page-body">
        {showNew && (
          <div className="card card-body mb-2" style={{maxWidth:480}}>
            <div className="text-sm" style={{fontWeight:600,marginBottom:'0.75rem'}}>New Contact</div>
            <form onSubmit={createContact}>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">First Name</label>
                  <input className="form-control" required value={form.firstname} onChange={e=>setForm({...form,firstname:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Phone (with country code)</label>
                  <input className="form-control" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="919876543210" /></div>
                <div className="form-group"><label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                    {['lead','customer','contact'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-green btn-sm">Save</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        <div className="card">
          {loading ? <div className="loader"><div className="spinner"/></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Type</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {contacts.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No contacts found</td></tr>}
                  {contacts.map(c=>(
                    <tr key={c._id}>
                      <td><Link to={`/contacts/${c._id}`} style={{fontWeight:600}}>{c.firstname} {c.lastname}</Link>
                        {c.company && <div className="text-xs text-muted">{c.company}</div>}
                      </td>
                      <td className="text-sm">{c.phone}</td>
                      <td className="text-sm text-muted">{c.email||'-'}</td>
                      <td><span className="badge" style={{background:`${typeColor[c.type]}22`,color:typeColor[c.type]}}>{c.type}</span></td>
                      <td>{c.statusId ? <span className="badge badge-blue">{c.statusId.name}</span> : '-'}</td>
                      <td className="text-xs text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/contacts/${c._id}`}><button className="btn btn-outline btn-xs">View</button></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pages={pages} onChange={load} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
