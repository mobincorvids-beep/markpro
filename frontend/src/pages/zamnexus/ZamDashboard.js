import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { zamAPI } from '../../services/api';
import SeoResultView from '../seo/SeoResultView';

export default function ZamDashboard() {
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([zamAPI.getContacts({ limit:5 }), zamAPI.getLeads({ limit:5 })])
      .then(([c,l]) => { setContacts(c.data.contacts||[]); setLeads(l.data.leads||[]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>ZAM Nexus</h1></div>
      <div className="tile-grid mb-2">
        {[
          ['180+ SEO Tools','/zam/seo','Gemini AI powered'],
          ['CRM Contacts','/zam/contacts','Manage relationships'],
          ['Lead Generation','/zam/leads','Find new prospects'],
          ['Asset Library','/zam/assets','Media & documents'],
        ].map(([l,to,d]) => (
          <Link key={to} to={to} className="tile-link">
            <div className="glass-card tile-card">
              <div className="tile-card-title">{l}</div>
              <div className="tile-card-sub">{d}</div>
            </div>
          </Link>
        ))}
      </div>
      <div className="split-grid">
        <div className="glass-card pad">
          <div className="card-title mb-1">Recent Contacts</div>
          {contacts.length===0?<p className="text-muted text-sm">No contacts yet.</p>:
            contacts.map(c=>(<div key={c._id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}><div style={{ fontWeight:500, fontSize:13 }}>{c.firstName} {c.lastName}</div><div className="text-muted text-sm">{c.company} {c.jobTitle && `· ${c.jobTitle}`}</div></div>))
          }
        </div>
        <div className="glass-card pad">
          <div className="card-title mb-1">Recent Leads</div>
          {leads.length===0?<p className="text-muted text-sm">No leads yet.</p>:
            leads.map(l=>(<div key={l._id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}><div style={{ fontWeight:500, fontSize:13 }}>{l.name}</div><div className="text-muted text-sm">{l.company} {l.city && `· ${l.city}`}</div></div>))
          }
        </div>
      </div>
    </div>
  );
}

export function ZamSeoTools() {
  const [catalog, setCatalog]   = useState({});
  const [category, setCategory] = useState('keyword');
  const [tool, setTool]         = useState(null);
  const [inputs, setInputs]     = useState({});
  const [result, setResult]     = useState(null);
  const [running, setRunning]   = useState(false);

  useEffect(() => { zamAPI.getSeoTools().then(r => setCatalog(r.data.tools||{})); }, []);

  const run = async () => {
    if (!tool) return;
    setRunning(true); setResult(null);
    try { const r = await zamAPI.runSeoTool({ toolSlug: tool.slug, inputs }); setResult(r.data.result); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setRunning(false);
  };

  const categories = Object.keys(catalog);

  return (
    <div className="page">
      <div className="topbar"><h1>180+ SEO Tools (Gemini AI)</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {categories.map(c => <button key={c} className={`btn btn-sm ${category===c?'btn-primary':''}`} onClick={()=>{setCategory(c);setTool(null);setResult(null);}}>{c.replace('_',' ')}</button>)}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-1">Select Tool</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:400, overflow:'auto' }}>
            {(catalog[category]||[]).map(t => (
              <button key={t.slug} className={`btn btn-sm ${tool?.slug===t.slug?'btn-primary':''}`} style={{ textAlign:'left' }} onClick={()=>{setTool(t);setResult(null);setInputs({});}}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          {!tool ? <p className="text-muted text-sm">Select a tool to begin.</p> : (
            <>
              <div className="card-title mb-1">{tool.name}</div>
              <textarea className="input" rows={3} placeholder="Enter your topic, keyword, or text…" style={{ marginBottom:10 }}
                onChange={e => setInputs({ topic:e.target.value, keyword:e.target.value, text:e.target.value, domain:e.target.value, content:e.target.value })} />
              <button className="btn btn-primary w-full" onClick={run} disabled={running}>{running?'Running…':'▶ Run Tool'}</button>
              {result && (
                <div style={{ marginTop:14, fontSize:12, background:'var(--bg)', padding:10, borderRadius:6, maxHeight:300, overflow:'auto' }}>
                  {typeof result === 'string' ? <pre style={{ whiteSpace:'pre-wrap', fontFamily:'inherit' }}>{result}</pre> : <SeoResultView result={result} />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ZamContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const fileRef = useState(null);

  const load = () => zamAPI.getContacts({ search, limit:100 }).then(r => setContacts(r.data.contacts||[])).finally(()=>setLoading(false));
  useEffect(() => { load(); }, [search]); // eslint-disable-line

  const handleEnrich = async (id) => {
    try { await zamAPI.enrichContact(id); alert('Contact enriched with AI!'); load(); } catch (e) { alert(e?.response?.data?.message||'Error'); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await zamAPI.deleteContact(id); load(); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>CRM Contacts</h1></div>
      <input className="input mb-2" placeholder="Search contacts…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:300 }} />
      {contacts.length===0 ? <div className="empty-state"><p>No contacts yet.</p></div> :
        <table className="table"><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>City</th><th></th></tr></thead>
          <tbody>{contacts.map(c=>(
            <tr key={c._id}>
              <td>{c.firstName} {c.lastName}</td><td>{c.company||'-'}</td><td>{c.email||'-'}</td><td>{c.city||'-'}</td>
              <td style={{ display:'flex', gap:4 }}><button className="btn btn-sm" onClick={()=>handleEnrich(c._id)}>Enrich</button><button className="btn btn-sm btn-danger" onClick={()=>handleDelete(c._id)}>Del</button></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export function ZamLeads() {
  const [searches, setSearches] = useState([]);
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ keyword:'', city:'', state:'', country:'' });

  const load = () => Promise.all([zamAPI.getLeadSearches(), zamAPI.getLeads({ limit:50 })])
    .then(([s,l])=>{setSearches(s.data.searches||[]);setLeads(l.data.leads||[]);}).finally(()=>setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSearch = async () => {
    if (!form.keyword) return;
    try { await zamAPI.createLeadSearch(form); alert('Lead search started! Results will appear shortly.'); setTimeout(load, 4000); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Lead Generation</h1></div>
      <div className="card mb-2">
        <div className="grid-2 gap-2 mb-1">
          <input className="input" placeholder="Keyword (e.g. dentist)" value={form.keyword} onChange={e=>setForm(f=>({...f,keyword:e.target.value}))}/>
          <input className="input" placeholder="City" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/>
          <input className="input" placeholder="State" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))}/>
          <input className="input" placeholder="Country" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}/>
        </div>
        <button className="btn btn-primary" onClick={handleSearch}>Search Leads</button>
        <p className="text-muted text-sm mt-1">Sourced from OpenStreetMap's free business directory — coverage varies by area, and email addresses usually aren't available since OSM rarely records them.</p>
      </div>
      <div className="card-title mb-1">Search Jobs</div>
      {searches.length===0 ? <p className="text-muted text-sm mb-2">No searches yet.</p> :
        <table className="table mb-2"><thead><tr><th>Keyword</th><th>Location</th><th>Status</th><th>Results</th></tr></thead>
          <tbody>{searches.map(s=>(<tr key={s._id}><td>{s.keyword}</td><td>{s.city} {s.country}</td><td><span className={`badge badge-${s.status==='completed'?'success':'warning'}`}>{s.status}</span></td><td>{s.resultsCount}</td></tr>))}</tbody>
        </table>
      }
      <div className="card-title mb-1">Leads ({leads.length})</div>
      {leads.length===0 ? <p className="text-muted text-sm">No leads yet.</p> :
        <table className="table"><thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Rating</th></tr></thead>
          <tbody>{leads.map(l=>(<tr key={l._id}><td>{l.name}</td><td>{l.company}</td><td>{l.phone}</td><td>{l.rating?''.repeat(Math.round(l.rating)):'-'}</td></tr>))}</tbody>
        </table>
      }
    </div>
  );
}
