import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { billingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Check, Zap, ExternalLink, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function BillingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);

  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: billingAPI.getPlans });
  const plans = plansData?.data?.data || [];

  const { data: paymentsData } = useQuery({ queryKey: ['payments'], queryFn: billingAPI.listPayments });
  const payments = paymentsData?.data?.data || [];

  const handleSubscribe = async plan => {
    if (plan.slug === 'free') return;
    setLoadingPlan(plan._id);
    try {
      const { data } = await billingAPI.createCheckout(plan._id, billing);
      window.location.href = data.data.url;
    } catch (err) { toast.error(err.response?.data?.message || 'Checkout failed'); }
    finally { setLoadingPlan(null); }
  };

  const openPortal = async () => {
    try { const { data } = await billingAPI.getBillingPortal(); window.location.href = data.data.url; }
    catch { toast.error('Could not open billing portal'); }
  };

  const getPrice = p => billing === 'yearly' ? p.price?.yearly : p.price?.monthly;
  const isCurrent = p => user?.plan?._id?.toString() === p._id?.toString();

  return (
    <DashboardLayout title="Billing">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Billing & Plans</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Current plan: <strong>{user?.plan?.name || 'Free'}</strong> ·{' '}
              <span className={`badge ${user?.subscriptionStatus === 'active' ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: 10 }}>{user?.subscriptionStatus || 'inactive'}</span>
            </p>
          </div>
          {user?.stripeCustomerId && (
            <button className="btn btn-outline btn-sm" onClick={openPortal}><ExternalLink size={13} /> Manage Billing</button>
          )}
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 3 }}>
            <button onClick={() => setBilling('monthly')} className={`btn btn-sm ${billing === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}>Monthly</button>
            <button onClick={() => setBilling('yearly')} className={`btn btn-sm ${billing === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}>
              Yearly <span style={{ fontSize: 10, background: 'rgba(16,185,129,.2)', color: 'var(--success)', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 36 }}>
          {plans.map(plan => {
            const price = getPrice(plan);
            const current = isCurrent(plan);
            return (
              <div key={plan._id} style={{ background: 'var(--bg-card)', border: `2px solid ${plan.isFeatured ? plan.color || 'var(--primary)' : 'var(--border)'}`, borderRadius: 14, padding: 22, position: 'relative', boxShadow: plan.isFeatured ? `0 0 32px ${plan.color || 'var(--primary)'}25` : 'none' }}>
                {plan.isFeatured && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: plan.color || 'var(--primary)', color: '#fff', padding: '2px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Most Popular</div>}
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 16 }}>
                  <span style={{ fontSize: 34, fontWeight: 800 }}>${price}</span>
                  {price > 0 && <span className="text-muted" style={{ fontSize: 12 }}>/{billing === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {(plan.featureList || []).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                      <Check size={12} color={plan.color || 'var(--primary)'} style={{ marginTop: 1, flexShrink: 0 }} />{f}
                    </div>
                  ))}
                </div>
                {current ? (
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>Current Plan</button>
                ) : (
                  <button onClick={() => handleSubscribe(plan)} disabled={loadingPlan === plan._id}
                    className="btn btn-sm" style={{ width: '100%', background: plan.color || 'var(--primary)', color: '#fff' }}>
                    {loadingPlan === plan._id ? <><div className="spinner" /> …</> : plan.slug === 'free' ? 'Downgrade' : <><Zap size={12} /> Get {plan.name}</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment history */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Receipt size={15} /> Payment History</h3>
          {payments.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>No payments yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 500 }}>{p.plan?.name || '-'}</td>
                    <td>${p.amount} {p.currency}</td>
                    <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-error' : 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
