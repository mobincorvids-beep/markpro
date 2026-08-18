import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Megaphone, MousePointerClick, Eye, TrendingUp, ArrowRight, Plus, Zap } from 'lucide-react';

export default function DashboardHome() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['campaigns-brief'], queryFn: () => campaignAPI.list({ limit: 5 }) });
  const campaigns = data?.data?.data?.campaigns || [];
  const totalCampaigns = data?.data?.data?.pagination?.total || 0;

  const totalImpressions = campaigns.reduce((s, c) => s + (c.stats?.totalImpressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.stats?.totalClicks || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.stats?.totalConversions || 0), 0);

  const statCards = [
    { label: 'Campaigns', value: totalCampaigns, icon: Megaphone, color: 'var(--primary)' },
    { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'var(--info)' },
    { label: 'Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'var(--success)' },
    { label: 'Conversions', value: totalConversions.toLocaleString(), icon: TrendingUp, color: 'var(--warning)' },
  ];

  const planLimitCampaigns = user?.plan?.limits?.campaigns ?? 1;
  const usedCampaigns = user?.usage?.campaigns || 0;
  const usagePct = planLimitCampaigns === -1 ? 20 : Math.min((usedCampaigns / planLimitCampaigns) * 100, 100);

  return (
    <DashboardLayout title="Overview">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 3 }}>Here's an overview of your social proof activity.</p>
          </div>
          <Link to="/social/campaigns" className="btn btn-primary btn-sm"><Plus size={14} /> New Campaign</Link>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent campaigns */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 14 }}>Recent Campaigns</h3>
              <Link to="/social/campaigns" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>All <ArrowRight size={12} /></Link>
            </div>
            {campaigns.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {campaigns.map(c => (
                  <Link key={c._id} to={`/social/campaigns/${c._id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, textDecoration: 'none', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.domain}</div>
                    </div>
                    <span className={`badge ${c.isEnabled ? 'badge-success' : 'badge-gray'}`}>{c.isEnabled ? 'Active' : 'Paused'}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                <Megaphone size={32} style={{ marginBottom: 10, opacity: .2, display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 13 }}>No campaigns yet.</p>
                <Link to="/social/campaigns" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Create your first</Link>
              </div>
            )}
          </div>

          {/* Plan usage */}
          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>Plan Usage</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Campaigns</span>
                <span>{usedCampaigns} / {planLimitCampaigns === -1 ? '∞' : planLimitCampaigns}</span>
              </div>
              <div className="progress"><div className="progress-bar" style={{ width: `${usagePct}%`, background: 'var(--primary)' }} /></div>
            </div>
            {[
              { label: 'Notifications', used: user?.usage?.notifications || 0, limit: user?.plan?.limits?.notifications ?? 5 },
              { label: 'Domains', used: user?.usage?.domains || 0, limit: user?.plan?.limits?.domains ?? 1 },
            ].map(({ label, used, limit }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
                  <span>{label}</span>
                  <span>{used} / {limit === -1 ? '∞' : limit}</span>
                </div>
                <div className="progress"><div className="progress-bar" style={{ width: `${limit === -1 ? 20 : Math.min((used / limit) * 100, 100)}%`, background: 'var(--secondary)' }} /></div>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Current Plan</span>
                <span className="badge badge-primary">{user?.plan?.name || 'Free'}</span>
              </div>
              {!['pro', 'agency'].includes(user?.plan?.slug) && (
                <Link to="/pricing" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 4 }}>
                  <Zap size={12} /> Upgrade for more
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
