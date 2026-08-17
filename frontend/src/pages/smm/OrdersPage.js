// ─── OrdersPage ───────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { ordersApi } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination  from '../../components/ui/Pagination';

export function OrdersPage() {
  const [orders,  setOrders]  = useState([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [status,  setStatus]  = useState('');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  const load = (p = 1) => {
    setLoading(true);
    ordersApi.mine({ page: p, limit: 20, status: status || undefined, search: search || undefined })
      .then(r => { setOrders(r.data.orders); setTotal(r.data.total); setPages(r.data.pages); setPage(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [status]); // eslint-disable-line

  const STATUSES = ['','awaiting','pending','active','inprogress','completed','partial','canceled','refunded','error'];

  return (
    <div className="page">
      <div className="topbar">
        <h1>Orders <span className="text-muted text-sm">({total})</span></h1>
        <div className="topbar-actions">
          <input className="form-control" style={{ width: 180 }} placeholder="Search link…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && load(1)} />
          <select className="form-control" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        {loading ? <div className="loader"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Service</th><th>Link</th><th>Qty</th><th>Charge</th><th>Remains</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={8} style={{ textAlign:'center', padding:'2rem', color:'var(--text2)' }}>No orders found</td></tr>}
                {orders.map(o => (
                  <tr key={o._id}>
                    <td className="text-muted text-sm">#{o._id.slice(-6)}</td>
                    <td style={{ maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.serviceId?.name || '-'}</td>
                    <td style={{ maxWidth: 150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      <a href={o.link} target="_blank" rel="noreferrer" className="text-sm">{o.link}</a>
                    </td>
                    <td>{o.quantity?.toLocaleString()}</td>
                    <td>${o.charge?.toFixed(4)}</td>
                    <td>{o.remains?.toLocaleString()}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-muted text-sm">{new Date(o.createdAt).toLocaleDateString()}</td>
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

export default OrdersPage;
