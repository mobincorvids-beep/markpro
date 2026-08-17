import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fundsApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);

  const load = () => {
    setLoading(true);
    fundsApi.adminPending()
      .then(r => setDeposits(r.data.deposits || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    if (!window.confirm('Credit this deposit to the user\'s balance? This cannot be undone.')) return;
    setBusyId(id);
    try {
      const { data } = await fundsApi.adminApprove(id);
      toast.success(data.message || 'Deposit approved');
      setDeposits(prev => prev.filter(d => d._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    finally { setBusyId(null); }
  };

  const reject = async (id) => {
    const note = window.prompt('Reason for rejecting (optional):') || '';
    setBusyId(id);
    try {
      await fundsApi.adminReject(id, { note });
      toast.success('Deposit rejected');
      setDeposits(prev => prev.filter(d => d._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Pending Deposits <span className="text-muted text-sm">({deposits.length})</span></h1>
      </div>
      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Method</th><th>Note</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {deposits.length === 0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No pending deposits — all caught up.</td></tr>}
                {deposits.map(d => (
                  <tr key={d._id}>
                    <td className="text-muted text-sm">{new Date(d.createdAt).toLocaleString()}</td>
                    <td className="text-sm">{d.userId?.username || '-'}<div className="text-muted text-sm">{d.userId?.email}</div></td>
                    <td style={{ color:'var(--accent2)', fontWeight:600 }}>${Number(d.amount).toFixed(2)}</td>
                    <td className="text-sm">{d.paymentMethod || 'manual'}</td>
                    <td className="text-muted text-sm" style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.note}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-success btn-xs" disabled={busyId===d._id} onClick={() => approve(d._id)}>Approve</button>
                        <button className="btn btn-danger btn-xs" disabled={busyId===d._id} onClick={() => reject(d._id)}>Reject</button>
                      </div>
                    </td>
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
