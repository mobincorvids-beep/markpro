import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, XCircle, CreditCard, Check } from 'lucide-react';

export default function PenBillingPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [verifyStatus, setVerifyStatus] = useState(null);

  useEffect(() => {
    Promise.all([penAPI.getPackages(), penAPI.getMyOrders()])
      .then(([pr, or]) => { setPackages(pr.data.data || []); setOrders(or.data.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const sessionId = params.get('session_id');
    if (sessionId) {
      penAPI.verifyPayment({ session_id: sessionId })
        .then(r => { setVerifyStatus(r.data.status === '1' ? 'success' : 'error'); refreshUser(); })
        .catch(() => setVerifyStatus('error'));
    }
  }, [params, refreshUser]);

  const handleCheckout = async (id) => {
    setCheckoutLoading(id);
    try {
      const { data } = await penAPI.checkout({ package_id: id });
      if (data.data?.checkout_url) window.location.href = data.data.checkout_url;
      else toast.error('Checkout failed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed.');
    } finally { setCheckoutLoading(''); }
  };

  if (verifyStatus) {
    return (
      <div className="empty-state" style={{ padding: '60px 0' }}>
        {verifyStatus === 'success' ? (
          <>
            <CheckCircle2 size={48} color="var(--success)" />
            <div className="empty-title">Payment Successful!</div>
            <div className="empty-sub">Your plan has been upgraded.</div>
          </>
        ) : (
          <>
            <XCircle size={48} color="var(--danger)" />
            <div className="empty-title">Verification Failed</div>
          </>
        )}
        <button className="btn btn-ai mt-4" onClick={() => navigate('/pen/billing')}>← Back to Billing</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Billing & Plans</div>
        <div className="page-sub">Choose a plan that fits your content generation needs</div>
      </div>

      {loading ? <div className="loading-overlay"><div className="spinner spinner-lg" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16, marginBottom: 32 }}>
            {packages.map(p => (
              <div key={p._id} className="card" style={{ padding: 22 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.package_name}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ai)', marginBottom: 14 }}>
                  ${p.price}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>/mo</span>
                </div>
                <div className="flex-col gap-2 mb-4">
                  {[
                    `${p.token_limit === -1 ? 'Unlimited' : p.token_limit?.toLocaleString()} words/tokens`,
                    `${p.image_limit === -1 ? 'Unlimited' : p.image_limit} images`,
                    `${p.audio_limit === -1 ? 'Unlimited' : p.audio_limit} audio generations`,
                    p.team_members ? `${p.team_members} team members` : null,
                  ].filter(Boolean).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check size={14} color="var(--success)" /> {f}
                    </div>
                  ))}
                </div>
                <button className="btn btn-ai w-full" disabled={checkoutLoading === p._id} onClick={() => handleCheckout(p._id)}>
                  {checkoutLoading === p._id ? 'Redirecting…' : <><CreditCard size={14} /> Subscribe</>}
                </button>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Order History</span></div>
            {orders.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 20px' }}><div className="empty-sub">No orders yet.</div></div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Package</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o._id}>
                        <td>{o.package_name || o.package_id?.package_name}</td>
                        <td>${o.amount}</td>
                        <td><span className={`badge ${o.status === 'paid' ? 'badge-success' : 'badge-default'}`}>{o.status}</span></td>
                        <td className="td-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
