import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountAPI } from '../../services/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, Rocket, Cpu, AlertCircle, Share2, MessageSquare, Sparkles, Search, Mail,
  Link2, UserPlus, Star, Target, MessageCircle, BarChart3, Video,
  Megaphone, Users, FolderOpen, Activity, Phone, QrCode, ShieldCheck,
  TrendingUp, TrendingDown, Grid, List, Zap, Inbox,
} from 'lucide-react';
import { DEMO_OVERVIEW, isOverviewEmpty } from '../../utils/demoData';

/* Module launcher - navigation only, live counters come from the API below */
const MODULES = [
  { id: 'social',     to: '/stackposts',      label: 'Social Media',     color: '#4f46e5', bg: '#eef2ff', icon: Share2 },
  { id: 'whatsapp',   to: '/whatsapp',        label: 'WhatsApp',         color: '#059669', bg: '#ecfdf5', icon: MessageSquare },
  { id: 'aistudio',   to: '/toolsai',         label: 'AI Studio',        color: '#7c3aed', bg: '#f3e8ff', icon: Sparkles },
  { id: 'seo',        to: '/seo',             label: 'SEO Tools',        color: '#d97706', bg: '#fffbeb', icon: Search },
  { id: 'email',      to: '/mailer',          label: 'Email & SMS',      color: '#0284c7', bg: '#e0f2fe', icon: Mail },
  { id: 'biolinks',   to: '/biolinks',        label: 'Bio Links',        color: '#059669', bg: '#ecfdf5', icon: Link2 },
  { id: 'leadgen',    to: '/zam/leads',       label: 'Lead Gen',         color: '#4f46e5', bg: '#eef2ff', icon: UserPlus },
  { id: 'reputation', to: '/social',          label: 'Reputation',       color: '#7c3aed', bg: '#f3e8ff', icon: Star },
  { id: 'rank',       to: '/rank',            label: 'Rank Tracker',     color: '#0284c7', bg: '#e0f2fe', icon: Target },
  { id: 'sms',        to: '/mailer',          label: 'SMS Gateway',      color: '#d97706', bg: '#fffbeb', icon: MessageCircle },
  { id: 'insights',   to: '/sitespy',         label: 'Deep Insights',    color: '#059669', bg: '#ecfdf5', icon: BarChart3 },
  { id: 'design',     to: '/design',          label: 'Design Studio',    color: '#db2777', bg: '#fce7f3', icon: Video },
  { id: 'omni',       to: '/whatsapp/chat',   label: 'Live Inbox',       color: '#0284c7', bg: '#e0f2fe', icon: MessageSquare },
  { id: 'proof',      to: '/social/campaigns',label: 'Proof Campaigns',  color: '#7c3aed', bg: '#f3e8ff', icon: Megaphone },
  { id: 'audience',   to: '/zam/contacts',    label: 'Audience',         color: '#4f46e5', bg: '#eef2ff', icon: Users },
  { id: 'vault',      to: '/docs/drive',      label: 'Document Vault',   color: '#0284c7', bg: '#e0f2fe', icon: FolderOpen },
  { id: 'dev',        to: '/cyber',           label: 'Developer Tools',  color: '#059669', bg: '#ecfdf5', icon: Activity },
  { id: 'voice',      to: '/teleman',         label: 'Voice & Calls',    color: '#d97706', bg: '#fffbeb', icon: Phone },
  { id: 'qr',         to: '/biolinks/tools',  label: 'QR Codes',         color: '#7c3aed', bg: '#f3e8ff', icon: QrCode },
  { id: 'settings',   to: '/social/settings', label: 'Compliance',       color: '#059669', bg: '#ecfdf5', icon: ShieldCheck },
];

const money = n => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const num = n => Number(n || 0).toLocaleString();

