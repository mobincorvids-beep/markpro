import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sitespyAPI } from '../../services/api';

export default function SiteSpyDashboard() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [domain, setDomain]     = useState('');

  const load = () => sitespyAPI.getWebsites().then(r => setWebsites(r.data.websites||[])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!domain.trim()) return;
    try { await sitespyAPI.createWebsite({ domainName: domain }); setDomain(''); setShowAdd(false); load(); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Stop tracking this site?')) return; await sitespyAPI.deleteWebsite(id); load(); };

  const embedCode = (code) => `<script src="${window.location.origin}/api/sitespy/tracker/${code}/tracker.js" async></script>`;

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>SiteSpy</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Track New Site</button></div></div>

      {showAdd && (
        <div className="card mb-2" style={{ display:'flex', gap:8 }}>
          <input className="input" style={{ flex:1 }} placeholder="example.com" value={domain} onChange={e=>setDomain(e.target.value)} />
          <button className="btn btn-primary" onClick={handleAdd}>Add</button>
          <button className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      )}

      <div className="tile-grid mb-2">
        {[['URL Shortener','/sitespy/urls'],['WHOIS / DNS','/sitespy/tools'],['Security Scan','/sitespy/tools']].map(([l,to]) => (
          <Link key={l} to={to} className="tile-link"><div className="glass-card tile-card"><div className="tile-card-title">{l}</div></div></Link>
        ))}
      </div>

      {websites.length === 0 ? <div className="empty-state"><div className="empty-icon"></div><p>No sites tracked yet.</p></div> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
          {websites.map(w => (
            <div key={w._id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontWeight:500 }}>{w.domainName}</div>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w._id)}></button>
              </div>
              <div style={{ display:'flex', gap:16, marginBottom:10 }}>
                <div><div style={{ fontSize:18, fontWeight:600 }}>{w.stats?.totalVisitors||0}</div><div className="text-muted text-sm">Total visits</div></div>
                <div><div style={{ fontSize:18, fontWeight:600 }}>{w.stats?.todayVisitors||0}</div><div className="text-muted text-sm">Today</div></div>
              </div>
              <Link to={`/sitespy/analytics/${w._id}`}><button className="btn btn-sm btn-primary w-full mb-1">View Analytics</button></Link>
              <textarea readOnly className="input" style={{ fontSize:10, fontFamily:'monospace' }} rows={2} value={embedCode(w.trackingCode)} onClick={e=>e.target.select()} />
            </div>
          ))}
        </div>
      }
    </div>
  );
}

export function SiteSpyUrls() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [origUrl, setOrigUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');

  const load = () => sitespyAPI.getUrls().then(r => setUrls(r.data.urls||[])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!origUrl.trim()) return;
    try { await sitespyAPI.createShortUrl({ originalUrl: origUrl, customSlug }); setOrigUrl(''); setCustomSlug(''); load(); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };
  const handleDelete = async (id) => { await sitespyAPI.deleteUrl(id); load(); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>URL Shortener</h1></div>
      <div className="card mb-2">
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" style={{ flex:2 }} placeholder="https://example.com/very/long/url" value={origUrl} onChange={e=>setOrigUrl(e.target.value)} />
          <input className="input" style={{ flex:1 }} placeholder="custom-slug (optional)" value={customSlug} onChange={e=>setCustomSlug(e.target.value)} />
          <button className="btn btn-primary" onClick={handleCreate}>Shorten</button>
        </div>
      </div>
      {urls.length === 0 ? <div className="empty-state"><p>No shortened URLs yet.</p></div> :
        <table className="table"><thead><tr><th>Short URL</th><th>Original</th><th>Clicks</th><th></th></tr></thead>
          <tbody>{urls.map(u => (
            <tr key={u._id}>
              <td><a href={u.shortUrl} target="_blank" rel="noreferrer">{u.shortUrl}</a></td>
              <td style={{ maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.originalUrl}</td>
              <td>{u.clicks}</td>
              <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(u._id)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export function SiteSpyTools() {
  const [domain, setDomain] = useState('');
  const [whoisResult, setWhoisResult] = useState(null);
  const [dnsType, setDnsType] = useState('A');
  const [dnsResult, setDnsResult] = useState(null);
  const [scanUrl, setScanUrl] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runWhois = async () => { setLoading(true); try { const r = await sitespyAPI.whoisLookup({ domain }); setWhoisResult(r.data.whois); } catch (e) { alert(e?.response?.data?.message||'Error'); } setLoading(false); };
  const runDns   = async () => { setLoading(true); try { const r = await sitespyAPI.dnsLookup({ domain, type:dnsType }); setDnsResult(r.data.records); } catch (e) { alert(e?.response?.data?.message||'Error'); } setLoading(false); };
  const runScan  = async () => { setLoading(true); try { const r = await sitespyAPI.securityScan({ url:scanUrl }); setScanResult(r.data.results); } catch (e) { alert(e?.response?.data?.message||'Error'); } setLoading(false); };

  return (
    <div className="page">
      <div className="topbar"><h1>Domain & Security Tools</h1></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-1">WHOIS Lookup</div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input className="input" placeholder="example.com" value={domain} onChange={e=>setDomain(e.target.value)} style={{flex:1}}/>
            <button className="btn btn-primary" onClick={runWhois} disabled={loading}>Lookup</button>
          </div>
          {whoisResult && <pre style={{ fontSize:11, background:'var(--bg)', padding:10, borderRadius:6, maxHeight:200, overflow:'auto' }}>{whoisResult.rawData || JSON.stringify(whoisResult, null, 2)}</pre>}

          <div className="card-title mb-1 mt-2">DNS Lookup</div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <select className="input" style={{ width:100 }} value={dnsType} onChange={e=>setDnsType(e.target.value)}>
              {['A','AAAA','MX','TXT','NS','CNAME'].map(t=><option key={t}>{t}</option>)}
            </select>
            <button className="btn btn-primary" onClick={runDns} disabled={loading}>Lookup</button>
          </div>
          {dnsResult && <pre style={{ fontSize:11, background:'var(--bg)', padding:10, borderRadius:6, maxHeight:150, overflow:'auto' }}>{JSON.stringify(dnsResult, null, 2)}</pre>}
        </div>

        <div className="card">
          <div className="card-title mb-1">Security Scan</div>
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input className="input" style={{ flex:1 }} placeholder="https://example.com" value={scanUrl} onChange={e=>setScanUrl(e.target.value)} />
            <button className="btn btn-primary" onClick={runScan} disabled={loading}>Scan</button>
          </div>
          {scanResult && (
            <div className={`card`} style={{ background: scanResult.safe ? '#ecfdf5' : '#fef2f2' }}>
              <div style={{ fontWeight:600, color: scanResult.safe ? '#059669' : '#dc2626' }}>{scanResult.safe ? 'Safe' : 'Threats Detected'}</div>
              {scanResult.threats?.map((t,i)=><div key={i} style={{ fontSize:12, marginTop:4 }}>{t}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
