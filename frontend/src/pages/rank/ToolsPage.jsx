import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toolsAPI } from '../../services/api';
import SeoResultView from '../seo/SeoResultView';
import { TrendingUp, Search, Zap, ArrowLeft, Play, CheckCircle, AlertTriangle, XCircle, Info, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = { SEO: 'var(--primary)', Performance: 'var(--success)', Content: 'var(--secondary)', Security: 'var(--error)', Network: 'var(--info)', Social: 'var(--warning)' };

function NavBar() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 48px', borderBottom: '1px solid var(--border)', background: 'rgba(9,9,13,.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <div style={{ width: 30, height: 30, background: 'var(--secondary)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={14} color="#fff" /></div>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>PHPRank</span>
      </Link>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link to="/pricing" className="btn btn-ghost btn-sm">Pricing</Link>
        <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
        <Link to="/register" className="btn btn-primary btn-sm">Sign up free</Link>
      </div>
    </nav>
  );
}

/* ═══════════════ TOOLS LIST ═════════════════════ */
export function ToolsPage() {
  const [search, setSearch] = useState('');
  const { data } = useQuery({ queryKey: ['tools'], queryFn: toolsAPI.list });
  const tools = data?.data?.data || [];
  const filtered = tools.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
  const categories = [...new Set(tools.map(t => t.category))];

  return (
    <div style={{ minHeight: '100vh' }}>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, marginBottom: 12 }}>Free SEO Tools</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 28 }}>14 professional tools. No account required.</p>
          <div style={{ position: 'relative', maxWidth: 380, margin: '0 auto' }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search tools…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
        </div>

        {categories.map(cat => {
          const catTools = filtered.filter(t => t.category === cat);
          if (!catTools.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat] || 'var(--primary)' }} />
                <h2 style={{ fontWeight: 600, fontSize: 15 }}>{cat}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                {catTools.map(tool => (
                  <Link key={tool.slug} to={`/tools/${tool.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="card card-hover" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${CATEGORY_COLORS[cat] || 'var(--primary)'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={16} color={CATEGORY_COLORS[cat] || 'var(--primary)'} />
                      </div>
                      <div>
                        <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--text)' }}>{tool.name}</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>{tool.description}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════ SEO AUDIT RESULTS ═════════════ */
function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
  const r = 40, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${circ}`} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <text x={50} y={50} textAnchor="middle" dy=".35em" fill={color} fontSize={20} fontWeight={700}>{score}</text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>SEO Score</span>
    </div>
  );
}

const SEVERITY_ICONS = { passed: <CheckCircle size={15} color="var(--success)" />, warning: <AlertTriangle size={15} color="var(--warning)" />, critical: <XCircle size={15} color="var(--error)" />, info: <Info size={15} color="var(--info)" /> };

function SeoAuditResults({ results }) {
  const [filter, setFilter] = useState('all');
  const issues = results.issues || [];
  const shown = filter === 'all' ? issues : issues.filter(i => i.severity === filter);
  const tabs = [['all', `All (${issues.length})`], ['critical', `Critical (${issues.filter(i => i.severity === 'critical').length})`], ['warning', `Warnings (${issues.filter(i => i.severity === 'warning').length})`], ['passed', `Passed (${issues.filter(i => i.severity === 'passed').length})`]];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }} className="card">
        <ScoreRing score={results.score || 0} />
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['Passed', results.summary?.passed, 'var(--success)'], ['Warnings', results.summary?.warnings, 'var(--warning)'], ['Critical', results.summary?.failed, 'var(--error)'], ['Load Time', `${((results.loadTime || 0) / 1000).toFixed(2)}s`, 'var(--info)']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
          {results.meta && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              <strong>Title:</strong> {results.meta.title?.slice(0, 60) || 'Not found'} · <strong>Words:</strong> {results.content?.wordCount?.toLocaleString()}
            </div>
          )}
        </div>
      </div>
      {/* Issues */}
      <div className="card">
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`btn btn-sm ${filter === id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>{label}</button>
          ))}
        </div>
        {shown.map((issue, i) => (
          <div key={i} className="issue-item">
            {SEVERITY_ICONS[issue.severity]}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{issue.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: issue.recommendation ? 4 : 0 }}>{issue.description}</div>
              {issue.recommendation && <div style={{ fontSize: 12, color: 'var(--primary)' }}>→ {issue.recommendation}</div>}
            </div>
            <span className={`badge ${issue.category === 'Meta' ? 'badge-primary' : issue.category === 'Security' ? 'badge-error' : 'badge-gray'}`} style={{ fontSize: 10 }}>{issue.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericResults({ results, tool }) {
  return (
    <div className="card">
      <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Results</h3>
      <SeoResultView result={results} />
    </div>
  );
}

function MetaTagsResults({ results }) {
  const { meta } = results;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { title: 'Title', value: meta.title, len: meta.title?.length, ideal: '50-60 chars' },
        { title: 'Description', value: meta.description, len: meta.description?.length, ideal: '120-160 chars' },
        { title: 'Canonical', value: meta.canonical },
        { title: 'Robots', value: meta.robots || 'Not set' },
        { title: 'Viewport', value: meta.viewport || 'Not set' },
        { title: 'Charset', value: meta.charset || 'Not detected' },
      ].map(({ title, value, len, ideal }) => (
        <div key={title} className="card card-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
            {len && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{len} chars · {ideal}</span>}
          </div>
          <p style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--error)', wordBreak: 'break-all' }}>{value || 'Not found'}</p>
        </div>
      ))}
      {meta.og && Object.keys(meta.og).length > 0 && (
        <div className="card card-sm">
          <h4 style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Open Graph Tags</h4>
          {Object.entries(meta.og).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>og:{k}</span>
              <span style={{ wordBreak: 'break-all' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrokenLinksResults({ results }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[['Total Links', results.total, 'var(--text)'], ['Working', results.working, 'var(--success)'], ['Broken', results.broken, 'var(--error)']].map(([l, v, c]) => (
          <div key={l} className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>URL</th><th>Status</th><th>Type</th></tr></thead>
          <tbody>
            {(results.links || []).slice(0, 30).map((l, i) => (
              <tr key={i}>
                <td style={{ maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" style={{ color: l.ok ? 'var(--text)' : 'var(--error)' }}>{l.href}</a>
                </td>
                <td><span className={`badge ${l.ok ? 'badge-success' : 'badge-error'}`}>{l.status || 'Error'}</span></td>
                <td><span className="badge badge-gray">{l.internal ? 'Internal' : 'External'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultsRenderer({ tool, results }) {
  if (!results) return null;
  if (tool === 'seo_audit') return <SeoAuditResults results={results} />;
  if (tool === 'meta_tags') return <MetaTagsResults results={results} />;
  if (tool === 'broken_links') return <BrokenLinksResults results={results} />;
  return <GenericResults results={results} tool={tool} />;
}

/* ═══════════════ TOOL RUNNER ═══════════════════ */
export function ToolRunnerPage() {
  const { tool } = useParams();
  const navigate = useNavigate();
  const { data: toolsData } = useQuery({ queryKey: ['tools'], queryFn: toolsAPI.list });
  const tools = toolsData?.data?.data || [];
  const toolMeta = tools.find(t => t.slug === tool);

  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleRun = async e => {
    e.preventDefault();
    if (!form.url && !form.domain && !form.ip) { toast.error('Please fill in the required field'); return; }
    setLoading(true); setResults(null);
    try {
      const { data } = await toolsAPI.run(tool, form);
      setResults(data.data.results);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed. Please check the URL and try again.');
    } finally { setLoading(false); }
  };

  if (!toolMeta && tools.length > 0) {
    return <div style={{ padding: 48, textAlign: 'center' }}><p>Tool not found.</p><Link to="/tools" className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>← Back to Tools</Link></div>;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <NavBar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate('/tools')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
            <ArrowLeft size={13} /> All Tools
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{toolMeta?.name || tool}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{toolMeta?.description}</p>
        </div>

        {/* Input form */}
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(toolMeta?.fields || [{ key: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com', required: true }]).map(field => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label} {field.required && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                <input
                  type={field.type === 'url' ? 'text' : field.type}
                  className="form-input"
                  placeholder={field.placeholder}
                  value={form[field.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  required={field.required}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
              {loading ? <><div className="spinner" /> Analyzing…</> : <><Play size={14} /> Run Analysis</>}
            </button>
          </form>
        </div>

        {/* Results */}
        {results && (
          <div className="fade-in">
            <ResultsRenderer tool={tool} results={results} />
          </div>
        )}

        {/* Sign up CTA */}
        {results && (
          <div className="card" style={{ marginTop: 20, textAlign: 'center', background: 'rgba(99,102,241,.08)', borderColor: 'rgba(99,102,241,.3)' }}>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              <strong>Save this report & track progress</strong> - create a free account to store reports and monitor your SEO over time.
            </p>
            <Link to="/register" className="btn btn-primary btn-sm">Create Free Account</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolsPage;
