import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ChevronLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = [
  { group: 'Informational', items: [{ v: 'informational', l: 'Popup' }, { v: 'informational_bar', l: 'Bar' }, { v: 'informational_mini', l: 'Mini Popup' }] },
  { group: 'Social Proof', items: [{ v: 'conversions', l: 'Conversions' }, { v: 'conversions_counter', l: 'Conversions Counter' }, { v: 'live_counter', l: 'Live Visitor Counter' }, { v: 'reviews', l: 'Reviews' }] },
  { group: 'Lead Capture', items: [{ v: 'email_collector', l: 'Email Collector' }, { v: 'collector_bar', l: 'Collector Bar' }, { v: 'collector_modal', l: 'Modal Collector' }, { v: 'countdown_collector', l: 'Countdown + Collector' }] },
  { group: 'Engagement', items: [{ v: 'coupon', l: 'Coupon' }, { v: 'coupon_bar', l: 'Coupon Bar' }, { v: 'video', l: 'Video' }, { v: 'social_share', l: 'Social Share' }, { v: 'button_bar', l: 'Button Bar' }, { v: 'whatsapp_chat', l: 'WhatsApp Chat' }] },
  { group: 'Feedback', items: [{ v: 'score_feedback', l: 'Score (NPS)' }, { v: 'text_feedback', l: 'Text Feedback' }, { v: 'emoji_feedback', l: 'Emoji Feedback' }] },
  { group: 'Other', items: [{ v: 'cookie_notification', l: 'Cookie Notice' }, { v: 'custom_html', l: 'Custom HTML' }, { v: 'contact_us', l: 'Contact Form' }, { v: 'image', l: 'Image' }, { v: 'audio', l: 'Audio' }] },
];

const POSITIONS = ['bottom_left', 'bottom_right', 'top_left', 'top_right', 'top_center', 'bottom_center'];
const TONES = ['professional', 'casual', 'witty'];

const defaultSettings = {
  title: '', description: '', url: '', imageUrl: null,
  position: 'bottom_left', displayAfterSeconds: 3, displayDurationSeconds: 8, displayIntervalSeconds: 5,
  displayOnMobile: true, animationIn: 'fadeInUp', animationOut: 'fadeOutDown',
  backgroundColor: '#ffffff', textColor: '#000000', borderRadius: 8, fontSize: 14,
  ctaText: '', ctaUrl: '', ctaColor: 'var(--brand)',
  dataSource: 'manual', collectEmail: true, collectName: false,
  targetDevices: 'all', showOnce: false, showOncePerSession: false,
  socialNetworks: [], customHtml: '', whatsappNumber: '', whatsappMessage: '',
  couponCode: '', webhookUrl: '',
};

