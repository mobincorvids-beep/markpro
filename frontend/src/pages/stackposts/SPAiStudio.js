import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { stackpostsAPI } from '../../services/api';

export function SPAiStudio() {
  const { teamId } = useParams();
  const [prompt, setPrompt]     = useState('');
  const [variations, setVariations] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const r = await stackpostsAPI.aiGenerate({ prompt, network: 'twitter', variations: 3, tone: 'engaging' });
      setVariations(r.data.variations || []);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setGenerating(false);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>AI Studio</h1></div>
      <div className="card" style={{ maxWidth: 700 }}>
        <label className="label">What do you want to post about?</label>
        <textarea className="input" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} style={{ marginBottom: 10 }} />
        <button className="btn btn-primary" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate Captions'}
        </button>
        {variations.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {variations.map((v, i) => (
              <div key={i} className="card" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{v}</div>
                <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(v)}>Copy</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SPFeeds() {
  const { teamId } = useParams();
  const [feeds, setFeeds]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ name:'', url:'', postTemplate:'{{title}}\n{{link}}', maxPerFetch:3 });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { stackpostsAPI.getFeeds(teamId).then(r => setFeeds(r.data.feeds || [])).finally(() => setLoading(false)); }, [teamId]);

  const handleSave = async () => {
    if (!form.name || !form.url) return;
    try {
      const r = await stackpostsAPI.createFeed(teamId, form);
      setFeeds(f => [...f, r.data.feed]);
      setShowAdd(false);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete feed?')) return;
    await stackpostsAPI.deleteFeed(teamId, id);
    setFeeds(f => f.filter(x => x._id !== id));
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>RSS Auto-Posting</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Feed</button></div></div>
      {showAdd && (
        <div className="card mb-2">
          <div style={{ marginBottom: 10 }}><label className="label">Feed Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ marginBottom: 10 }}><label className="label">RSS URL</label><input className="input" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://example.com/feed.xml"/></div>
          <div style={{ marginBottom: 10 }}><label className="label">Post Template</label><textarea className="input" rows={2} value={form.postTemplate} onChange={e=>setForm(f=>({...f,postTemplate:e.target.value}))}/></div>
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleSave}>Save</button><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {feeds.length === 0 ? <div className="empty-state"><p>No RSS feeds connected. Posts will auto-publish every 10 minutes once added.</p></div> :
        <table className="table">
          <thead><tr><th>Name</th><th>URL</th><th>Status</th><th>Last Fetch</th><th></th></tr></thead>
          <tbody>{feeds.map(f => (
            <tr key={f._id}>
              <td>{f.name}</td><td style={{ fontSize:11, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis' }}>{f.url}</td>
              <td><span className={`badge badge-${f.active?'success':'secondary'}`}>{f.active?'Active':'Paused'}</span></td>
              <td style={{ fontSize:11 }}>{f.lastFetchAt ? new Date(f.lastFetchAt).toLocaleString() : 'Never'}</td>
              <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(f._id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export function SPAffiliate() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paypal');
  const [account, setAccount] = useState('');

  useEffect(() => { stackpostsAPI.getAffiliateStats().then(r => setData(r.data)).finally(() => setLoading(false)); }, []);

  const requestWithdrawal = async () => {
    if (!amount || !account) return;
    try {
      await stackpostsAPI.requestWithdrawal({ amount: +amount, method, account });
      alert('Withdrawal requested!');
      setAmount(''); setAccount('');
      stackpostsAPI.getAffiliateStats().then(r => setData(r.data));
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Affiliate Program</h1></div>
      <div className="grid-3 mb-2">
        <div className="card stat-card"><div className="label">Total Earnings</div><div className="value" style={{ color:'#10b981' }}>${(data?.earnings||0).toFixed(2)}</div></div>
        <div className="card stat-card"><div className="label">Referrals</div><div className="value">{data?.referrals||0}</div></div>
        <div className="card stat-card"><div className="label">Affiliate Code</div><div className="value" style={{ fontSize:18 }}>{data?.code||'-'}</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-1">Request Withdrawal</div>
          <div style={{ marginBottom: 10 }}><label className="label">Amount</label><input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
          <div style={{ marginBottom: 10 }}><label className="label">Method</label>
            <select className="input" value={method} onChange={e=>setMethod(e.target.value)}>
              <option value="paypal">PayPal</option><option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div style={{ marginBottom: 10 }}><label className="label">Account Details</label><input className="input" value={account} onChange={e=>setAccount(e.target.value)} placeholder="email or account number"/></div>
          <button className="btn btn-primary" onClick={requestWithdrawal}>Request Withdrawal</button>
        </div>
        <div className="card">
          <div className="card-title mb-1">Withdrawal History</div>
          {(!data?.withdrawals || data.withdrawals.length===0) ? <p className="text-muted text-sm">No withdrawal requests yet.</p> :
            <table className="table">
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>{data.withdrawals.map(w => (
                <tr key={w._id}><td>${w.amount}</td><td>{w.method}</td><td><span className={`badge badge-${w.status==='approved'?'success':w.status==='rejected'?'danger':'warning'}`}>{w.status}</span></td></tr>
              ))}</tbody>
            </table>
          }
        </div>
      </div>
    </div>
  );
}

export default SPAiStudio;
