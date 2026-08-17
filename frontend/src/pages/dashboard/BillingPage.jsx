import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Check, Zap, CreditCard, ExternalLink, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function BillingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);

  const { data: plansData } = useQuery({ queryKey: ['plans'], queryFn: userAPI.getPlans });
  const plans = plansData?.data?.data || [];

  const { data: paymentsData } = useQuery({ queryKey: ['payments'], queryFn: userAPI.listPayments });
  const payments = paymentsData?.data?.data || [];

  const handleSubscribe = async plan => {
    if (plan.slug === 'free') return;
    setLoadingPlan(plan._id);
    try {
      const { data } = await userAPI.createCheckout(plan._id, billing);
      window.location.href = data.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout');
    } finally { setLoadingPlan(null); }
  };

  const openBillingPortal = async () => {
    try {
      const { data } = await userAPI.getBillingPortal();
      window.location.href = data.data.url;
    } catch { toast.error('Failed to open billing portal'); }
  };

  const currentPlanId = user?.plan?._id || user?.plan;
  const getPrice = p => billing === 'yearly' ? p.price?.yearly : p.price?.monthly;

  return (
    <DashboardLayout title="Billing">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Billing & Plans</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Current plan: <strong>{user?.plan?.name || 'Free'}</strong>
              {' · '}
              <span className={`badge ${user?.subscriptionStatus === 'active' ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                {user?.subscriptionStatus || 'inactive'}
              </span>
            </p>
          </div>
          {user?.stripeCustomerId && (
            <button className="btn btn-outline btn-sm" onClick={openBillingPortal}>
              <ExternalLink size={13} /> Manage Billing
            </button>
          )}
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 3 }}>
            <button onClick={() => setBilling('monthly')} className={`btn btn-sm ${billing === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}>Monthly</button>
            <button onClick={() => setBilling('yearly')} className={`btn btn-sm ${billing === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}>
              Yearly <span style={{ fontSize: 10, background: 'rgba(16,185,129,.2)', color: 'var(--success)', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 40 }}>
          {plans.map(plan => {
            const price = getPrice(plan);
            const isCurrent = currentPlanId?.toString() === plan._id?.toString();
            return (
              <div key={plan._id} style={{
                background: 'var(--bg-card)',
                border: `2px solid ${plan.isFeatured ? plan.color || 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 14, padding: 22, position: 'relative',
                boxShadow: plan.isFeatured ? `0 0 32px ${plan.color || 'var(--primary)'}28` : 'none',
              }}>
                {plan.isFeatured && (
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: plan.color || 'var(--primary)', color: '#fff', padding: '3px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Most Popular
                  </div>
                )}
                <div style={{ marginBottom: 18 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 36, fontWeight: 800 }}>${price}</span>
                    {price > 0 && <span className="text-muted" style={{ fontSize: 13 }}>/{billing === 'yearly' ? 'yr' : 'mo'}</span>}
                  </div>
                  {billing === 'yearly' && price > 0 && (
                    <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                      ${(plan.price?.monthly * 12 - plan.price?.yearly).toFixed(0)} saved/year
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {(plan.featureList || []).map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                      <Check size={13} color={plan.color || 'var(--primary)'} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>Current Plan</button>
                ) : plan.slug === 'free' ? (
                  <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>Free Plan</button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan._id}
                    className="btn btn-sm"
                    style={{ width: '100%', background: plan.color || 'var(--primary)', color: '#fff' }}>
                    {loadingPlan === plan._id ? <><div className="spinner" /> …</> : <><Zap size={12} /> Get {plan.name}</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment history */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={15} /> Payment History
          </h3>
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
                    <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-error' : 'badge-gray'}`}>{p.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
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
