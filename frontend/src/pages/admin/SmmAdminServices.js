// Admin Services
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api';
import Pagination from '../../components/ui/Pagination';

export default function AdminServices() {
  const [services,    setServices]   = useState([]);
  const [categories,  setCategories] = useState([]);
  const [providers,   setProviders]  = useState([]);
  const [page,        setPage]       = useState(1);
  const [pages,       setPages]      = useState(1);
  const [search,      setSearch]     = useState('');
  const [loading,     setLoading]    = useState(true);
  const [showForm,    setShowForm]   = useState(false);
  const [editing,     setEditing]    = useState(null);
  const BLANK = { name:'', categoryId:'', type:'default', price:'', min:10, max:10000, description:'', addType:'manual', apiProviderId:'', apiServiceId:'', dripfeed:false, refill:false, cancel:false, status:1 };
  const [form, setForm] = useState(BLANK);

  const load = (p=1) => {
    setLoading(true);
    adminApi.services({ page:p, limit:50, search:search||undefined })
      .then(r => { setServices(r.data.services); setPages(r.data.pages); setPage(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load(1);
    adminApi.categories().then(r => setCategories(r.data));
    adminApi.providers().then(r => setProviders(r.data));
  }, []); // eslint-disable-line

  const openCreate = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit   = (s)  => { setEditing(s._id); setForm({ ...s, categoryId: s.categoryId?._id||s.categoryId, apiProviderId: s.apiProviderId?._id||'' }); setShowForm(true); };

  const save = async () => {
    try {
      if (editing) {
        const { data } = await adminApi.updateService(editing, form);
        setServices(prev => prev.map(s => s._id === editing ? data : s));
        toast.success('Service updated');
      } else {
        const { data } = await adminApi.createService(form);
        setServices(prev => [data, ...prev]);
        toast.success('Service created');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    await adminApi.deleteService(id);
    setServices(prev => prev.filter(s => s._id !== id));
    toast.success('Deleted');
  };

  const F = ({ label, children }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <h1>Services</h1>
        <div className="topbar-actions">
          <input className="form-control" style={{width:180}} placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && load(1)} />
          <button className="btn btn-primary" onClick={openCreate}>＋ Add Service</button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-2">
          <div className="card-title">{editing ? 'Edit Service' : 'New Service'}</div>
          <div className="grid-2">
            <F label="Name"><input className="form-control" value={form.name} onChange={e => setForm({...form, name:e.target.value})} /></F>
            <F label="Category">
              <select className="form-control" value={form.categoryId} onChange={e => setForm({...form, categoryId:e.target.value})}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Type">
              <select className="form-control" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                {['default','custom_comments','custom_comments_package','mentions_custom_list','mentions_with_hashtags','mentions_hashtag','comment_likes','mentions_user_followers','mentions_media_likers','package','subscriptions'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </F>
            <F label="Price (per 1000)"><input className="form-control" type="number" step="0.0001" value={form.price} onChange={e => setForm({...form, price:e.target.value})} /></F>
            <F label="Min"><input className="form-control" type="number" value={form.min} onChange={e => setForm({...form, min:e.target.value})} /></F>
            <F label="Max"><input className="form-control" type="number" value={form.max} onChange={e => setForm({...form, max:e.target.value})} /></F>
            <F label="Add Type">
              <select className="form-control" value={form.addType} onChange={e => setForm({...form, addType:e.target.value})}>
                <option value="manual">Manual</option>
                <option value="api">API</option>
              </select>
            </F>
            {form.addType === 'api' && <>
              <F label="Provider">
                <select className="form-control" value={form.apiProviderId} onChange={e => setForm({...form, apiProviderId:e.target.value})}>
                  <option value="">Select…</option>
                  {providers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </F>
              <F label="API Service ID"><input className="form-control" value={form.apiServiceId} onChange={e => setForm({...form, apiServiceId:e.target.value})} /></F>
            </>}
          </div>
          <F label="Description">
            <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
          </F>
          <div className="flex gap-2 mb-1">
            {['dripfeed','refill','cancel'].map(k => (
              <label key={k} style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:'0.82rem' }}>
                <input type="checkbox" checked={!!form[k]} onChange={e => setForm({...form, [k]:e.target.checked})} />
                {k.charAt(0).toUpperCase()+k.slice(1)}
              </label>
            ))}
          </div>
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>Min</th><th>Max</th><th>Add Type</th><th>Actions</th></tr></thead>
              <tbody>
                {services.map(s => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td className="text-muted text-sm">{s.categoryId?.name}</td>
                    <td><span className="badge badge-active" style={{fontSize:'0.65rem'}}>{s.type}</span></td>
                    <td style={{color:'var(--accent2)', fontWeight:600}}>${s.price}</td>
                    <td>{s.min}</td><td>{s.max?.toLocaleString()}</td>
                    <td><span className={`badge ${s.addType==='api'?'badge-completed':'badge-awaiting'}`}>{s.addType}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => del(s._id)}>Del</button>
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
  );
}
