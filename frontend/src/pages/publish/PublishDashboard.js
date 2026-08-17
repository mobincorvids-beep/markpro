import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import PlatformChip from '../../components/publish/PlatformChip';
import { STATUS_COLORS } from '../../utils/platforms';
import {
  Edit3, Calendar, Zap, Link2, FileText, Clock, AlertCircle,
  Heart, Eye, CheckCircle2, XCircle, Sparkles, ArrowRight,
} from 'lucide-react';

export default function PublishDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/publish/posts/stats').then(r => setStats(r.data)).catch(()=>{}); }, []);

  const plan     = user?.plan;
  const wordPct  = plan?.wordTokens  ? Math.min(100, ((user?.wordTokensUsed || 0)  / plan.wordTokens)  * 100) : 0;
  const imgPct   = plan?.imageTokens ? Math.min(100, ((user?.imageTokensUsed || 0) / plan.imageTokens) * 100) : 0;

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</div>
          <div className="page-sub">Here's what's happening with your social media</div>
        </div>
        <Link to="/publish/compose" className="btn btn-ai"><Edit3 size={14}/> Create Post</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stat-grid">
          {[
            { icon:FileText,     label:'Total Posts', value:stats.total,          color:'var(--brand)',  bg:'var(--brand-light)' },
            { icon:Clock,        label:'Scheduled',   value:stats.scheduled,      color:'var(--info)',   bg:'var(--info-bg)' },
            { icon:CheckCircle2, label:'Published',   value:stats.published,     color:'var(--success)',bg:'var(--success-bg)' },
            { icon:Heart,        label:'Total Likes', value:stats.totalLikes||0, color:'var(--danger)', bg:'var(--danger-bg)' },
            { icon:Eye,          label:'Total Reach', value:stats.totalReach||0, color:'var(--warning)',bg:'var(--warning-bg)' },
            { icon:XCircle,      label:'Failed',      value:stats.failed,        color:'var(--danger)', bg:'var(--danger-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
              <div className="stat-value">{(s.value || 0).toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:24 }}>
        {/* Recent posts */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FileText size={15} color="var(--text-2)" />
              <span className="card-title">Recent Posts</span>
            </div>
            <Link to="/publish/posts" style={{ fontSize:12, color:'var(--ai)', fontWeight:700 }}>View all →</Link>
          </div>
          <div style={{ padding:'4px 0' }}>
            {(!stats?.recentPosts || stats.recentPosts.length === 0) ? (
              <div className="empty-state" style={{ padding:'28px 20px' }}>
                <div className="empty-icon" style={{ background:'rgba(249,115,22,.1)' }}><FileText size={24} color="var(--ai)"/></div>
                <div className="empty-sub">No posts yet. <Link to="/publish/compose" style={{ color:'var(--ai)', fontWeight:700 }}>Create your first post!</Link></div>
              </div>
            ) : stats.recentPosts.map(p => (
              <div key={p._id} style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.content}</div>
                  <div className="flex items-center gap-2 mt-2" style={{ flexWrap:'wrap' }}>
                    {p.platforms?.map(pl => <PlatformChip key={pl} platform={pl} size="xs"/>)}
                    <span className={`badge ${STATUS_COLORS[p.status] || 'badge-default'}`}>{p.status}</span>
                    <span className="text-faint text-sm">{formatDistanceToNow(new Date(p.publishedAt || p.createdAt), { addSuffix:true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Token usage + quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-body">
              <div className="card-title mb-3">AI Token Usage</div>
              <div className="form-label">Word Tokens</div>
              <div className="progress-bar mb-2">
                <div className={`progress-fill ${wordPct > 80 ? '' : 'ai'}`} style={{ width:`${wordPct}%`, background: wordPct > 80 ? 'var(--danger)' : undefined }} />
              </div>
              <div className="text-sm text-muted">{(user?.wordTokensUsed || 0).toLocaleString()} / {plan?.wordTokens ? plan.wordTokens.toLocaleString() : '∞'} words</div>
              <div className="divider"/>
              <div className="form-label">Image Tokens</div>
              <div className="progress-bar mb-2">
                <div className={`progress-fill ${imgPct > 80 ? '' : 'ai'}`} style={{ width:`${imgPct}%`, background: imgPct > 80 ? 'var(--danger)' : undefined }} />
              </div>
              <div className="text-sm text-muted">{(user?.imageTokensUsed || 0).toLocaleString()} / {plan?.imageTokens ? plan.imageTokens.toLocaleString() : '∞'} images</div>
              <Link to="/publish/billing" className="btn btn-ai btn-sm w-full mt-4">Upgrade Plan <ArrowRight size={13}/></Link>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="card-title mb-3">Quick Actions</div>
              {[
                { to:'/publish/compose',  icon:Edit3,    label:'New Post' },
                { to:'/publish/calendar', icon:Calendar, label:'View Calendar' },
                { to:'/publish/ai',       icon:Zap,      label:'Generate Content' },
                { to:'/publish/social',   icon:Link2,    label:'Connect Account' },
                { to:'/publish/brands',   icon:Sparkles, label:'Brand AI' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="flex items-center gap-3"
                  style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:600, color:'var(--text)', textDecoration:'none' }}>
                  <l.icon size={15} color="var(--ai)" /> {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
