import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ticketsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [ticket,  setTicket]  = useState(null);
  const [reply,   setReply]   = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    ticketsApi.get(id).then(r => setTicket(r.data)).catch(() => navigate('/tickets')).finally(() => setLoading(false));
  }, [id, navigate]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await ticketsApi.reply(id, { message: reply });
      setTicket(data); setReply('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSending(false); }
  };

  const closeTicket = async () => {
    const { data } = await ticketsApi.close(id);
    setTicket(data); toast.success('Ticket closed');
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  if (!ticket) return null;

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <h1>{ticket.subject}</h1>
          <div className="flex gap-1 mt-1 items-center">
            <StatusBadge status={ticket.status} />
            <span className="text-muted text-sm">#{ticket._id.slice(-6)}</span>
          </div>
        </div>
        {ticket.status !== 'closed' && (
          <button className="btn btn-outline btn-sm" onClick={closeTicket}>Close Ticket</button>
        )}
      </div>

      <div className="card mb-2" style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ticket.messages.map((msg, i) => {
          const isMe = msg.senderId === user?._id || msg.senderRole === 'user';
          return (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                background: isMe ? 'rgba(79,142,247,.15)' : 'var(--bg3)',
                border: `1px solid ${isMe ? 'rgba(79,142,247,.3)' : 'var(--border)'}`,
                borderRadius: 8, padding: '0.75rem 1rem',
                maxWidth: '75%', fontSize: '0.875rem', lineHeight: 1.6,
              }}>
                {msg.message}
              </div>
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                {msg.senderRole === 'admin' ? 'Support' : 'You'} · {new Date(msg.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== 'closed' && (
        <div className="card">
          <form onSubmit={sendReply}>
            <div className="form-group">
              <label className="form-label">Reply</label>
              <textarea className="form-control" rows={4} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write your reply…" />
            </div>
            <button className="btn btn-primary" disabled={sending || !reply.trim()}>
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
