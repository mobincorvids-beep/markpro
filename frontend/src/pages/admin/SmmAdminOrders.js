import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination  from '../../components/ui/Pagination';

const STATUSES = ['','awaiting','pending','active','inprogress','processing','completed','partial','canceled','refunded','error'];

export default function AdminOrders() {
  const [orders,  setOrders]  = useState([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [status,  setStatus]  = useState('');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  const load = (p=1) => {
    setLoading(true);
    adminApi.orders({ page:p, limit:30, status:status||undefined, search:search||undefined })
      .then(r => { setOrders(r.data.orders); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(1); }, [status]); // eslint-disable-line

  const updateStatus = async (id, s) => {
    await adminApi.updateOrderStatus(id, s);
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status: s } : o));
    toast.success('Status updated');
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Orders <span className="text-muted text-sm">({total})</span></h1>
        <div className="topbar-actions">
          <input className="form-control" style={{ width:180 }} placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && load(1)} />
          <select className="form-control" style={{ width:'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>User</th><th>Service</th><th>Link</th><th>Qty</th><th>Charge</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No orders</td></tr>}
                {orders.map(o => (
                  <tr key={o._id}>
                    <td className="text-muted text-sm">#{o._id.slice(-6)}</td>
                    <td className="text-sm">{o.userId?.username}</td>
                    <td style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.serviceId?.name}</td>
                    <td style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      <a href={o.link} target="_blank" rel="noreferrer" className="text-sm">{o.link}</a>
                    </td>
                    <td>{o.quantity?.toLocaleString()}</td>
                    <td>${o.charge?.toFixed(4)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      <select className="form-control" style={{ padding:'0.2rem 0.4rem', fontSize:'0.75rem', width:'auto' }}
                        value={o.status} onChange={e => updateStatus(o._id, e.target.value)}>
                        {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pages={pages} onChange={load} />
          </div>
        )}
      </div>
    </div>
  );
}
