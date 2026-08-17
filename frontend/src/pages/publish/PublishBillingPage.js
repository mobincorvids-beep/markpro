import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiCheck, FiZap } from 'react-icons/fi';

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [plans, setPlans] = useState([]);
  const [interval, setInterval_] = useState('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/publish/billing/plans', { params: { interval } }).then(r=>setPlans(r.data.plans)).catch(()=>{});
  }, [interval]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success')) { toast.success('Subscription activated!'); refreshUser(); }
    if (params.get('cancelled')) toast('Checkout cancelled', { icon: 'ℹ' });
  }, []);

  const subscribe = async (planId) => {
    setLoading(true);
    try {
      const { data } = await api.post('/publish/billing/plans/checkout', { planId });
      if (data.free) { toast.success(data.message); await refreshUser(); }
      else if (data.url) window.location.href = data.url;
    } catch (e) { toast.error(e.response?.data?.message || 'Checkout failed'); }
    finally { setLoading(false); }
  };

  const cancelSub = async () => {
    if (!window.confirm('Cancel your subscription? You will be downgraded to the free plan.')) return;
    try { await api.post('/publish/billing/plans/cancel'); toast.success('Subscription cancelled'); await refreshUser(); }
    catch { toast.error('Failed to cancel'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Billing & Plans</h1>
        <div className="flex gap-2">
          {['monthly','yearly','unlimited'].map(i=>(
            <button key={i} className={`btn btn-sm ${interval===i?'btn-indigo':'btn-secondary'}`} onClick={()=>setInterval_(i)}>{i.charAt(0).toUpperCase()+i.slice(1)}</button>
          ))}
        </div>
      </div>

      {user?.plan && (
        <div className="card card-body mb-4" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--accent-light)' }}>
          <div>
            <div className="text-muted text-sm">Current Plan</div>
            <div style={{ fontWeight:800, fontSize:18 }}>{user.plan.name}</div>
          </div>
          {user.plan.price > 0 && <button className="btn btn-secondary btn-sm" onClick={cancelSub}>Cancel Subscription</button>}
        </div>
      )}

      <div className="pricing-grid">
        {plans.map(p=>(
          <div key={p._id} className={`pricing-card ${p.isFeatured?'featured':''}`}>
            {p.isFeatured && <div className="badge badge-yellow mb-3">Most Popular</div>}
            <div style={{ fontWeight:800, fontSize:17 }}>{p.name}</div>
            <div className="pricing-price mt-2">${p.price}</div>
            <div className="pricing-interval mb-4">{p.interval === 'unlimited' ? 'one-time' : `per ${p.interval==='yearly'?'year':'month'}`}</div>
            {p.description && <p className="text-muted text-sm mb-4">{p.description}</p>}
            {[
              p.socialProfiles ? `${p.socialProfiles} social profiles` : 'Unlimited social profiles',
              p.socialPosts    ? `${p.socialPosts} posts/month` : 'Unlimited posts',
              p.wordTokens     ? `${p.wordTokens.toLocaleString()} AI words/month` : 'Unlimited AI words',
              p.imageTokens    ? `${p.imageTokens} AI images/month` : 'Unlimited AI images',
              p.webhookAccess ? 'Webhook access' : null,
              p.prebuiltTemplates ? 'Pre-built templates' : null,
            ].filter(Boolean).map((f,i)=>(
              <div key={i} className="flex items-center gap-2 text-sm mb-2"><FiCheck size={13} style={{color:'var(--green)'}}/> {f}</div>
            ))}
            <button className={`btn ${p.isFeatured?'btn-primary':'btn-secondary'} btn-block mt-4`} onClick={()=>subscribe(p._id)} disabled={loading || user?.plan?._id===p._id}>
              {loading ? <span className="inline-spin"/> : <FiZap size={13}/>}
              {user?.plan?._id===p._id ? 'Current Plan' : p.price===0 ? 'Activate Free Plan' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
