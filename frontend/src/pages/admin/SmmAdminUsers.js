import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api';
import Pagination from '../../components/ui/Pagination';

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [adjModal, setAdjModal] = useState(null); // { userId, username }
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote,   setAdjNote]   = useState('');

  const load = (p=1) => {
    setLoading(true);
    adminApi.users({ page:p, limit:30, search:search||undefined })
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, []); // eslint-disable-line

  const adjustBalance = async () => {
    if (!adjAmount) return;
    try {
      const { data } = await adminApi.adjustBalance(adjModal.userId, { amount: parseFloat(adjAmount), note: adjNote });
      setUsers(prev => prev.map(u => u._id === adjModal.userId ? { ...u, balance: data.newBalance } : u));
      toast.success('Balance updated');
      setAdjModal(null); setAdjAmount(''); setAdjNote('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleStatus = async (id, current) => {
    const s = current === 1 ? 0 : 1;
    await adminApi.updateUserStatus(id, s);
    setUsers(prev => prev.map(u => u._id === id ? { ...u, status: s } : u));
    toast.success(s === 1 ? 'User activated' : 'User banned');
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Users <span className="text-muted text-sm">({total})</span></h1>
        <div className="topbar-actions">
          <input className="form-control" style={{ width:200 }} placeholder="Search email/username…"
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && load(1)} />
          <button className="btn btn-outline" onClick={() => load(1)}>Search</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Username</th><th>Email</th><th>Balance</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No users</td></tr>}
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td className="text-muted text-sm">{u.email}</td>
                    <td style={{ color:'var(--success)', fontWeight:600 }}>${Number(u.balance).toFixed(4)}</td>
                    <td><span className={`badge ${u.status === 1 ? 'badge-completed' : 'badge-canceled'}`}>{u.status === 1 ? 'Active' : 'Banned'}</span></td>
                    <td className="text-muted text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-outline btn-xs" onClick={() => setAdjModal({ userId: u._id, username: u.username })}>Adjust Balance</button>
                        <button className={`btn btn-xs ${u.status === 1 ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(u._id, u.status)}>
                          {u.status === 1 ? 'Ban' : 'Unban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pages={pages} onChange={load} />
          </div>
        )}
      </div>

      {/* Balance adjust modal */}
      {adjModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="card" style={{ width:360 }}>
            <div className="card-title">Adjust Balance - @{adjModal.username}</div>
            <div className="form-group">
              <label className="form-label">Amount (positive=add, negative=deduct)</label>
              <input className="form-control" type="number" step="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-control" value={adjNote} onChange={e => setAdjNote(e.target.value)} />
            </div>
            <div className="flex gap-1">
              <button className="btn btn-primary" onClick={adjustBalance}>Apply</button>
              <button className="btn btn-ghost" onClick={() => setAdjModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
