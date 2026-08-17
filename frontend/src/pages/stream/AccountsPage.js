import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiRefreshCw, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import {
  FaTwitter, FaFacebook, FaInstagram, FaYoutube,
  FaReddit, FaTiktok, FaRss, FaPinterest, FaLinkedin,
} from 'react-icons/fa';
import { NETWORKS } from '../../utils/networks';

const ICONS = {
  twitter: FaTwitter, facebook: FaFacebook, instagram: FaInstagram,
  youtube: FaYoutube, reddit: FaReddit, tiktok: FaTiktok,
  rss: FaRss, pinterest: FaPinterest, linkedin: FaLinkedin,
};

const EMPTY_FORM = { network: 'twitter', label: '', accountId: '', accessToken: '', color: '' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.accounts || []);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (acc) => {
    setForm({ network: acc.network, label: acc.label, accountId: acc.accountId, accessToken: acc.accessToken || '', color: acc.color || '' });
    setEditId(acc._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const res = await api.put(`/accounts/${editId}`, form);
        setAccounts((a) => a.map((x) => x._id === editId ? res.data.account : x));
        toast.success('Account updated');
      } else {
        const res = await api.post('/accounts', form);
        setAccounts((a) => [res.data.account, ...a]);
        toast.success('Account added');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account and all its posts?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      setAccounts((a) => a.filter((x) => x._id !== id));
      toast.success('Account deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleFetch = async (acc) => {
    setFetching(acc._id);
    try {
      const res = await api.post(`/accounts/${acc._id}/fetch`);
      toast.success(`Fetched ${res.data.fetched} posts`);
      loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fetch failed');
    } finally {
      setFetching(null);
    }
  };

  const selectedNet = NETWORKS[form.network] || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Social Accounts</h1>
        <button className="btn btn-primary" onClick={openAdd}>
          <FiPlus /> Add Account
        </button>
      </div>

      {loading ? <div className="spinner" /> : accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">No accounts yet</div>
          <p className="text-muted">Connect your first social media account to start streaming posts.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
            <FiPlus /> Add Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {accounts.map((acc) => {
            const net = NETWORKS[acc.network] || {};
            const Icon = ICONS[acc.network] || FaRss;
            const color = acc.color || net.color || '#888';
            return (
              <div key={acc._id} className="card card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: color + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color, flexShrink: 0,
                  }}>
                    <Icon />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.label}</div>
                    <div className="text-muted text-sm">{net.label} · @{acc.accountId}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: acc.isActive ? '#22c55e' : '#ef4444',
                      display: 'inline-block',
                    }} />
                  </div>
                </div>

                {acc.lastFetched && (
                  <div className="text-muted text-sm">
                    Last fetched: {new Date(acc.lastFetched).toLocaleString()}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleFetch(acc)}
                    disabled={fetching === acc._id} style={{ flex: 1, justifyContent: 'center' }}>
                    <FiRefreshCw style={{ animation: fetching === acc._id ? 'spin .7s linear infinite' : 'none' }} />
                    {fetching === acc._id ? 'Fetching…' : 'Fetch'}
                  </button>
                  <button className="btn btn-icon btn-sm" onClick={() => openEdit(acc)} title="Edit">
                    <FiEdit2 />
                  </button>
                  <button className="btn btn-icon btn-sm" onClick={() => handleDelete(acc._id)}
                    title="Delete" style={{ color: '#ef4444' }}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Account' : 'Add Social Account'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Network</label>
                <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} disabled={!!editId}>
                  {Object.entries(NETWORKS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Display Label</label>
                <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. My Twitter" />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {selectedNet.label} - {selectedNet.placeholder || 'Account ID / URL'}
                </label>
                <input required value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  placeholder={selectedNet.placeholder} />
              </div>
              {['facebook', 'instagram', 'tiktok', 'linkedin', 'pinterest'].includes(form.network) && (
                <div className="form-group">
                  <label className="form-label">Access Token <span className="text-muted">(required for {selectedNet.label})</span></label>
                  <input type="password" value={form.accessToken}
                    onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                    placeholder="Paste your access token" />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Custom Accent Color <span className="text-muted">(optional)</span></label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="color" value={form.color || selectedNet.color || '#6c63ff'}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    style={{ width: 48, height: 40, padding: 4, cursor: 'pointer' }} />
                  <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder={selectedNet.color || '#6c63ff'} style={{ flex: 1 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <FiCheck /> {saving ? 'Saving…' : editId ? 'Update' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
