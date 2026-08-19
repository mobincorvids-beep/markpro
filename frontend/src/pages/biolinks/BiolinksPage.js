import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import { biolinksAPI } from '../../services/api';

const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

export default function BiolinksPage() {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await biolinksAPI.getPages();
      const body = res?.data?.data ?? res?.data ?? [];
      setPages(Array.isArray(body) ? body : (body.links || body.data || []));
    } catch (e) { setError(errText(e, 'Could not load your biolink pages.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await biolinksAPI.createPage({ name: name.trim() });
      setName(''); setShowForm(false);
      load();
    } catch (e) { alert(errText(e, 'Could not create this page.')); }
    finally { setSaving(false); }
  };

  const toggle = async (p) => {
    try { await biolinksAPI.toggleLink(p._id); load(); }
    catch (e) { alert(errText(e, 'Could not update this page.')); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.settings?.name || 'this page'}"? This cannot be undone.`)) return;
    try { await biolinksAPI.deletePage(p._id); load(); }
    catch (e) { alert(errText(e, 'Could not delete this page.')); }
  };

  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">Biolinks</div></div>
        <button className="btn btn-bio btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> New biolink page
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <label className="field">
              <span className="field-label">Page name</span>
              <input className="input" placeholder="e.g. My Links" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-bio btn-sm" disabled={saving} onClick={create}>{saving ? 'Creating…' : 'Create page'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : error ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">Couldn't load this</div>
            <div className="empty-sub">{error}</div>
            <button className="btn btn-secondary btn-sm mt-4" onClick={load}>Try again</button>
          </div>
        </div></div>
      ) : !pages.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">No biolink pages yet</div>
            <div className="empty-sub">Create your first link-in-bio page to get started.</div>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          {pages.map(p => (
            <div className="card" key={p._id}>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.settings?.name || p.url}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', marginBottom: 10 }}>/{p.url}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span className={`badge ${p.is_enabled === false ? 'badge-default' : 'badge-success'}`}>
                    {p.is_enabled === false ? 'Unpublished' : 'Live'}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => toggle(p)}>
                      {p.is_enabled === false ? 'Publish' : 'Unpublish'}
                    </button>
                    <Link to={`/biolinks/pages/${p._id}/edit`} className="btn btn-secondary btn-xs btn-icon" title="Edit page" aria-label="Edit page"><Edit3 size={13} /></Link>
                    <a className="btn btn-secondary btn-xs btn-icon" href={`/r/${p.url}`} target="_blank" rel="noreferrer" title="Open live page" aria-label="Open live page"><ExternalLink size={13} /></a>
                    <button className="btn btn-danger btn-xs btn-icon" onClick={() => remove(p)} title="Delete page" aria-label="Delete page"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
