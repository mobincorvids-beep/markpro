import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Webhook, Trash2, Edit3, Mail, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const HANDLER_TYPES = [
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'slack', label: 'Slack', icon: MessageSquare },
  { value: 'discord', label: 'Discord', icon: MessageSquare },
];

const emptyForm = { name: '', type: 'webhook', settings: { webhookUrl: '', webhookMethod: 'POST', emailAddress: '', slackWebhookUrl: '', discordWebhookUrl: '' } };

function HandlerModal({ handler, onClose, onSaved }) {
  const [form, setForm] = useState(handler || emptyForm);
  const [loading, setLoading] = useState(false);

  const setSetting = (k, v) => setForm(p => ({ ...p, settings: { ...p.settings, [k]: v } }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (handler?._id) {
        await userAPI.updateHandler(handler._id, form);
        toast.success('Handler updated');
      } else {
        await userAPI.createHandler(form);
        toast.success('Handler created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 17 }}>{handler?._id ? 'Edit' : 'New'} Notification Handler</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="My Slack Handler" />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {HANDLER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {form.type === 'webhook' && (
            <>
              <div className="form-group">
                <label className="form-label">Webhook URL</label>
                <input className="form-input" placeholder="https://hooks.example.com/…" value={form.settings.webhookUrl} onChange={e => setSetting('webhookUrl', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-select" value={form.settings.webhookMethod} onChange={e => setSetting('webhookMethod', e.target.value)}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
            </>
          )}
          {form.type === 'email' && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" placeholder="notify@example.com" value={form.settings.emailAddress} onChange={e => setSetting('emailAddress', e.target.value)} required />
            </div>
          )}
          {form.type === 'slack' && (
            <div className="form-group">
              <label className="form-label">Slack Webhook URL</label>
              <input className="form-input" placeholder="https://hooks.slack.com/services/…" value={form.settings.slackWebhookUrl} onChange={e => setSetting('slackWebhookUrl', e.target.value)} required />
            </div>
          )}
          {form.type === 'discord' && (
            <div className="form-group">
              <label className="form-label">Discord Webhook URL</label>
              <input className="form-input" placeholder="https://discord.com/api/webhooks/…" value={form.settings.discordWebhookUrl} onChange={e => setSetting('discordWebhookUrl', e.target.value)} required />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><div className="spinner" /> Saving…</> : 'Save Handler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HandlersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'new' | handler object

  const { data, isLoading } = useQuery({ queryKey: ['handlers'], queryFn: userAPI.listHandlers });
  const handlers = data?.data?.data || [];

  const handleDelete = async id => {
    if (!window.confirm('Delete this handler?')) return;
    try {
      await userAPI.deleteHandler(id);
      qc.invalidateQueries({ queryKey: ['handlers'] });
      toast.success('Handler deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <DashboardLayout title="Notification Handlers">
      {modal !== null && (
        <HandlerModal
          handler={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['handlers'] })}
        />
      )}
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Notification Handlers</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>Send lead data to webhooks, Slack, Discord, or email when visitors submit a form.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={14} /> New Handler</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div>
          ) : handlers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 24px', color: 'var(--text-muted)' }}>
              <Webhook size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: .2 }} />
              <p style={{ fontSize: 14, marginBottom: 14 }}>No handlers configured yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}><Plus size={13} /> Create Handler</button>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Destination</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {handlers.map(h => (
                  <tr key={h._id}>
                    <td style={{ fontWeight: 500 }}>{h.name}</td>
                    <td><span className="badge badge-info">{h.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.settings?.webhookUrl || h.settings?.emailAddress || h.settings?.slackWebhookUrl || h.settings?.discordWebhookUrl || '-'}
                    </td>
                    <td><span className={`badge ${h.isActive ? 'badge-success' : 'badge-gray'}`}>{h.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(h)} title="Edit"><Edit3 size={13} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(h._id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
