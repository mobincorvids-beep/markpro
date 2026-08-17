import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mailerAPI } from '../../services/api';

const STATUS_COLOR = { sent:'success', sending:'warning', failed:'danger', draft:'secondary', paused:'secondary', scheduled:'info' };

export default function MailerCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [typeFilter, setType]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    mailerAPI.getCampaigns({ limit: 100 })
      .then(r => setCampaigns(r.data.campaigns || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (id) => {
    if (!window.confirm('Send this campaign to all recipients now?')) return;
    try {
      await mailerAPI.sendCampaign(id);
      setCampaigns(c => c.map(x => x._id === id ? { ...x, status: 'sending' } : x));
      alert('Campaign sending started!');
    } catch (e) { alert(e?.response?.data?.message || 'Send failed'); }
  };

  const handlePause = async (id) => {
    await mailerAPI.pauseCampaign(id);
    setCampaigns(c => c.map(x => x._id === id ? { ...x, status: 'paused' } : x));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    await mailerAPI.deleteCampaign(id);
    setCampaigns(c => c.filter(x => x._id !== id));
  };

  const filtered = campaigns
    .filter(c => !filter || c.status === filter)
    .filter(c => !typeFilter || c.type === typeFilter);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Campaigns</h1>
        <div className="topbar-actions">
          <Link to="/mailer/campaigns/new"><button className="btn btn-primary">+ New Campaign</button></Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['', 'email', 'sms'].map(t => (
            <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : ''}`} onClick={() => setType(t)}>
              {t || 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <div className="empty-state">
            <div className="empty-icon"></div>
            <p>No campaigns found.</p>
            <Link to="/mailer/campaigns/new"><button className="btn btn-primary">Create Campaign</button></Link>
          </div>
        : <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th>Status</th>
                  <th>Total</th><th>Sent</th><th>Opened</th><th>Clicked</th>
                  <th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><span className="badge badge-secondary">{c.type}</span></td>
                    <td><span className={`badge badge-${STATUS_COLOR[c.status] || 'secondary'}`}>{c.status}</span></td>
                    <td>{c.stats?.total || 0}</td>
                    <td>{c.stats?.sent || 0}</td>
                    <td>{c.stats?.opened || 0}</td>
                    <td>{c.stats?.clicked || 0}</td>
                    <td style={{ fontSize: 11 }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['draft', 'scheduled', 'paused'].includes(c.status) && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleSend(c._id)}>Send</button>
                        )}
                        {c.status === 'sending' && (
                          <button className="btn btn-sm btn-warning" onClick={() => handlePause(c._id)}>Pause</button>
                        )}
                        {['draft', 'scheduled'].includes(c.status) && (
                          <button className="btn btn-sm" onClick={() => navigate(`/mailer/campaigns/${c._id}/edit`)}>Edit</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}
