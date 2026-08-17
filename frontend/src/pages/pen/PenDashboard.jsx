import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { penAPI } from '../../services/api';
import {
  FileText, Image as ImageIcon, Mic, MessageSquare, CreditCard,
  ArrowRight, Clock, Sparkles,
} from 'lucide-react';

const TYPE_ICON = { text: FileText, image: ImageIcon, audio: Mic, code: FileText, chat: MessageSquare };

export default function PenDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    penAPI.getDashboardStats().then(r => setStats(r.data.data || r.data)).catch(() => {});
  }, []);

  const QUICK = [
    { label: 'Write Text',     to: '/pen/templates?type=text',  icon: FileText,     color: 'var(--brand)' },
    { label: 'Generate Image', to: '/pen/templates?type=image', icon: ImageIcon,    color: 'var(--smm)'   },
    { label: 'Text to Speech', to: '/pen/templates?type=audio', icon: Mic,          color: 'var(--social)'},
    { label: 'AI Chat',        to: '/pen/chat',                 icon: MessageSquare,color: 'var(--ai)'    },
  ];

  const u = stats?.usageStats;

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--ai)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', color:'var(--text-3)', marginBottom: 10 }}>PEN AI</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p style={{ color:'var(--text-3)', fontSize: 13, maxWidth: 480, lineHeight: 1.6 }}>
            Template-driven AI writing, image, audio, and code generation - pick a template and let AI do the rest.
          </p>
          <Link to="/pen/templates" className="btn" style={{ marginTop: 16, background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.2)' }}>
            <Sparkles size={14} /> Browse Templates
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--brand-light)' }}><FileText size={20} color="var(--brand)" /></div>
          <div className="stat-value">{stats?.totalContent || 0}</div>
          <div className="stat-label">Text Generated</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(236,72,153,.1)' }}><ImageIcon size={20} color="var(--smm)" /></div>
          <div className="stat-value">{stats?.totalImages || 0}</div>
          <div className="stat-label">Images Created</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,.1)' }}><Mic size={20} color="var(--social)" /></div>
          <div className="stat-value">{stats?.totalAudio || 0}</div>
          <div className="stat-label">Audio Generated</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-bg)' }}><CreditCard size={20} color="var(--warning)" /></div>
          <div className="stat-value" style={{ fontSize: 16 }}>{user?.penPackageData?.package_name || 'Free'}</div>
          <div className="stat-label">Current Plan</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body">
            <div className="card-title mb-3">Quick Actions</div>
            <div className="flex-col gap-2">
              {QUICK.map(a => (
                <Link key={a.to} to={a.to} className="flex items-center gap-3"
                  style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  <a.icon size={17} color={a.color} /> {a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-title mb-3">Usage This Period</div>
            {u ? (
              <>
                {[
                  { label: 'Tokens / Words', used: u.token.used, limit: u.token.limit, color: 'var(--brand)' },
                  { label: 'Images',         used: u.image.used, limit: u.image.limit, color: 'var(--smm)' },
                  { label: 'Audio',          used: u.audio.used, limit: u.audio.limit, color: 'var(--social)' },
                ].map(m => (
                  <div key={m.label} style={{ marginBottom: 14 }}>
                    <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                      <span className="text-muted">{m.label}</span>
                      <span className="font-bold">{m.used} / {m.limit === -1 ? '∞' : m.limit}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: m.limit === -1 ? '5%' : `${Math.min(100, (m.used / m.limit) * 100)}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </>
            ) : <div className="text-sm text-faint">Loading usage…</div>}
            <Link to="/pen/billing" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai)' }}>Upgrade Plan →</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2"><Clock size={15} color="var(--text-2)" /><span className="card-title">Recent Generations</span></div>
          <Link to="/pen/history" style={{ fontSize: 12, color: 'var(--ai)', fontWeight: 700 }}>See all →</Link>
        </div>
        <div style={{ padding: stats?.recentContent?.length ? '4px 0' : '0' }}>
          {!stats?.recentContent?.length ? (
            <div className="empty-state" style={{ padding: '28px 20px' }}>
              <div className="empty-icon" style={{ background: 'rgba(249,115,22,.1)' }}><FileText size={24} color="var(--ai)" /></div>
              <div className="empty-sub">No content generated yet. <Link to="/pen/templates" style={{ color: 'var(--ai)', fontWeight: 700 }}>Try a template!</Link></div>
            </div>
          ) : stats.recentContent.map(c => {
            const Icon = TYPE_ICON[c.content_type] || FileText;
            return (
              <Link key={c._id} to={`/pen/history/${c._id}`} className="flex items-center gap-3"
                style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                <Icon size={18} color="var(--text-2)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.ai_template_id?.template_name || c.document_name || 'Custom generation'}
                  </div>
                  <div className="text-faint text-sm">{new Date(c.searched_at || c.createdAt).toLocaleString()}</div>
                </div>
                <span className="badge badge-brand">{c.content_type}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
