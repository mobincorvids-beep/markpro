/**
 * Admin review queue for manually submitted JazzCash, EasyPaisa and bank
 * transfer top-ups. Approving credits the user wallet through the ledger on
 * the server, so a double click cannot double credit.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, Search } from 'lucide-react';
import { paymentsAPI } from '../../services/api';

const TABS = [
  { id: 'pending',  label: 'Pending',  icon: Clock },
  { id: 'approved', label: 'Approved', icon: CheckCircle2 },
  { id: 'rejected', label: 'Rejected', icon: XCircle },
];

export default function AdminLocalPayments() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await paymentsAPI.adminList({ status });
      setRows(res.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load payments.');
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, kind) => {
    let note = '';
    if (kind === 'reject') {
      note = window.prompt('Reason for rejection (shown to the user):', 'Transaction id could not be verified') || '';
      if (!note) return;
    }
    setActingId(id); setError(''); setNotice('');
    try {
      if (kind === 'approve') await paymentsAPI.approve(id);
      else await paymentsAPI.reject(id, { reason: note });
      setNotice(kind === 'approve' ? 'Payment approved and wallet credited.' : 'Payment rejected.');
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Action failed.');
    } finally { setActingId(''); }
  };

  const term = q.trim().toLowerCase();
  const visible = term
    ? rows.filter(r =>
        (r.transactionId || '').toLowerCase().includes(term) ||
        (r.senderName || '').toLowerCase().includes(term) ||
        (r.user?.email || '').toLowerCase().includes(term))
    : rows;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="card">
        <div className="card-header"style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card-title">Local payment review</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input className="form-input"style={{ paddingLeft: 30, height: 34, minWidth: 220 }}
                     placeholder="Search id, sender or email"value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="tab-group">
              {TABS.map(t => (
                <button key={t.id} className={`tab ${status === t.id ? 'active' : ''}`} onClick={() => setStatus(t.id)}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-body"style={{ padding: 0 }}>
          {error && <div className="auth-alert error"style={{ margin: 16 }}><AlertCircle /><span>{error}</span></div>}
          {notice && <div className="auth-alert success"style={{ margin: 16 }}><CheckCircle2 /><span>{notice}</span></div>}

          {loading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 48 }}>
              <Loader2 size={26} className="spin"color="var(--brand)" />
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>
              Nothing to show in this queue.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Submitted</th><th>User</th><th>Method</th><th>Amount</th>
                    <th>Transaction id</th><th>Sender</th>
                    {status === 'pending' && <th style={{ textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(p => (
                    <tr key={p._id}>
                      <td>{new Date(p.createdAt).toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.user?.name || 'User'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{p.user?.email}</div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{(p.method || '').replace('_', ' ')}</td>
                      <td style={{ fontWeight: 700 }}>{Number(p.amount).toLocaleString()} {p.currency}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.transactionId}</td>
                      <td>
                        <div>{p.senderName || '-'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{p.senderAccount || ''}</div>
                      </td>
                      {status === 'pending' && (
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn btn-primary btn-sm"disabled={actingId === p._id}
                                  onClick={() => act(p._id, 'approve')}>
                            {actingId === p._id ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />} Approve
                          </button>
                          <button className="btn btn-secondary btn-sm"style={{ marginLeft: 6 }}
                                  disabled={actingId === p._id} onClick={() => act(p._id, 'reject')}>
                            <XCircle size={13} /> Reject
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
