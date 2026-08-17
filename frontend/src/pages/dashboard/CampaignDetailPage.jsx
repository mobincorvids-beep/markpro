import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignAPI, notificationAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Code2, ToggleLeft, ToggleRight, Trash2, Edit3, BarChart2, Copy, ChevronLeft, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  informational: 'Info Popup', informational_bar: 'Info Bar', live_counter: 'Live Counter',
  conversions: 'Conversions', conversions_counter: 'Conversions Counter',
  email_collector: 'Email Collector', collector_bar: 'Collector Bar', collector_modal: 'Modal Collector',
  reviews: 'Reviews', score_feedback: 'Score Feedback', emoji_feedback: 'Emoji Feedback',
  countdown_collector: 'Countdown', coupon: 'Coupon', coupon_bar: 'Coupon Bar',
  video: 'Video', image: 'Image', cookie_notification: 'Cookie Notice',
  custom_html: 'Custom HTML', contact_us: 'Contact Form', social_share: 'Social Share',
  whatsapp_chat: 'WhatsApp Chat', button_bar: 'Button Bar', button_modal: 'Button Modal',
  engagement_links: 'Engagement Links', audio: 'Audio', request_collector: 'Request Collector',
};

function PixelModal({ campaign, onClose }) {
  const { data } = useQuery({
    queryKey: ['pixel-code', campaign._id],
    queryFn: () => campaignAPI.getPixelCode(campaign._id),
  });
  const code = data?.data?.data?.snippet || '';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 560 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 8, fontSize: 17 }}>Embed Code</h2>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Paste this snippet just before the <code style={{ color: 'var(--primary)' }}>&lt;/body&gt;</code> tag on every page of your site.
        </p>
        <pre className="code-block" style={{ marginBottom: 16 }}>{code}</pre>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied!'); }}>
            <Copy size={13} /> Copy Code
          </button>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPixel, setShowPixel] = useState(false);

  const { data: campData, isLoading: campLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.getOne(id),
  });
  const campaign = campData?.data?.data;

  const { data: notifsData, isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications', id],
    queryFn: () => notificationAPI.list(id),
  });
  const notifications = notifsData?.data?.data || [];

  const handleToggleNotif = async (n) => {
    try {
      await notificationAPI.toggle(id, n._id);
      qc.invalidateQueries({ queryKey: ['notifications', id] });
      toast.success(`Notification ${n.isEnabled ? 'paused' : 'enabled'}`);
    } catch { toast.error('Failed'); }
  };

  const handleDeleteNotif = async (nId) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await notificationAPI.remove(id, nId);
      qc.invalidateQueries({ queryKey: ['notifications', id] });
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (campLoading) return <DashboardLayout title="Campaign"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28 }} /></div></DashboardLayout>;
  if (!campaign) return <DashboardLayout title="Not Found"><p className="text-muted">Campaign not found.</p></DashboardLayout>;

  return (
    <DashboardLayout title={campaign.name}>
      {showPixel && <PixelModal campaign={campaign} onClose={() => setShowPixel(false)} />}
      <div className="fade-in">
        {/* Breadcrumb + actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/dashboard/campaigns')} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700 }}>{campaign.name}</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{campaign.domain}</p>
            </div>
            <span className={`badge ${campaign.isEnabled ? 'badge-success' : 'badge-gray'}`}>{campaign.isEnabled ? 'Active' : 'Paused'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowPixel(true)}><Code2 size={13} /> Get Embed Code</button>
            <Link to={`/dashboard/campaigns/${id}/notifications/new`} className="btn btn-primary btn-sm"><Plus size={13} /> Add Notification</Link>
          </div>
        </div>

        {/* Campaign stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
          {[['Impressions', campaign.stats?.totalImpressions || 0, 'var(--info)'], ['Clicks', campaign.stats?.totalClicks || 0, 'var(--success)'], ['Conversions', campaign.stats?.totalConversions || 0, 'var(--warning)']].map(([l, v, color]) => (
            <div key={l} className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{v.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontWeight: 600, fontSize: 15 }}>Notifications ({notifications.length})</h2>
            <Link to={`/dashboard/campaigns/${id}/notifications/new`} className="btn btn-primary btn-sm"><Plus size={13} /> Add</Link>
          </div>

          {notifsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner spinner-dark" /></div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              <Bell size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: .2 }} />
              <p style={{ fontSize: 13, marginBottom: 14 }}>No notifications yet. Add your first widget.</p>
              <Link to={`/dashboard/campaigns/${id}/notifications/new`} className="btn btn-primary btn-sm"><Plus size={13} /> Add Notification</Link>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Impressions</th><th>Clicks</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n._id}>
                    <td style={{ fontWeight: 500 }}>{n.name}</td>
                    <td><span className="badge badge-primary">{TYPE_LABELS[n.type] || n.type}</span></td>
                    <td>{(n.stats?.impressions || 0).toLocaleString()}</td>
                    <td>{(n.stats?.clicks || 0).toLocaleString()}</td>
                    <td>
                      <button onClick={() => handleToggleNotif(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {n.isEnabled ? <ToggleRight size={20} color="var(--success)" /> : <ToggleLeft size={20} color="var(--text-muted)" />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/dashboard/campaigns/${id}/notifications/${n._id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit"><Edit3 size={13} /></Link>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDeleteNotif(n._id)} title="Delete"><Trash2 size={13} /></button>
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
