import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { seoManagerAPI } from '../../services/api';

export default function SeoManagerDashboard() {
  const [pages, setPages]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ slug:'', title:'', description:'', keywords:'' });
  const [preview, setPreview] = useState('');
  const [prevLoading, setPrevLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await seoManagerAPI.getPages({ page: pageNum, limit: 20, search });
      setPages(r.data.pages || []);
      setTotal(r.data.total || 0);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [pageNum, search]); // eslint-disable-line

  const handleSave = async () => {
    if (!form.slug || !form.title) return alert('Slug and title are required');
    try {
      await seoManagerAPI.createPage(form);
      setShowAdd(false);
      setForm({ slug:'', title:'', description:'', keywords:'' });
      load();
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SEO page?')) return;
    await seoManagerAPI.deletePage(id);
    load();
  };

  const handlePreview = async () => {
    setPrevLoading(true);
    try {
      const r = await seoManagerAPI.preview(form);
      setPreview(r.data.html || '');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setPrevLoading(false);
  };

  const handleGenerate = async (slug) => {
    try {
      const r = await seoManagerAPI.generateTags(slug);
      const html = r.data.html || '';
      const el = document.createElement('textarea');
      el.value = html;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      alert('HTML meta tags copied to clipboard!');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleAudit = async () => {
    const url = window.prompt('Enter URL to audit:', 'https://example.com');
    if (!url) return;
    try {
      const r = await seoManagerAPI.auditPage({ url });
      alert(`SEO Score: ${r.data.score}/100\n\nIssues:\n${(r.data.issues||[]).join('\n')}\n\nSuggestions:\n${(r.data.suggestions||[]).join('\n')}`);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>SEO Manager</h1>
        <div className="topbar-actions">
          <button className="btn" onClick={handleAudit}>Audit URL</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(v => !v)}>+ New Page</button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-2">
          <h3 className="mb-1">New SEO Page</h3>
          <div className="grid-2 gap-2 mb-1">
            <div>
              <label className="label">Slug * <span className="text-muted text-sm">(unique identifier, e.g. /home)</span></label>
              <input className="input" placeholder="/home" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Description <span className="text-muted text-sm">(120-160 chars recommended)</span></label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Keywords</label>
              <input className="input" placeholder="seo, marketing, tools" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
            </div>
            <div>
              <label className="label">Robots</label>
              <select className="input" value={form.robots || 'index, follow'} onChange={e => setForm(f => ({ ...f, robots: e.target.value }))}>
                <option>index, follow</option>
                <option>index, nofollow</option>
                <option>noindex, follow</option>
                <option>noindex, nofollow</option>
              </select>
            </div>
          </div>

          {preview && (
            <div style={{ background: '#1e1e1e', borderRadius: 8, padding: 14, marginBottom: 12, overflow: 'auto' }}>
              <pre style={{ color: '#d4d4d4', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>{preview}</pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave}>Save Page</button>
            <button className="btn" onClick={handlePreview} disabled={prevLoading}>
              {prevLoading ? 'Generating…' : 'Preview Tags'}
            </button>
            <button className="btn" onClick={() => { setShowAdd(false); setPreview(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Search by slug…" value={search}
          onChange={e => { setSearch(e.target.value); setPageNum(1); }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>{total} pages</span>
      </div>

      {loading
        ? <div className="loader"><div className="spinner" /></div>
        : pages.length === 0
          ? <div className="empty-state"><div className="empty-icon"></div><p>No SEO pages yet.</p><button className="btn btn-primary" onClick={() => setShowAdd(true)}>Create First Page</button></div>
          : <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Slug</th><th>Title</th><th>Description</th><th>OG</th><th>JSON-LD</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pages.map(p => (
                    <tr key={p._id}>
                      <td><code style={{ fontSize: 12 }}>{p.slug}</code></td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</td>
                      <td><span className={`badge badge-${p.og?.title ? 'success' : 'secondary'}`}>{p.og?.title ? '' : '-'}</span></td>
                      <td><span className={`badge badge-${p.jsonLd?.length ? 'success' : 'secondary'}`}>{p.jsonLd?.length ? '' : '-'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Link to={`/seo-manager/${p._id}/edit`}><button className="btn btn-sm">Edit</button></Link>
                          <button className="btn btn-sm" onClick={() => handleGenerate(p.slug)} title="Copy HTML tags"></button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      }

      {total > 20 && (
        <div className="pagination">
          <button className="btn btn-sm" onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1}>← Prev</button>
          <span style={{ fontSize: 12, padding: '0 8px' }}>Page {pageNum} of {Math.ceil(total / 20)}</span>
          <button className="btn btn-sm" onClick={() => setPageNum(p => p + 1)} disabled={pages.length < 20}>Next →</button>
        </div>
      )}
    </div>
  );
}
