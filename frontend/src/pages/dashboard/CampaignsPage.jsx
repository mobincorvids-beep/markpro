import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Search, ToggleLeft, ToggleRight, Trash2, Code2, BarChart2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

function NewCampaignModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', domain: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await campaignAPI.create(form);
      toast.success('Campaign created!');
      onCreated(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 18 }}>New Campaign</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <input className="form-input" placeholder="My Website Social Proof" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Website Domain</label>
            <input className="form-input" placeholder="example.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} required />
            <span className="form-hint">The domain where you'll embed the widget</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><div className="spinner" /> Creating…</> : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', search],
    queryFn: () => campaignAPI.list({ search }),
  });
  const campaigns = data?.data?.data?.campaigns || [];

  const handleToggle = async (campaign) => {
    try {
      await campaignAPI.toggle(campaign._id);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign ${campaign.isEnabled ? 'paused' : 'enabled'}`);
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign and all its notifications?')) return;
    try {
      await campaignAPI.remove(id);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <DashboardLayout>
      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['campaigns'] })} />}

      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Campaigns</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={15} /> New Campaign</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-dark" style={{ width: 30, height: 30 }} /></div>
        ) : campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No campaigns yet. Create one to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Create Campaign</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
            {campaigns.map(c => (
              <div key={c._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                      <ExternalLink size={11} />{c.domain}
                    </div>
                  </div>
                  <button onClick={() => handleToggle(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    {c.isEnabled ? <ToggleRight size={22} color="var(--success)" /> : <ToggleLeft size={22} color="var(--text-muted)" />}
                  </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  {[['Impressions', c.stats?.totalImpressions || 0], ['Clicks', c.stats?.totalClicks || 0], ['Conversions', c.stats?.totalConversions || 0]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{v.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/dashboard/campaigns/${c._id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    Manage
                  </Link>
                  <Link to={`/dashboard/campaigns/${c._id}`} className="btn btn-ghost btn-sm btn-icon" title="Analytics"><BarChart2 size={14} /></Link>
                  <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => handleDelete(c._id)} style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
