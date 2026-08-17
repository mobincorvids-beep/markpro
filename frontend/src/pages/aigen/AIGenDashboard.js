import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { genTypeBadge } from '../../utils/genTypes';
import { FiZap, FiFileText, FiCode, FiGlobe, FiImage, FiVolume2, FiMic, FiFilm, FiCreditCard } from 'react-icons/fi';

const GENERATORS = [
  { to:'/generate/text',        icon:<FiFileText size={20}/>, label:'Text Generator',    color:'var(--brand)' },
  { to:'/generate/code',        icon:<FiCode size={20}/>,     label:'Code Generator',    color:'#8b5cf6' },
  { to:'/generate/translation', icon:<FiGlobe size={20}/>,    label:'Translation',       color:'#06b6d4' },
  { to:'/generate/image',       icon:<FiImage size={20}/>,    label:'Image Generator',   color:'#ec4899' },
  { to:'/generate/speech',      icon:<FiVolume2 size={20}/>,  label:'Text to Speech',    color:'#f59e0b' },
  { to:'/generate/transcribe',  icon:<FiMic size={20}/>,      label:'Speech to Text',    color:'#10b981' },
  { to:'/generate/animate',     icon:<FiFilm size={20}/>,     label:'Image Animation',   color:'#ef4444' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/ai/prompts/stats').then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]}</h1>
      </div>

      {/* Credits card */}
      <div className="card card-body mb-4" style={{ background: 'rgba(139,92,246,.2)', border: '1px solid var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)' }}>
            <FiZap style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {user?.credits?.toLocaleString() ?? 0}
          </div>
          <div className="text-muted">Credits remaining</div>
        </div>
        <Link to="/credits" className="btn btn-primary"><FiCreditCard size={14} /> Buy More Credits</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}></div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Generations</div>
          </div>
          {stats.byType?.slice(0, 3).map(t => {
            const tb = genTypeBadge(t._id);
            return (
              <div key={t._id} className="card stat-card">
                <div className="stat-icon" style={{ background: `${tb.color}22`, color: tb.color }}>{tb.icon}</div>
                <div className="stat-value">{t.count}</div>
                <div className="stat-label">{tb.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick access generators */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>AI Generators</h2>
      <div className="template-grid" style={{ marginBottom: 28 }}>
        {GENERATORS.map(g => (
          <Link key={g.to} to={g.to} className="template-card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${g.color}22`, color: g.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {g.icon}
            </div>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{g.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent generations */}
      {stats?.recentPrompts?.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-3">
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Generations</h2>
            <Link to="/history" style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</Link>
          </div>
          {stats.recentPrompts.map(p => {
            const tb = genTypeBadge(p.type);
            return (
              <div key={p._id} className="history-item">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 18 }}>{tb.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title || `${tb.label} generation`}</div>
                      <div className="text-muted text-sm">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</div>
                    </div>
                  </div>
                  <span className="text-muted text-sm">-{p.creditsUsed} credits</span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
