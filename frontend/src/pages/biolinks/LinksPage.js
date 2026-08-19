import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Trash2, ExternalLink, Plus } from 'lucide-react';
import { biolinksAPI } from '../../services/api';

const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;
const shortUrlFor = (url) => `${window.location.origin.replace(/^https?:\/\/[^/]*\.app/, 'https://your-domain')}/r/${url}`;

export default function LinksPage() {
  const [links, setLinks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dest, setDest]       = useState('');
  const [slug, setSlug]       = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await biolinksAPI.getLinks({ type: 'link' });
      const body = res?.data?.data ?? res?.data ?? [];
      setLinks(Array.isArray(body) ? body : (body.links || body.data || []));
    } catch (e) { setError(errText(e, 'Could not load your links.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!dest.trim()) return;
    setSaving(true);
    try {
      await biolinksAPI.createLink({ location_url: dest.trim(), url: slug.trim() || undefined });
      setDest(''); setSlug(''); setShowForm(false);
      load();
    } catch (e) { alert(errText(e, 'Could not create this link.')); }
    finally { setSaving(false); }
  };

  const toggle = async (l) => {
    try { await biolinksAPI.toggleLink(l._id); load(); }
    catch (e) { alert(errText(e, 'Could not update this link.')); }
  };
  const remove = async (l) => {
    if (!window.confirm('Delete this short link?')) return;
    try { await biolinksAPI.deleteLink(l._id); load(); }
    catch (e) { alert(errText(e, 'Could not delete this link.')); }
  };
  const copy = (l) => {
    navigator.clipboard.writeText(shortUrlFor(l.url));
  };

  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">Links</div></div>
        <button className="btn btn-bio btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> New link
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <label className="field">
              <span className="field-label">Destination URL</span>
              <input className="input" placeholder="https://example.com/your-page" value={dest} onChange={e => setDest(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Custom slug (optional)</span>
              <input className="input" placeholder="leave blank for a random one" value={slug} onChange={e => setSlug(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-bio btn-sm" disabled={saving} onClick={create}>{saving ? 'Creating…' : 'Create link'}</button>
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
      ) : !links.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">No short links yet</div>
            <div className="empty-sub">Create your first one to get started.</div>
          </div>
        </div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Short link</th><th>Destination</th><th>Clicks</th><th>Status</th><th /></tr></thead>
            <tbody>
              {links.map(l => (
                <tr key={l._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>/{l.url}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.location_url}</td>
                  <td>{l.clicks ?? 0}</td>
                  <td>
                    <span className={`badge ${l.is_enabled === false ? 'badge-default' : 'badge-success'}`}>
                      {l.is_enabled === false ? 'Paused' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => toggle(l)}>{l.is_enabled === false ? 'Resume' : 'Pause'}</button>
                      <button className="btn btn-secondary btn-xs btn-icon" onClick={() => copy(l)} title="Copy link" aria-label="Copy link"><Copy size={13} /></button>
                      <a className="btn btn-secondary btn-xs btn-icon" href={l.location_url} target="_blank" rel="noreferrer" title="Open destination" aria-label="Open destination"><ExternalLink size={13} /></a>
                      <button className="btn btn-danger btn-xs btn-icon" onClick={() => remove(l)} title="Delete link" aria-label="Delete link"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
