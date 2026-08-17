import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, transactionsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [txs,    setTxs]      = useState([]);
  const [stats,  setStats]    = useState({ total: 0, completed: 0, pending: 0, canceled: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersApi.mine({ page: 1, limit: 5 }),
      transactionsApi.list({ page: 1, limit: 5 }),
    ]).then(([oRes, tRes]) => {
      const all = oRes.data.orders || [];
      setOrders(all);
      setTxs(tRes.data.transactions || []);
      setStats({
        total:     oRes.data.total || 0,
        completed: all.filter(o => o.status === 'completed').length,
        pending:   all.filter(o => ['awaiting','pending','inprogress'].includes(o.status)).length,
        canceled:  all.filter(o => o.status === 'canceled').length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Welcome, {user?.username}</h1>
        <div className="topbar-actions">
          <Link to="/smm/new-order"><button className="btn btn-primary">＋ New Order</button></Link>
          <Link to="/smm/add-funds"><button className="btn btn-success">Add Funds</button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-2">
        {[
          { label: 'Balance',   value: `$${Number(user?.balance||0).toFixed(2)}`, color: 'var(--success)' },
          { label: 'Total Orders', value: stats.total, color: 'var(--accent2)' },
          { label: 'Completed', value: stats.completed, color: 'var(--success)' },
          { label: 'Pending',   value: stats.pending,   color: 'var(--warn)' },
        ].map(s => (
          <div className="card stat-card" key={s.label}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex justify-between items-center mb-1">
            <div className="card-title">Recent Orders</div>
            <Link to="/smm/orders" className="text-sm">View all →</Link>
          </div>
          {orders.length === 0 ? (
            <div className="text-muted text-sm">No orders yet. <Link to="/smm/new-order">Place your first order</Link></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Service</th><th>Charge</th><th>Status</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o._id}>
                      <td className="text-muted text-sm">#{o._id.slice(-6)}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.serviceId?.name || '-'}
                      </td>
                      <td>${o.charge?.toFixed(4)}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-1">
            <div className="card-title">Recent Transactions</div>
            <Link to="/smm/transactions" className="text-sm">View all →</Link>
          </div>
          {txs.length === 0 ? (
            <div className="text-muted text-sm">No transactions yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Amount</th><th>Note</th></tr></thead>
                <tbody>
                  {txs.map(t => (
                    <tr key={t._id}>
                      <td><StatusBadge status={t.type} /></td>
                      <td className={t.amount >= 0 ? 'text-success' : 'text-danger'}>
                        {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(4)}
                      </td>
                      <td className="text-muted text-sm" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.note}
                      </td>
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
