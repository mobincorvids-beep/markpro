import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fundsApi, transactionsApi, subscriptionsApi, profileApi, servicesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination  from '../../components/ui/Pagination';

// ─── AddFundsPage ─────────────────────────────────────────────
export function AddFundsPage() {
  const { user, setUser } = useAuth();
  const [methods,  setMethods]  = useState([]);
  const [amount,   setAmount]   = useState('');
  const [method,   setMethod]   = useState('');
  const [coupon,   setCoupon]   = useState('');
  const [bonus,    setBonus]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fundsApi.methods().then(r => { setMethods(r.data.data); if (r.data.data[0]) setMethod(r.data.data[0].gateway); });
  }, []);

  const checkCoupon = async () => {
    if (!coupon) return;
    setChecking(true);
    try {
      const { data } = await fundsApi.validateCoupon({ code: coupon, amount: parseFloat(amount)||0 });
      setBonus(data.bonus);
      toast.success(`Coupon valid! +$${data.bonus.toFixed(2)} bonus`);
    } catch (err) { toast.error(err.response?.data?.error || 'Invalid coupon'); setBonus(0); }
    finally { setChecking(false); }
  };

  const handleManual = async () => {
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    setLoading(true);
    try {
      await fundsApi.manual({ amount: parseFloat(amount), methodId: method });
      toast.success('Deposit request submitted. Awaiting admin confirmation.');
      setAmount('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const total = (parseFloat(amount)||0) + bonus;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Funds</h1>
          <p className="page-sub">Top up your balance and start placing orders.</p>
        </div>
        <div className="balance-chip">
          <span>Current balance</span>
          <strong>${Number(user?.balance || 0).toFixed(4)}</strong>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title mb-3">Deposit</div>

          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input
              className="form-input"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => { setAmount(e.target.value); setBonus(0); }}
            />
            <div className="amount-presets">
              {[5, 10, 25, 50, 100, 250].map(v => (
                <button
                  key={v}
                  type="button"
                  className={`amount-preset${Number(amount) === v ? ' is-active' : ''}`}
                  onClick={() => { setAmount(String(v)); setBonus(0); }}
                >
                  ${v}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-input form-select" value={method} onChange={e => setMethod(e.target.value)}>
              {methods.length === 0 && <option value="">No methods available</option>}
              {methods.map(m => <option key={m._id} value={m.gateway}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Coupon Code (optional)</label>
            <div className="flex gap-2">
              <input
                className="form-input"
                value={coupon}
                onChange={e => setCoupon(e.target.value.toUpperCase())}
                placeholder="SAVE20"
              />
              <button className="btn btn-secondary" onClick={checkCoupon} disabled={checking || !coupon}>
                {checking ? 'Checking…' : 'Apply'}
              </button>
            </div>
          </div>

          {bonus > 0 && (
            <div className="alert alert-success mb-3">
              Bonus applied: +${bonus.toFixed(2)} — you will receive ${total.toFixed(2)}.
            </div>
          )}

          <div className="summary-box mb-3">
            <div className="summary-row">
              <span>Deposit amount</span>
              <strong>${(parseFloat(amount) || 0).toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Coupon bonus</span>
              <strong>+${bonus.toFixed(2)}</strong>
            </div>
            <div className="summary-row summary-total">
              <span>Credited to balance</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={handleManual} disabled={loading || !amount}>
            {loading ? 'Submitting…' : 'Submit Deposit Request'}
          </button>
        </div>

        <div className="card">
          <div className="card-title mb-3">Payment Info</div>
          <p className="page-sub" style={{ lineHeight: 1.75 }}>
            Select your preferred payment method and submit a deposit request.
            Your balance is updated as soon as an administrator confirms the payment.
          </p>
          <hr className="divider" />
          <ul className="info-list">
            <li>Deposits are reviewed manually and usually confirmed within a few minutes.</li>
            <li>Coupon bonuses are added on top of your deposit amount.</li>
            <li>PayPal and Stripe can be enabled by the administrator for instant top-ups.</li>
            <li>Contact support if a confirmed payment has not appeared on your balance.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── TransactionsPage ─────────────────────────────────────────
export function TransactionsPage() {
  const [txs,     setTxs]     = useState([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p=1) => {
    setLoading(true);
    transactionsApi.list({ page: p, limit: 25 })
      .then(r => { setTxs(r.data.transactions); setPages(r.data.pages); setPage(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []);

  return (
    <div className="page">
      <div className="topbar"><h1>Transactions</h1></div>
      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Note</th></tr></thead>
              <tbody>
                {txs.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', color:'var(--text2)' }}>No transactions</td></tr>}
                {txs.map(t => (
                  <tr key={t._id}>
                    <td className="text-muted text-sm">{new Date(t.createdAt).toLocaleString()}</td>
                    <td><StatusBadge status={t.type} /></td>
                    <td className={t.amount >= 0 ? 'text-success' : 'text-danger'}>
                      {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(4)}
                    </td>
                    <td className="text-muted">${t.balanceBefore?.toFixed(4)}</td>
                    <td>${t.balanceAfter?.toFixed(4)}</td>
                    <td className="text-muted text-sm">{t.note}</td>
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

// ─── SubscriptionsPage ────────────────────────────────────────
export function SubscriptionsPage() {
  const [subs, setSubs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionsApi.list().then(r => setSubs(r.data.data)).finally(() => setLoading(false));
  }, []);

  const toggle = async (id, current) => {
    try {
      const fn = current === 'active' ? subscriptionsApi.pause : subscriptionsApi.resume;
      const { data } = await fn(id);
      setSubs(prev => prev.map(s => s._id === id ? data : s));
      toast.success(current === 'active' ? 'Paused' : 'Resumed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Subscriptions</h1></div>
      <div className="card">
        {subs.length === 0 ? (
          <div className="empty-state"><div className="icon"></div><p>No subscriptions yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Service</th><th>Username</th><th>Posts</th><th>Min/Max</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s._id}>
                    <td className="text-muted text-sm">#{s._id.slice(-6)}</td>
                    <td>{s.serviceId?.name || '-'}</td>
                    <td>{s.username}</td>
                    <td>{s.subPosts}</td>
                    <td>{s.subMin}/{s.subMax}</td>
                    <td><StatusBadge status={s.subStatus} /></td>
                    <td>
                      <button className="btn btn-outline btn-xs" onClick={() => toggle(s._id, s.subStatus)}>
                        {s.subStatus === 'active' ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────
export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form,    setForm]    = useState({ username: user?.username||'', email: user?.email||'', currentPassword:'', newPassword:'' });
  const [saving,  setSaving]  = useState(false);
  const [apiKey,  setApiKey]  = useState(user?.apiKey||'');
  const [copied,  setCopied]  = useState(false);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await profileApi.update(form);
      setUser(prev => ({ ...prev, ...data.user }));
      toast.success('Profile updated');
      setForm(prev => ({ ...prev, currentPassword:'', newPassword:'' }));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const regenKey = async () => {
    if (!window.confirm('Regenerate your API key? Existing integrations will break.')) return;
    const { data } = await profileApi.regenerateApiKey();
    setApiKey(data.apiKey);
    setUser(prev => ({ ...prev, apiKey: data.apiKey }));
    toast.success('API key regenerated');
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>Profile</h1></div>
      <div className="grid-2" style={{ alignItems:'start' }}>
        <div className="card">
          <div className="card-title">Account Details</div>
          <form onSubmit={save}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username} onChange={e => setForm({...form, username:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
            </div>
            <hr className="divider" />
            <div className="card-title">Change Password</div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-control" type="password" value={form.currentPassword} onChange={e => setForm({...form, currentPassword:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword:e.target.value})} />
            </div>
            <button className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">API Key</div>
          <p className="text-muted text-sm mb-1">Use this key to access the SMM panel API.</p>
          <div className="flex gap-1 mb-1">
            <input className="form-control" value={apiKey} readOnly style={{ fontFamily:'monospace', fontSize:'0.75rem' }} />
            <button className="btn btn-outline" onClick={copyKey}>{copied ? '' : '⎘'}</button>
          </div>
          <button className="btn btn-danger btn-sm" onClick={regenKey}>Regenerate Key</button>
          <hr className="divider" />
          <div className="card-title">API Endpoint</div>
          <code style={{ fontSize:'0.75rem', color:'var(--accent2)', background:'var(--bg3)', padding:'0.5rem', borderRadius:5, display:'block' }}>
            POST /api/v1
          </code>
          <p className="text-muted text-sm mt-1">Actions: services, add, status, balance, refill, cancel</p>
        </div>
      </div>
    </div>
  );
}

// ─── ServicesPage ─────────────────────────────────────────────
export function ServicesPage() {
  const [categories, setCategories] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    servicesApi.grouped().then(r => {
      setCategories(r.data.data);
      const exp = {};
      r.data.data.forEach(c => { exp[c._id] = true; });
      setExpanded(exp);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = categories.map(cat => ({
    ...cat,
    services: (cat.services||[]).filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(c => c.services.length > 0);

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Services</h1></div>
      <div className="form-group mb-2">
        <input className="form-control" placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.map(cat => (
        <div className="card mb-2" key={cat._id}>
          <div
            className="flex justify-between items-center"
            style={{ cursor:'pointer', marginBottom: expanded[cat._id] ? '0.75rem' : 0 }}
            onClick={() => setExpanded(p => ({ ...p, [cat._id]: !p[cat._id] }))}
          >
            <strong>{cat.name}</strong>
            <span className="text-muted">{expanded[cat._id] ? '▲' : '▼'} ({cat.services.length})</span>
          </div>
          {expanded[cat._id] && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Name</th><th>Rate/1K</th><th>Min</th><th>Max</th><th>Type</th><th>Avg Time</th></tr></thead>
                <tbody>
                  {cat.services.map(s => (
                    <tr key={s._id}>
                      <td className="text-muted text-sm">{s._id.slice(-6)}</td>
                      <td>{s.name}</td>
                      <td style={{ color:'var(--accent2)', fontWeight:600 }}>${s.price}</td>
                      <td>{s.min}</td>
                      <td>{s.max?.toLocaleString()}</td>
                      <td><span className="badge badge-active">{s.type}</span></td>
                      <td className="text-muted text-sm">{s.avgTime ? `${s.avgTime} min` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── ApiPage ──────────────────────────────────────────────────
export function ApiPage() {
  const { user } = useAuth();
  const ACTIONS = [
    { action: 'services',     desc: 'Get all available services', extra: '' },
    { action: 'add',          desc: 'Place a new order',          extra: 'service, link, quantity' },
    { action: 'status',       desc: 'Get single order status',     extra: 'order (order ID)' },
    { action: 'status_multi', desc: 'Get multiple order statuses', extra: 'orders (comma-separated IDs)' },
    { action: 'balance',      desc: 'Get your account balance',   extra: '' },
    { action: 'refill',       desc: 'Request refill',             extra: 'order (order ID)' },
    { action: 'cancel',       desc: 'Cancel orders',              extra: 'orders (comma-separated IDs)' },
  ];

  return (
    <div className="page">
      <div className="topbar"><h1>API Documentation</h1></div>
      <div className="grid-2" style={{ alignItems:'start' }}>
        <div className="card">
          <div className="card-title">Your API Key</div>
          <code style={{ display:'block', background:'var(--bg3)', padding:'0.75rem', borderRadius:6, fontFamily:'monospace', fontSize:'0.8rem', color:'var(--accent2)', marginBottom:'1rem', wordBreak:'break-all' }}>
            {user?.apiKey}
          </code>
          <div className="card-title">Endpoint</div>
          <code style={{ display:'block', background:'var(--bg3)', padding:'0.75rem', borderRadius:6, fontSize:'0.8rem', color:'var(--text2)' }}>
            POST /api/v1
          </code>
        </div>
        <div className="card">
          <div className="card-title">Actions</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Action</th><th>Description</th><th>Extra Params</th></tr></thead>
              <tbody>
                {ACTIONS.map(a => (
                  <tr key={a.action}>
                    <td><code style={{ color:'var(--accent2)' }}>{a.action}</code></td>
                    <td className="text-sm">{a.desc}</td>
                    <td className="text-muted text-sm">{a.extra || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-title mt-2">Example (add order)</div>
          <pre style={{ background:'var(--bg3)', padding:'0.75rem', borderRadius:6, fontSize:'0.75rem', overflowX:'auto', color:'var(--text2)' }}>{`curl -X POST /api/v1 \\
  -d "key=YOUR_API_KEY" \\
  -d "action=add" \\
  -d "service=SERVICE_ID" \\
  -d "link=https://..." \\
  -d "quantity=1000"`}</pre>
        </div>
      </div>
    </div>
  );
}

export default AddFundsPage;
