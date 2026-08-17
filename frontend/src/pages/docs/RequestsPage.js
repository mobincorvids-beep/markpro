import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { FiPlus, FiX, FiCopy, FiTrash2, FiSend } from 'react-icons/fi';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ recipientEmail:'', recipientName:'', title:'', message:'', expiresInDays:7 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/docs/requests'); setRequests(data.requests); }
    catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/docs/requests', form);
      toast.success('Request sent!');
      setShowModal(false);
      setForm({ recipientEmail:'', recipientName:'', title:'', message:'', expiresInDays:7 });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const cancel = async id => {
    if (!window.confirm('Cancel this request?')) return;
    await api.delete(`/docs/requests/${id}`);
    toast.success('Request cancelled');
    load();
  };

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/request/${token}`);
    toast.success('Link copied!');
  };

  const statusBadge = s => ({
    pending:   <span className="badge badge-yellow">Pending</span>,
    fulfilled: <span className="badge badge-green">Fulfilled</span>,
    expired:   <span className="badge badge-gray">Expired</span>,
    cancelled: <span className="badge badge-red">Cancelled</span>,
  }[s] || s);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">File Requests</h1>
          <p className="text-muted text-sm mt-2">Request files from people outside your organization</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowModal(true)}><FiPlus size={14}/> New Request</button>
      </div>

      {loading ? <div className="spinner" /> : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">No file requests yet</div>
          <p className="text-muted">Create a request and share the link to collect files from anyone</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Recipient</th><th>Status</th><th>Sent</th><th>Expires</th><th></th></tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight:600 }}>{r.title}</td>
                  <td>{r.recipientName || r.recipientEmail}<br/><span className="text-muted text-sm">{r.recipientEmail}</span></td>
                  <td>{statusBadge(r.status)}</td>
                  <td className="text-muted text-sm">{formatDistanceToNow(new Date(r.createdAt),{addSuffix:true})}</td>
                  <td className="text-muted text-sm">{format(new Date(r.expiresAt),'PP')}</td>
                  <td>
                    <div className="flex gap-2">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn-icon" onClick={()=>copyLink(r.token)} title="Copy link"><FiCopy size={12}/></button>
                          <button className="btn-icon" onClick={()=>cancel(r._id)} title="Cancel"><FiTrash2 size={12}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">New File Request</h3>
              <button className="btn-icon" onClick={()=>setShowModal(false)}><FiX/></button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">What are you requesting?</label>
                  <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Signed Contract" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipient Email</label>
                    <input type="email" required value={form.recipientEmail} onChange={e=>setForm({...form,recipientEmail:e.target.value})} placeholder="client@example.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recipient Name</label>
                    <input value={form.recipientName} onChange={e=>setForm({...form,recipientName:e.target.value})} placeholder="Optional" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Add a note for the recipient…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires in (days)</label>
                  <input type="number" min={1} max={90} value={form.expiresInDays} onChange={e=>setForm({...form,expiresInDays:e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="inline-spin"/> : <FiSend size={13}/>} Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
