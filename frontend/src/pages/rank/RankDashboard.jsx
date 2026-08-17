import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, reportsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { FolderOpen, FileText, Wrench, TrendingUp, ArrowRight, Plus, Zap } from 'lucide-react';
import { format } from 'date-fns';

const SEV_COLOR = { critical: 'var(--error)', warning: 'var(--warning)', passed: 'var(--success)', info: 'var(--info)' };

export default function DashboardHome() {
  const { user } = useAuth();
  const { data: projData } = useQuery({ queryKey: ['projects'], queryFn: projectsAPI.list });
  const { data: repData } = useQuery({ queryKey: ['reports', { limit: 5 }], queryFn: () => reportsAPI.list({ limit: 5 }) });

  const projects = projData?.data?.data || [];
  const reports = repData?.data?.data?.reports || [];

  const reportsUsed = user?.usage?.reports || 0;
  const reportsLimit = user?.plan?.limits?.reportsPerMonth ?? 10;
  const projectsUsed = user?.usage?.projects || 0;
  const projectsLimit = user?.plan?.limits?.projects ?? 1;

  return (
    <DashboardLayout title="Overview">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 3 }}>Here's your SEO overview.</p>
          </div>
          <Link to="/tools" className="btn btn-primary btn-sm"><Wrench size={13} /> Run a Tool</Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 26 }}>
          {[
            { label: 'Projects', value: projects.length, icon: FolderOpen, color: 'var(--primary)', limit: projectsLimit, used: projectsUsed, href: '/dashboard/projects' },
            { label: 'Reports This Month', value: reportsUsed, icon: FileText, color: 'var(--secondary)', limit: reportsLimit, used: reportsUsed, href: '/dashboard/reports' },
            { label: 'Avg SEO Score', value: projects.length ? Math.round(projects.filter(p => p.latestScore).reduce((s, p) => s + p.latestScore, 0) / Math.max(1, projects.filter(p => p.latestScore).length)) || '-' : '-', icon: TrendingUp, color: 'var(--success)', href: '/dashboard/projects' },
            { label: 'Plan', value: user?.plan?.name || 'Free', icon: Zap, color: 'var(--warning)', href: '/dashboard/billing' },
          ].map(({ label, value, icon: Icon, color, limit, used, href }) => (
            <Link key={label} to={href} style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={19} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                  {limit !== undefined && limit !== -1 && (
                    <div className="progress" style={{ marginTop: 6 }}>
                      <div className="progress-bar" style={{ width: `${Math.min((used / limit) * 100, 100)}%`, background: color }} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Projects */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 14 }}>Projects</h3>
              <Link to="/dashboard/projects" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>All <ArrowRight size={12} /></Link>
            </div>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                <FolderOpen size={30} style={{ display: 'block', margin: '0 auto 10px', opacity: .2 }} />
                <p style={{ fontSize: 13, marginBottom: 12 }}>No projects yet.</p>
                <Link to="/dashboard/projects" className="btn btn-primary btn-sm"><Plus size={12} /> Create Project</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.slice(0, 5).map(p => (
                  <Link key={p._id} to={`/dashboard/projects/${p._id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.domain}</div>
                    </div>
                    {p.latestScore !== null && (
                      <span style={{ fontWeight: 700, fontSize: 15, color: p.latestScore >= 80 ? 'var(--success)' : p.latestScore >= 50 ? 'var(--warning)' : 'var(--error)' }}>{p.latestScore}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent reports */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 14 }}>Recent Reports</h3>
              <Link to="/dashboard/reports" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>All <ArrowRight size={12} /></Link>
            </div>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                <FileText size={30} style={{ display: 'block', margin: '0 auto 10px', opacity: .2 }} />
                <p style={{ fontSize: 13, marginBottom: 12 }}>No reports yet.</p>
                <Link to="/tools" className="btn btn-primary btn-sm"><Wrench size={12} /> Run a Tool</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reports.map(r => (
                  <Link key={r._id} to={`/dashboard/reports/${r._id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.type.replace(/_/g, ' ')} · {r.createdAt ? format(new Date(r.createdAt), 'MMM d') : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      {r.score !== null && <span style={{ fontSize: 14, fontWeight: 700, color: r.score >= 80 ? 'var(--success)' : r.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>{r.score}</span>}
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'failed' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: 10 }}>{r.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upgrade nudge */}
        {!['pro', 'agency'].includes(user?.plan?.slug) && (
          <div className="card" style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,.07)', borderColor: 'rgba(99,102,241,.25)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Unlock more with Pro</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>500 reports/month, 25 projects, scheduled reports, PDF export & API access.</p>
            </div>
            <Link to="/dashboard/billing" className="btn btn-primary btn-sm"><Zap size={12} /> Upgrade Now</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