export default function NotificationEditorPage() {
  const { campaignId, notifId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!notifId;

  const [form, setForm] = useState({ name: '', type: 'informational', settings: { ...defaultSettings } });
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  const { data: existingData } = useQuery({
    queryKey: ['notification', campaignId, notifId],
    queryFn: () => notificationAPI.getOne(campaignId, notifId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingData?.data?.data) {
      const n = existingData.data.data;
      setForm({ name: n.name, type: n.type, settings: { ...defaultSettings, ...n.settings } });
    }
  }, [existingData]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setSetting = (key, val) => setForm(p => ({ ...p, settings: { ...p.settings, [key]: val } }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      if (isEditing) {
        await notificationAPI.update(campaignId, notifId, form);
        toast.success('Notification updated');
      } else {
        await notificationAPI.create(campaignId, form);
        toast.success('Notification created');
      }
      navigate(`/dashboard/campaigns/${campaignId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'display', label: 'Display Rules' },
    { id: 'targeting', label: 'Targeting' },
  ];

  return (
    <DashboardLayout title={isEditing ? 'Edit Notification' : 'New Notification'}>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(`/dashboard/campaigns/${campaignId}`)} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
            <h1 style={{ fontSize: 19, fontWeight: 700 }}>{isEditing ? 'Edit Notification' : 'New Notification'}</h1>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <><div className="spinner" /> Saving…</> : <><Save size={14} /> Save</>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Type picker */}
          <div className="card card-sm" style={{ position: 'sticky', top: 76 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>NOTIFICATION TYPE</p>
            {TYPES.map(group => (
              <div key={group.group} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>{group.group}</p>
                {group.items.map(({ v, l }) => (
                  <button key={v} onClick={() => set('type', v)}
                    className={`btn btn-sm ${form.type === v ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 2, fontSize: 12 }}>
                    {l}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Settings panel */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Notification Name</label>
                <input className="form-input" placeholder="e.g. Homepage Live Counter" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-card)', borderRadius: 8, padding: 4, border: '1px solid var(--border)' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 12 }}>{t.label}</button>
              ))}
            </div>

            <div className="card">
              {/* General tab */}
              {activeTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" placeholder="Main headline" value={form.settings.title} onChange={e => setSetting('title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" rows={3} placeholder="Subtitle or supporting text" value={form.settings.description} onChange={e => setSetting('description', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link URL</label>
                    <input className="form-input" placeholder="https://example.com/offer" value={form.settings.url} onChange={e => setSetting('url', e.target.value)} />
                  </div>
                  {['email_collector', 'collector_bar', 'collector_modal', 'countdown_collector'].includes(form.type) && (
                    <div style={{ padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Collect Fields</p>
                      {[['collectEmail', 'Email (required)'], ['collectName', 'Name'], ['collectPhone', 'Phone']].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                          <label className="toggle"><input type="checkbox" checked={!!form.settings[key]} onChange={e => setSetting(key, e.target.checked)} /><span className="toggle-slider" /></label>
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                  {form.type === 'coupon' || form.type === 'coupon_bar' ? (
                    <div className="form-group">
                      <label className="form-label">Coupon Code</label>
                      <input className="form-input" placeholder="SAVE20" value={form.settings.couponCode} onChange={e => setSetting('couponCode', e.target.value)} />
                    </div>
                  ) : null}
                  {form.type === 'whatsapp_chat' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">WhatsApp Number</label>
                        <input className="form-input" placeholder="+1234567890" value={form.settings.whatsappNumber} onChange={e => setSetting('whatsappNumber', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pre-filled Message</label>
                        <input className="form-input" placeholder="Hello, I need help with…" value={form.settings.whatsappMessage} onChange={e => setSetting('whatsappMessage', e.target.value)} />
                      </div>
                    </>
                  )}
                  {form.type === 'custom_html' && (
                    <div className="form-group">
                      <label className="form-label">Custom HTML</label>
                      <textarea className="form-textarea form-input" rows={6} style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="<div>Your HTML here...</div>" value={form.settings.customHtml} onChange={e => setSetting('customHtml', e.target.value)} />
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Call to Action</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Button Text</label>
                        <input className="form-input" placeholder="Learn More" value={form.settings.ctaText} onChange={e => setSetting('ctaText', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Button URL</label>
                        <input className="form-input" placeholder="https://…" value={form.settings.ctaUrl} onChange={e => setSetting('ctaUrl', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance tab */}
              {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <select className="form-select" value={form.settings.position} onChange={e => setSetting('position', e.target.value)}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Background Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={form.settings.backgroundColor} onChange={e => setSetting('backgroundColor', e.target.value)} style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                        <input className="form-input" value={form.settings.backgroundColor} onChange={e => setSetting('backgroundColor', e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Text Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={form.settings.textColor} onChange={e => setSetting('textColor', e.target.value)} style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                        <input className="form-input" value={form.settings.textColor} onChange={e => setSetting('textColor', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Border Radius (px)</label>
                      <input type="number" className="form-input" value={form.settings.borderRadius} onChange={e => setSetting('borderRadius', +e.target.value)} min={0} max={50} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Font Size (px)</label>
                      <input type="number" className="form-input" value={form.settings.fontSize} onChange={e => setSetting('fontSize', +e.target.value)} min={10} max={24} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTA Button Color</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={form.settings.ctaColor} onChange={e => setSetting('ctaColor', e.target.value)} style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                      <input className="form-input" value={form.settings.ctaColor} onChange={e => setSetting('ctaColor', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Display Rules tab */}
              {activeTab === 'display' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[['displayAfterSeconds', 'Show after (sec)'], ['displayDurationSeconds', 'Duration (sec)'], ['displayIntervalSeconds', 'Repeat interval (sec)']].map(([key, label]) => (
                      <div key={key} className="form-group">
                        <label className="form-label">{label}</label>
                        <input type="number" className="form-input" value={form.settings[key]} onChange={e => setSetting(key, +e.target.value)} min={0} />
                      </div>
                    ))}
                  </div>
                  {[['displayOnMobile', 'Show on mobile'], ['showOnce', 'Show once per visitor'], ['showOncePerSession', 'Show once per session']].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                      <label className="toggle"><input type="checkbox" checked={!!form.settings[key]} onChange={e => setSetting(key, e.target.checked)} /><span className="toggle-slider" /></label>
                      {label}
                    </label>
                  ))}
                </div>
              )}

              {/* Targeting tab */}
              {activeTab === 'targeting' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Target Devices</label>
                    <select className="form-select" value={form.settings.targetDevices} onChange={e => setSetting('targetDevices', e.target.value)}>
                      <option value="all">All Devices</option>
                      <option value="desktop">Desktop Only</option>
                      <option value="mobile">Mobile Only</option>
                      <option value="tablet">Tablet Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Webhook URL <span className="badge badge-warning" style={{ fontSize: 10 }}>Pro</span></label>
                    <input className="form-input" placeholder="https://hooks.example.com/…" value={form.settings.webhookUrl} onChange={e => setSetting('webhookUrl', e.target.value)} />
                    <span className="form-hint">POST lead data to this URL when a visitor submits the form.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
