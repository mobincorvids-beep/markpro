import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dashboardApi } from '../../services/api';

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  const CARDS = [
    { label: 'Total Contacts',    value: stats.totalContacts,   color: 'var(--accent2)',  icon: '' },
    { label: 'Leads',             value: stats.totalLeads,      color: 'var(--warn)',     icon: '' },
    { label: 'Customers',         value: stats.totalCustomers,  color: 'var(--success)',  icon: '' },
    { label: 'Live Chats',        value: stats.totalChats,      color: 'var(--wa-green)', icon: '' },
    { label: 'Unread Chats',      value: stats.unreadChats,     color: 'var(--danger)',   icon: '' },
    { label: 'Campaigns',         value: stats.totalCampaigns,  color: 'var(--accent2)',  icon: '' },
    { label: 'Active Campaigns',  value: stats.activeCampaigns, color: 'var(--warn)',     icon: '' },
    { label: 'Active Bots',       value: stats.activeBots,      color: 'var(--wa-green)', icon: '' },
    { label: "Today's Contacts",  value: stats.todayContacts,   color: 'var(--success)',  icon: '' },
    { label: "Today's Chats",     value: stats.todayChats,      color: 'var(--accent2)',  icon: '' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/campaigns/new"><button className="btn btn-green btn-sm">New Campaign</button></Link>
          <Link to="/contacts"><button className="btn btn-outline btn-sm">Contacts</button></Link>
        </div>
      </div>
      <div className="page-body">
        <div className="grid-5" style={{ marginBottom: '1.5rem' }}>
          {CARDS.map(c => (
            <div className="card stat-card" key={c.label}>
              <div className="stat-label">{c.icon} {c.label}</div>
              <div className="stat-value" style={{ color: c.color }}>{c.value ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="card card-body flex-1">
            <p className="text-muted text-sm">Quick links</p>
            <div className="flex gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
              {[
                ['/chat',       'Live Chat'],
                ['/campaigns/new', 'New Campaign'],
                ['/contacts',   'Import Contacts'],
                ['/bots',       'Manage Bots'],
                ['/templates',  'Templates'],
              ].map(([to, label]) => (
                <Link to={to} key={to}><button className="btn btn-outline btn-sm">{label}</button></Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
