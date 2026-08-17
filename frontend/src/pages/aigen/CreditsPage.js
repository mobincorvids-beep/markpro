import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { FiZap, FiCheck, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';

export default function Credits() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [packages, setPackages]   = useState([]);
  const [wallet, setWallet]       = useState([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [tab, setTab]             = useState('packages');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get('/ai/credits/packages').then(r => setPackages(r.data.packages)).catch(() => {});
    // Handle Stripe return
    const params = new URLSearchParams(location.search);
    if (params.get('success') && params.get('session_id')) {
      api.post('/ai/credits/verify-session', { sessionId: params.get('session_id') })
        .then(r => { if (r.data.paid) { toast.success('Credits added successfully!'); refreshUser(); } })
        .catch(() => {});
    }
    if (params.get('cancelled')) toast('Payment cancelled', { icon: 'ℹ' });
  }, []);

  useEffect(() => {
    if (tab === 'wallet') {
      api.get('/ai/credits/wallet').then(r => { setWallet(r.data.transactions); setWalletTotal(r.data.total); }).catch(() => {});
    }
  }, [tab]);

  const checkout = async (pkgId) => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/credits/checkout', { packageId: pkgId });
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Checkout failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Credits & Billing</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-light)', padding: '10px 18px', borderRadius: 10 }}>
          <FiZap style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent)' }}>{user?.credits?.toLocaleString() ?? 0}</span>
          <span className="text-muted">credits remaining</span>
        </div>
      </div>

      <div className="tab-bar" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 22 }}>
        {[['packages','Buy Credits'],['wallet','Transaction History']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '9px 18px', fontWeight: 700, fontSize: 13, background: 'none', border: 'none', borderBottom: `3px solid ${tab === k ? 'var(--accent)' : 'transparent'}`, color: tab === k ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', marginBottom: '-1px', transition: 'all .15s' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'packages' && (
        <>
          <p className="text-muted mb-4">Purchase credits to power your AI generations. Credits never expire.</p>
          {packages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"></div>
              <p>No credit packages configured yet. Add packages in Admin → Credits.</p>
            </div>
          ) : (
            <div className="pricing-grid">
              {packages.map(pkg => (
                <div key={pkg._id} className={`pricing-card ${pkg.isFeatured ? 'featured' : ''}`}>
                  {pkg.isFeatured && <div className="badge badge-purple" style={{ marginBottom: 12 }}>Most Popular</div>}
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{pkg.title}</div>
                  <div className="pricing-price">${pkg.price}</div>
                  <div className="pricing-credits mt-2 mb-4">{pkg.credits.toLocaleString()} credits</div>
                  {pkg.description && <p className="text-muted text-sm mb-4">{pkg.description}</p>}
                  {pkg.features?.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm mb-2">
                      <FiCheck size={13} style={{ color: 'var(--green)', flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                  <button className={`btn ${pkg.isFeatured ? 'btn-primary' : 'btn-secondary'} btn-block mt-4`}
                    onClick={() => checkout(pkg._id)} disabled={loading}>
                    {loading ? <span className="inline-spin" /> : <FiZap size={14} />}
                    Buy {pkg.credits.toLocaleString()} Credits
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'wallet' && (
        <>
          <p className="text-muted mb-4">{walletTotal} transactions</p>
          {wallet.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"></div><p>No transactions yet</p></div>
          ) : (
            <div className="card">
              <table className="data-table">
                <thead><tr><th>Type</th><th>Description</th><th>Credits</th><th>Date</th></tr></thead>
                <tbody>
                  {wallet.map(t => (
                    <tr key={t._id}>
                      <td>
                        {t.credits > 0
                          ? <span className="flex items-center gap-1 text-green text-sm"><FiArrowUpLeft size={12}/>Credit</span>
                          : <span className="flex items-center gap-1 text-sm" style={{ color:'var(--text-muted)' }}><FiArrowDownLeft size={12}/>Debit</span>}
                      </td>
                      <td className="text-sm">{t.description}</td>
                      <td style={{ fontWeight: 700, color: t.credits > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                        {t.credits > 0 ? '+' : ''}{t.credits}
                      </td>
                      <td className="text-muted text-sm">{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
