import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  const CARDS = [
    { label: 'Total Users',    value: stats.totalUsers,    color: 'var(--accent2)' },
    { label: 'Total Orders',   value: stats.totalOrders,   color: 'var(--accent2)' },
    { label: 'Pending Orders', value: stats.pendingOrders, color: 'var(--warn)' },
    { label: 'Total Revenue',  value: `$${stats.totalRevenue?.toFixed(2)||0}`, color: 'var(--success)' },
    { label: "Today's Orders", value: stats.todayOrders,   color: 'var(--accent2)' },
    { label: "Today's Revenue",value: `$${stats.todayRevenue?.toFixed(2)||0}`, color: 'var(--success)' },
    { label: 'Open Tickets',   value: stats.openTickets,   color: 'var(--warn)' },
  ];

  return (
    <div className="page">
      <div className="topbar"><h1>Admin Dashboard</h1></div>
      <div className="grid-4 mb-2">
        {CARDS.map(c => (
          <div className="card stat-card" key={c.label}>
            <div className="label">{c.label}</div>
            <div className="value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
