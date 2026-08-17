import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mailerAPI } from '../../services/api';

export default function MailerDashboard() {
  const [stats, setStats]   = useState({});
  const [camps, setCamps]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([mailerAPI.getAnalytics(), mailerAPI.getCampaigns({ limit: 5 })])
      .then(([sRes, cRes]) => {
        setStats(sRes.data.stats || {});
        setCamps(cRes.data.campaigns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const STAT_BOXES = [
    ['Campaigns', stats.totalCampaigns || 0, 'var(--brand)'],
    ['Emails Sent', stats.totalSent || 0, '#10b981'],
    ['Opened', stats.totalOpened || 0, '#f59e0b'],
    ['Contacts', stats.contactCount || 0, '#3b82f6'],
  ];

  const STATUS_COLOR = { sent: 'success', sending: 'warning', failed: 'danger', draft: 'secondary', paused: 'secondary' };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Mailer</h1>
        <div className="topbar-actions">
          <Link to="/mailer/campaigns/new"><button className="btn btn-primary">+ New Campaign</button></Link>
        </div>
      </div>

      <div className="grid-4 mb-2">
        {STAT_BOXES.map(([label, val, color]) => (
          <div key={label} className="card stat-card">
            <div className="label">{label}</div>
            <div className="value" style={{ color }}>{val.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-1">Recent Campaigns</div>
          {camps.length === 0
            ? <p className="text-muted text-sm">No campaigns yet. <Link to="/mailer/campaigns/new">Create one →</Link></p>
            : <table className="table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Sent</th></tr></thead>
                <tbody>
                  {camps.map(c => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td><span className="badge badge-secondary">{c.type}</span></td>
                      <td><span className={`badge badge-${STATUS_COLOR[c.status] || 'secondary'}`}>{c.status}</span></td>
                      <td>{c.stats?.sent || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>

        <div className="card">
          <div className="card-title mb-1">Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Campaigns', '/mailer/campaigns'],
              ['Contacts', '/mailer/contacts'],
              ['Groups', '/mailer/groups'],
              ['Templates', '/mailer/templates'],
              ['Analytics', '/mailer/analytics'],
              ['Settings', '/mailer/settings'],
            ].map(([label, to]) => (
              <Link key={to} to={to}>
                <button className="btn w-full" style={{ textAlign: 'left' }}>{label}</button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