const timeAgo = iso => {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

function ChartEmpty({ label }) {
  return (
    <div className="chart-empty">
      <Inbox size={22} />
      <div>{label}</div>
    </div>
  );
}

export default function MainDashboard() {
  const { user } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    let alive = true;
    accountAPI.overview()
      .then(r => { if (alive) setRaw(r?.data?.data || r?.data || null); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Until the live APIs are wired up, fall back to on-theme demo numbers so
  // the charts are never blank. Real data always takes priority.
  const isDemo = !loading && isOverviewEmpty(raw);
  const overview = isDemo ? DEMO_OVERVIEW : raw;

  const traffic = overview?.traffic || [];
  const usage = (overview?.usage || []).filter(u => u.runs > 0);
  const spend = overview?.spend || [];
  const activity = overview?.activity || [];
  const counts = overview?.counts || {};
  const trend = Number(overview?.trend || 0);

  const hasTraffic = traffic.some(t => t.visits || t.engagement);

  const metrics = useMemo(() => ([
    {
      id: 'balance', label: 'WALLET BALANCE', icon: Wallet,
      value: money(overview?.wallet?.balance ?? user?.balance ?? 0),
      note: `${money(overview?.wallet?.spent30 ?? 0)} spent in 30 days`,
      color: '#4f46e5', bg: '#eef2ff',
    },
    {
      id: 'runs', label: 'TOOL RUNS (30D)', icon: Rocket,
      value: num(counts.toolRuns), note: `${trend >= 0 ? '+' : ''}${trend}% vs last week`,
      up: trend >= 0, color: '#059669', bg: '#ecfdf5',
    },
    {
      id: 'posts', label: 'POSTS PUBLISHED', icon: Cpu,
      value: num(counts.posts), note: 'Last 30 days',
      color: '#d97706', bg: '#fffbeb',
    },
    {
      id: 'orders', label: 'SMM ORDERS', icon: AlertCircle,
      value: num(counts.orders), note: `${num(counts.documents)} documents stored`,
      color: '#dc2626', bg: '#fef2f2',
    },
  ]), [overview, counts, trend, user]);

  return (
    <div>
      {/* Greeting */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <div className="page-sub">
            {isDemo
              ? 'Showing sample data - connect your accounts to replace it with live figures.'
              : 'Live snapshot of your workspace - every figure below comes from your own account data.'}
          </div>
        </div>
        <Link to="/billing/topup" className="btn btn-primary"><Wallet size={14} /> Add Funds</Link>
      </div>

      {/* 1. Metric cards */}
      <section className="stat-grid">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.id} className="stat-card">
              <div className="stat-icon" style={{ background: m.bg, color: m.color }}><Icon size={18} /></div>
              <div className="stat-label">{m.label}</div>
              <div className="stat-value">{loading ? '-' : m.value}</div>
              <div className="stat-change" style={m.up === undefined ? undefined : { color: m.up ? 'var(--success)' : 'var(--danger)' }}>
                {m.up === undefined ? null : (m.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />)} {m.note}
              </div>
            </div>
          );
        })}
      </section>

      {/* 2. Charts on real data */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 'var(--section)' }} className="dash-charts">
        <div className="card chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Activity - last 8 weeks</div>
              <div className="chart-sub">Tool runs vs. published posts</div>
            </div>
            <span className={`badge ${trend >= 0 ? 'badge-success' : 'badge-danger'}`}>{trend >= 0 ? '+' : ''}{trend}%</span>
          </div>
          {hasTraffic ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={traffic} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand-2)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={38} allowDecimals={false} />
                <RTooltip />
                <Area type="monotone" dataKey="visits" name="Tool runs" stroke="var(--brand-2)" strokeWidth={2} fill="url(#gVisits)" />
                <Area type="monotone" dataKey="engagement" name="Posts" stroke="var(--success)" strokeWidth={2} fill="url(#gEng)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label={loading ? 'Loading your activity…' : 'No activity recorded yet - run a tool or publish a post to see this chart.'} />}
        </div>

        <div className="card chart-card">
          <div className="chart-head">
            <div>
              <div className="chart-title">Spend by module</div>
              <div className="chart-sub">Share of wallet debits</div>
            </div>
          </div>
          {spend.length ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={spend} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="none">
                  {spend.map(s => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <RTooltip formatter={(v, n, p) => [`${v}% (${money(p?.payload?.amount)})`, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty label={loading ? 'Loading spend…' : 'No wallet spend recorded yet.'} />}
        </div>
      </section>

      <section className="card chart-card" style={{ marginBottom: 'var(--section)' }}>
        <div className="chart-head">
          <div>
            <div className="chart-title">Module usage - last 30 days</div>
            <div className="chart-sub">Actions you performed per module</div>
          </div>
        </div>
        {usage.length ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={usage} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={38} allowDecimals={false} />
              <RTooltip />
              <Bar dataKey="runs" name="Actions" fill="var(--brand-2)" radius={[6, 6, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmpty label={loading ? 'Loading usage…' : 'Nothing used yet in the last 30 days.'} />}
      </section>

      {/* 3. Launcher + activity */}
      <div className="dash-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="section-title">
            Module Launcher
            <span style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-ghost btn-icon btn-xs" aria-label="Grid view"
                style={viewMode === 'grid' ? { background: 'var(--brand-2)', color: '#fff' } : {}}
                onClick={() => setViewMode('grid')}><Grid size={14} /></button>
              <button type="button" className="btn btn-ghost btn-icon btn-xs" aria-label="List view"
                style={viewMode === 'list' ? { background: 'var(--brand-2)', color: '#fff' } : {}}
                onClick={() => setViewMode('list')}><List size={14} /></button>
            </span>
          </div>

          <div className={`stitch-mod-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {MODULES.map(m => {
              const Icon = m.icon;
              return (
                <Link key={m.id} to={m.to} className="stitch-mod-card">
                  <div className="stitch-mod-icon" style={{ background: m.bg, color: m.color }}><Icon size={18} /></div>
                  <div className="stitch-mod-title">{m.label}</div>
                  <div className="stitch-mod-status">Open module</div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside>
          <div className="card">
            <div className="section-title" style={{ marginBottom: 12 }}>
              Recent Activity
              <Link to="/social/settings" style={{ fontSize: 12, fontWeight: 700 }}>View all</Link>
            </div>

            {activity.length === 0 ? (
              <div className="chart-empty" style={{ minHeight: 120 }}>
                <Inbox size={20} />
                <div>{loading ? 'Loading activity…' : 'No activity yet. Actions you take will appear here.'}</div>
              </div>
            ) : activity.map((a, i) => (
              <div key={i} className="stitch-timeline-item">
                <div className="stitch-timeline-icon"><Activity size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="stitch-timeline-title">{a.title}</div>
                  <div className="stitch-timeline-desc">{a.module}</div>
                  <div className="stitch-timeline-time">{timeAgo(a.at)}</div>
                </div>
              </div>
            ))}

            <div className="protip-box" style={{ marginTop: 14 }}>
              <Zap size={16} color="var(--brand-2)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div className="protip-box-txt">Tip: connect a module to start populating these charts with your own data.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
