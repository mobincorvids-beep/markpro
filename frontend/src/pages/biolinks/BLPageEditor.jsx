import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { biolinksAPI } from '../../services/api';

const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

// The 7 most-used block types out of the ~35 the backend supports. Each has
// a minimal settings shape the public renderer (PublicBiolinkPage) reads.
const BLOCK_TYPES = [
  { type: 'header',   label: 'Header / Title' },
  { type: 'link',     label: 'Link button' },
  { type: 'text',     label: 'Text block' },
  { type: 'image',    label: 'Image' },
  { type: 'divider',  label: 'Divider' },
  { type: 'socials',  label: 'Social icons' },
  { type: 'email_collector', label: 'Email signup' },
];

function defaultSettings(type) {
  switch (type) {
    case 'header':  return { title: 'New header', subtitle: '' };
    case 'link':    return { label: 'Click here', url: 'https://' };
    case 'text':    return { content: 'Some text' };
    case 'image':   return { url: '' };
    case 'divider':  return {};
    case 'socials': return { instagram: '', twitter: '', facebook: '', tiktok: '' };
    case 'email_collector': return { placeholder: 'Enter your email' };
    default: return {};
  }
}

function BlockFields({ block, onChange }) {
  const set = (k, v) => onChange({ ...block, settings: { ...block.settings, [k]: v } });
  const s = block.settings || {};
  switch (block.type) {
    case 'header':
      return (<>
        <input className="input" placeholder="Title" value={s.title || ''} onChange={e => set('title', e.target.value)} style={{ marginBottom: 8 }} />
        <input className="input" placeholder="Subtitle" value={s.subtitle || ''} onChange={e => set('subtitle', e.target.value)} />
      </>);
    case 'link':
      return (<>
        <input className="input" placeholder="Button text" value={s.label || ''} onChange={e => set('label', e.target.value)} style={{ marginBottom: 8 }} />
        <input className="input" placeholder="https://..." value={s.url || ''} onChange={e => set('url', e.target.value)} />
      </>);
    case 'text':
      return <textarea className="input" rows={3} placeholder="Text content" value={s.content || ''} onChange={e => set('content', e.target.value)} />;
    case 'image':
      return <input className="input" placeholder="Image URL" value={s.url || ''} onChange={e => set('url', e.target.value)} />;
    case 'socials':
      return (<>
        {['instagram', 'twitter', 'facebook', 'tiktok'].map(k => (
          <input key={k} className="input" placeholder={`${k} URL`} value={s[k] || ''} onChange={e => set(k, e.target.value)} style={{ marginBottom: 8 }} />
        ))}
      </>);
    case 'email_collector':
      return <input className="input" placeholder="Placeholder text" value={s.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />;
    case 'divider':
      return <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No settings — just a visual divider.</div>;
    default:
      return null;
  }
}

export default function BLPageEditor() {
  const { id } = useParams();
  const [page, setPage]       = useState(null);
  const [blocks, setBlocks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [dirty, setDirty]     = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [pageRes, blocksRes] = await Promise.all([
        biolinksAPI.getPage(id),
        biolinksAPI.getBlocks(id),
      ]);
      setPage(pageRes?.data?.data ?? pageRes?.data);
      const bl = blocksRes?.data?.data ?? blocksRes?.data ?? [];
      setBlocks(Array.isArray(bl) ? bl : []);
    } catch (e) { setError(errText(e, 'Could not load this page.')); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addBlock = async (type) => {
    try {
      const res = await biolinksAPI.createBlock({ link_id: id, type, settings: defaultSettings(type) });
      const created = res?.data?.data ?? res?.data;
      setBlocks(b => [...b, created]);
    } catch (e) { alert(errText(e, 'Could not add this block.')); }
  };

  const updateLocal = (blockId, next) => {
    setBlocks(bs => bs.map(b => b._id === blockId ? next : b));
    setDirty(d => ({ ...d, [blockId]: true }));
  };

  const saveBlock = async (block) => {
    try {
      await biolinksAPI.updateBlock(block._id, { settings: block.settings });
      setDirty(d => { const n = { ...d }; delete n[block._id]; return n; });
    } catch (e) { alert(errText(e, 'Could not save this block.')); }
  };

  const removeBlock = async (block) => {
    if (!window.confirm('Remove this block?')) return;
    try { await biolinksAPI.deleteBlock(block._id); setBlocks(bs => bs.filter(b => b._id !== block._id)); }
    catch (e) { alert(errText(e, 'Could not remove this block.')); }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
    try {
      await biolinksAPI.reorderBlocks({ order: next.map((b, i) => ({ id: b._id, order: i })) });
    } catch (e) { alert(errText(e, 'Could not save the new order.')); load(); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (error) return (
    <div className="card"><div className="card-body">
      <div className="empty-state">
        <div className="empty-title">Couldn't load this</div>
        <div className="empty-sub">{error}</div>
        <button className="btn btn-secondary btn-sm mt-4" onClick={load}>Try again</button>
      </div>
    </div></div>
  );

  return (
    <div>
      <div className="page-header-row">
        <div>
          <Link to="/biolinks/pages" style={{ fontSize: 13, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <ArrowLeft size={14} /> Back to pages
          </Link>
          <div className="page-title">{page?.settings?.name || 'Edit page'}</div>
        </div>
        {page?.url && (
          <a className="btn btn-secondary btn-sm" href={`/r/${page.url}`} target="_blank" rel="noreferrer">
            View live <ExternalLink size={13} />
          </a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {BLOCK_TYPES.map(bt => (
          <button key={bt.type} className="btn btn-secondary btn-xs" onClick={() => addBlock(bt.type)}>
            <Plus size={12} /> {bt.label}
          </button>
        ))}
      </div>

      {!blocks.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">No content blocks yet</div>
            <div className="empty-sub">Add a block above to start building your page.</div>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          {blocks.map((b, i) => (
            <div className="card" key={b._id}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="badge badge-default" style={{ textTransform: 'capitalize' }}>{b.type.replace('_', ' ')}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp size={12} /></button>
                    <button className="btn btn-secondary btn-xs" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ChevronDown size={12} /></button>
                    <button className="btn btn-secondary btn-xs" onClick={() => removeBlock(b)}><Trash2 size={12} /></button>
                  </div>
                </div>
                <BlockFields block={b} onChange={(next) => updateLocal(b._id, next)} />
                {dirty[b._id] && (
                  <button className="btn btn-bio btn-xs mt-2" onClick={() => saveBlock(b)}>Save changes</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
