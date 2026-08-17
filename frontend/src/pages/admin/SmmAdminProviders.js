import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';

// ─── AdminProviders ───────────────────────────────────────────
export function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const BLANK = { name:'', url:'', apiKey:'', status:1 };
  const [form,    setForm]    = useState(BLANK);
  const [editing, setEditing] = useState(null);
  const [showForm,setShowForm]= useState(false);

  useEffect(() => { adminApi.providers().then(r => setProviders(r.data)).finally(() => setLoading(false)); }, []);

  const save = async () => {
    try {
      if (editing) {
        const { data } = await adminApi.updateProvider(editing, form);
        setProviders(prev => prev.map(p => p._id === editing ? data : p));
        toast.success('Provider updated');
      } else {
        const { data } = await adminApi.createProvider(form);
        setProviders(prev => [data, ...prev]);
        toast.success('Provider added');
      }
      setShowForm(false); setEditing(null); setForm(BLANK);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const checkBalance = async (id) => {
    try {
      const { data } = await adminApi.checkProviderBal(id);
      toast.info(`Balance: ${data.balance} ${data.currency || ''}`);
    } catch (err) { toast.error('Could not check balance'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete provider?')) return;
    await adminApi.deleteProvider(id);
    setProviders(prev => prev.filter(p => p._id !== id));
    toast.success('Deleted');
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>API Providers</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(BLANK); setShowForm(true); }}>＋ Add Provider</button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <div className="card-title">{editing ? 'Edit Provider' : 'New Provider'}</div>
          <div className="grid-2">
            {[['name','Name','text'],['url','API URL','text'],['apiKey','API Key','password']].map(([k,l,t]) => (
              <div className="form-group" key={k}>
                <label className="form-label">{l}</label>
                <input className="form-control" type={t} value={form[k]} onChange={e => setForm({...form, [k]:e.target.value})} />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>URL</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {providers.length === 0 && <tr><td colSpan={4} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No providers</td></tr>}
              {providers.map(p => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td className="text-muted text-sm">{p.url}</td>
                  <td><span className={`badge ${p.status===1?'badge-completed':'badge-canceled'}`}>{p.status===1?'Active':'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-outline btn-xs" onClick={() => { setEditing(p._id); setForm({...p}); setShowForm(true); }}>Edit</button>
                      <button className="btn btn-outline btn-xs" onClick={() => checkBalance(p._id)}>Balance</button>
                      <button className="btn btn-danger btn-xs" onClick={() => del(p._id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AdminTickets ─────────────────────────────────────────────
export function AdminTickets() {
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply,    setReply]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.tickets({ status: filterStatus||undefined })
      .then(r => setTickets(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus]); // eslint-disable-line

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await adminApi.replyTicket(selected._id, { message: reply });
      setSelected(data);
      setTickets(prev => prev.map(t => t._id === data._id ? data : t));
      setReply('');
      toast.success('Reply sent');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSending(false); }
  };

  const updateStatus = async (id, status) => {
    const { data } = await adminApi.updateTicket(id, status);
    setTickets(prev => prev.map(t => t._id === id ? data : t));
    if (selected?._id === id) setSelected(data);
    toast.success('Status updated');
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Support Tickets</h1>
        <select className="form-control" style={{ width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          {['open','pending','answered','closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid-2" style={{ alignItems:'start' }}>
        <div className="card">
          {tickets.map(t => (
            <div key={t._id}
              onClick={() => setSelected(t)}
              style={{ padding:'0.75rem', borderBottom:'1px solid var(--border)', cursor:'pointer', background: selected?._id===t._id ? 'var(--bg3)':'' }}
            >
              <div className="flex justify-between items-center">
                <strong style={{ fontSize:'0.88rem' }}>{t.subject}</strong>
                <StatusBadge status={t.status} />
              </div>
              <div className="text-muted text-sm">{t.userId?.username} · {new Date(t.updatedAt).toLocaleDateString()}</div>
            </div>
          ))}
          {tickets.length === 0 && <div className="empty-state"><p>No tickets</p></div>}
        </div>

        {selected && (
          <div className="card">
            <div className="flex justify-between items-center mb-1">
              <strong>{selected.subject}</strong>
              <div className="flex gap-1">
                <StatusBadge status={selected.status} />
                {selected.status !== 'closed' && (
                  <button className="btn btn-outline btn-xs" onClick={() => updateStatus(selected._id, 'closed')}>Close</button>
                )}
              </div>
            </div>
            <div style={{ maxHeight:300, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1rem' }}>
              {selected.messages.map((msg, i) => (
                <div key={i} style={{ padding:'0.6rem 0.75rem', borderRadius:6, background: msg.senderRole==='admin' ? 'rgba(79,142,247,.1)' : 'var(--bg3)', fontSize:'0.85rem' }}>
                  <div className="text-muted text-sm mb-1">{msg.senderRole==='admin' ? 'You' : `${selected.userId?.username}`} · {new Date(msg.createdAt).toLocaleString()}</div>
                  {msg.message}
                </div>
              ))}
            </div>
            {selected.status !== 'closed' && (
              <div>
                <textarea className="form-control mb-1" rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write reply…" />
                <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AdminSettings ────────────────────────────────────────────
export function AdminSettings() {
  const [cfg, setCfg]     = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.settings().then(r => setCfg(r.data)).finally(() => setLoading(false)); }, []);

  const save = async () => {
    setSaving(true);
    try { await adminApi.saveSettings(cfg); toast.success('Settings saved'); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const Field = ({ k, label, type='text' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type === 'checkbox'
        ? <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <input type="checkbox" checked={!!cfg[k]} onChange={e => setCfg(p => ({...p, [k]:e.target.checked}))} />
            {cfg[k] ? 'Enabled' : 'Disabled'}
          </label>
        : <input className="form-control" type={type} value={cfg[k]||''} onChange={e => setCfg(p => ({...p, [k]:e.target.value}))} />
      }
    </div>
  );

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Settings</h1></div>
      <div className="grid-2" style={{ alignItems:'start' }}>
        <div className="card">
          <div className="card-title">General</div>
          <Field k="website_name"        label="Website Name" />
          <Field k="website_description" label="Description" />
          <Field k="currency_symbol"     label="Currency Symbol" />
          <Field k="currency_code"       label="Currency Code" />
          <Field k="min_deposit"         label="Min Deposit" type="number" />
          <Field k="max_deposit"         label="Max Deposit" type="number" />
          <Field k="registration_enabled" label="Allow Registration" type="checkbox" />
          <Field k="maintenance_mode"    label="Maintenance Mode" type="checkbox" />
        </div>
        <div className="card">
          <div className="card-title">Email</div>
          <Field k="mail_host" label="SMTP Host" />
          <Field k="mail_port" label="SMTP Port" type="number" />
          <Field k="mail_user" label="SMTP Username" />
          <Field k="mail_pass" label="SMTP Password" type="password" />
          <Field k="mail_from" label="From Address" />
          <Field k="is_order_notice_email" label="Order Notice Emails" type="checkbox" />
        </div>
      </div>
      <div className="mt-2">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
      </div>
    </div>
  );
}

// ─── AdminCoupons ─────────────────────────────────────────────
export function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const BLANK = { code:'', type:'fixed', amount:'', minDeposit:0, maxUses:0, status:1 };
  const [form, setForm]       = useState(BLANK);
  const [showForm, setShowForm]= useState(false);

  useEffect(() => { adminApi.coupons().then(r => setCoupons(r.data)).finally(() => setLoading(false)); }, []);

  const create = async () => {
    try {
      const { data } = await adminApi.createCoupon(form);
      setCoupons(prev => [data, ...prev]); setShowForm(false); setForm(BLANK);
      toast.success('Coupon created');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggle = async (id, current) => {
    const { data } = await adminApi.updateCoupon(id, { status: current === 1 ? 0 : 1 });
    setCoupons(prev => prev.map(c => c._id === id ? data : c));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Coupons</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(p => !p)}>＋ New Coupon</button>
      </div>

      {showForm && (
        <div className="card mb-2">
          <div className="card-title">New Coupon</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Code</label>
              <input className="form-control" value={form.code} onChange={e => setForm({...form, code:e.target.value.toUpperCase()})} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                <option value="fixed">Fixed ($)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input className="form-control" type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Deposit</label>
              <input className="form-control" type="number" value={form.minDeposit} onChange={e => setForm({...form, minDeposit:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Max Uses (0=unlimited)</label>
              <input className="form-control" type="number" value={form.maxUses} onChange={e => setForm({...form, maxUses:e.target.value})} />
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-primary" onClick={create}>Create</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Type</th><th>Amount</th><th>Min Deposit</th><th>Uses</th><th>Max Uses</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {coupons.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No coupons</td></tr>}
              {coupons.map(c => (
                <tr key={c._id}>
                  <td><code style={{color:'var(--accent2)'}}>{c.code}</code></td>
                  <td>{c.type}</td>
                  <td>{c.type==='percent'?`${c.amount}%`:`$${c.amount}`}</td>
                  <td>${c.minDeposit}</td>
                  <td>{c.usedCount}</td>
                  <td>{c.maxUses||'∞'}</td>
                  <td><span className={`badge ${c.status===1?'badge-completed':'badge-canceled'}`}>{c.status===1?'Active':'Inactive'}</span></td>
                  <td><button className="btn btn-outline btn-xs" onClick={() => toggle(c._id, c.status)}>{c.status===1?'Disable':'Enable'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminProviders;
