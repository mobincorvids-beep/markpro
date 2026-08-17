import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiGlobe, FiCode } from 'react-icons/fi';
import { LAYOUTS, THEMES } from '../../utils/networks';
import EmbedPreview from '../../components/stream/EmbedPreview';

const EMPTY = {
  name: '', accounts: [], layout: 'wall', theme: 'modern',
  postsPerPage: 20, showFilter: true, showSearch: true,
  showSharing: true, isPublic: false,
};

export default function Streams() {
  const [streams, setStreams]         = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [expandedEmbed, setExpandedEmbed] = useState(null); // stream._id

  useEffect(() => {
    Promise.all([api.get('/streams'), api.get('/accounts')]).then(([sr, ar]) => {
      setStreams(sr.data.streams || []);
      setAllAccounts(ar.data.accounts || []);
    }).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({
      name: s.name, layout: s.layout, theme: s.theme, isPublic: s.isPublic,
      postsPerPage: s.postsPerPage, showFilter: s.showFilter,
      showSearch: s.showSearch, showSharing: s.showSharing,
      accounts: (s.accounts || []).map(a => a._id || a),
    });
    setEditId(s._id);
    setShowModal(true);
  };

  const toggleAccount = (id) => {
    setForm(f => ({
      ...f,
      accounts: f.accounts.includes(id)
        ? f.accounts.filter(a => a !== id)
        : [...f.accounts, id],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const res = await api.put(`/streams/${editId}`, form);
        setStreams(ss => ss.map(s => s._id === editId ? res.data.stream : s));
        toast.success('Stream updated');
      } else {
        const res = await api.post('/streams', form);
        setStreams(ss => [res.data.stream, ...ss]);
        toast.success('Stream created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stream?')) return;
    await api.delete(`/streams/${id}`);
    setStreams(ss => ss.filter(s => s._id !== id));
    toast.success('Stream deleted');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Streams</h1>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            Combine accounts into embeddable feed widgets
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <FiPlus /> Create Stream
        </button>
      </div>

      {loading ? <div className="spinner" /> : streams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">No streams yet</div>
          <p className="text-muted">
            Create a stream to combine multiple accounts into one embeddable feed.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
            <FiPlus /> Create Stream
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {streams.map(s => (
            <div key={s._id} className="card card-body">
              {/* Stream header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                    {s.isPublic && (
                      <span className="badge" style={{ background: '#22c55e22', color: '#16a34a' }}>
                        <FiGlobe size={11} /> Public
                      </span>
                    )}
                  </div>
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                    {LAYOUTS.find(l => l.value === s.layout)?.label} ·{' '}
                    {THEMES.find(t => t.value === s.theme)?.label} ·{' '}
                    {(s.accounts || []).length} account{s.accounts?.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {s.isPublic && (
                    <button
                      className={`btn btn-sm ${expandedEmbed === s._id ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setExpandedEmbed(expandedEmbed === s._id ? null : s._id)}
                      title="Show embed code"
                    >
                      <FiCode /> Embed
                    </button>
                  )}
                  <button className="btn btn-icon btn-sm" onClick={() => openEdit(s)} title="Edit">
                    <FiEdit2 />
                  </button>
                  <button className="btn btn-icon btn-sm" onClick={() => handleDelete(s._id)}
                    title="Delete" style={{ color: '#ef4444' }}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              {/* Account tags */}
              {(s.accounts || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {s.accounts.map(acc => (
                    <span key={acc._id} className="badge"
                      style={{ background: 'var(--surface2)', color: 'var(--text)' }}>
                      {acc.label || acc.accountId}
                    </span>
                  ))}
                </div>
              )}

              {/* Embed code panel */}
              {expandedEmbed === s._id && <EmbedPreview stream={s} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ─────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Stream' : 'Create Stream'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Stream Name</label>
                <input required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="My Social Wall" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Layout</label>
                  <select value={form.layout} onChange={e => setForm({ ...form, layout: e.target.value })}>
                    {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Theme</label>
                  <select value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })}>
                    {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Posts per page</label>
                <input type="number" min={5} max={100} value={form.postsPerPage}
                  onChange={e => setForm({ ...form, postsPerPage: +e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Accounts to include</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {allAccounts.length === 0 && (
                    <p className="text-muted text-sm">No accounts yet - add some first.</p>
                  )}
                  {allAccounts.map(acc => (
                    <button
                      type="button"
                      key={acc._id}
                      onClick={() => toggleAccount(acc._id)}
                      className="filter-network-btn"
                      style={form.accounts.includes(acc._id)
                        ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
                        : {}}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
                {[
                  ['showFilter',  'Show Filter Bar'],
                  ['showSearch',  'Show Search'],
                  ['showSharing', 'Enable Sharing'],
                  ['isPublic',    'Make Public (embeddable)'],
                ].map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[k]}
                      onChange={e => setForm({ ...form, [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <FiCheck /> {saving ? 'Saving…' : editId ? 'Update' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
