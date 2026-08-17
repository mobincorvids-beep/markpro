import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ticketsApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';

export default function TicketsPage() {
  const navigate = useNavigate();
  const [tickets,  setTickets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [form, setForm] = useState({ subject:'', message:'', priority:'medium' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ticketsApi.list().then(r => setTickets(r.data)).finally(() => setLoading(false));
  }, []);

  const createTicket = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const { data } = await ticketsApi.create(form);
      toast.success('Ticket opened');
      navigate(`/tickets/${data._id}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Support Tickets</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(p => !p)}>＋ New Ticket</button>
      </div>

      {showNew && (
        <div className="card mb-2">
          <div className="card-title">New Ticket</div>
          <form onSubmit={createTicket}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-control" required value={form.subject} onChange={e => setForm({...form, subject:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" value={form.priority} onChange={e => setForm({...form, priority:e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-control" rows={4} required value={form.message} onChange={e => setForm({...form, message:e.target.value})} />
            </div>
            <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Opening…' : 'Open Ticket'}</button>
          </form>
        </div>
      )}

      <div className="card">
        {tickets.length === 0 ? (
          <div className="empty-state"><div className="icon"></div><p>No tickets yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Status</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t._id}>
                    <td className="text-muted text-sm">#{t._id.slice(-6)}</td>
                    <td>{t.subject}</td>
                    <td><span className={`badge badge-${t.priority === 'high' ? 'error' : t.priority === 'medium' ? 'awaiting' : 'active'}`}>{t.priority}</span></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-muted text-sm">{new Date(t.updatedAt).toLocaleDateString()}</td>
                    <td><Link to={`/tickets/${t._id}`}><button className="btn btn-outline btn-xs">View</button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
