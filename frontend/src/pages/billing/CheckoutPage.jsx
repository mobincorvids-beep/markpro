/**
 * Checkout / Payment Gateway
 *
 * Presented after a user selects a paid plan at signup. Shows an order
 * summary (plan, price, tax, total), a payment-method selector and a
 * card / billing form.
 *
 * NOTE: this is the UI-only checkout. The submit handler shape below is the
 * exact place to wire Stripe, Paddle or the local payment gateway. Nothing
 * about the visual contract changes when that wiring lands.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard, Lock, ArrowLeft, ShieldCheck, CheckCircle2, Loader2,
  Wallet, Building2, Receipt,
} from 'lucide-react';
import { authAPI } from '../../services/api';

const FALLBACK_PLANS = {
  free:   { name: 'Free',   price: 0,   features: ['5 projects', 'Community support'] },
  pro:    { name: 'Pro',    price: 49,  features: ['Unlimited projects', 'Priority support', 'All 11 modules', 'Team seats (5)'] },
  agency: { name: 'Agency', price: 199, features: ['Everything in Pro', 'Unlimited seats', 'White-label reports', 'Dedicated success manager'] },
};

function PlanCard({ plan }) {
  return (
    <div className="checkout-plan-card">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div className="checkout-plan-name">{plan.name} Plan</div>
        <span className="badge badge-brand">Monthly</span>
      </div>
      <div className="checkout-plan-price">
        ${plan.price}<small> /month</small>
      </div>
      <ul style={{ listStyle:'none', margin:'16px 0 0', display:'grid', gap:8 }}>
        {(plan.features || []).map(f => (
          <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)' }}>
            <CheckCircle2 size={15} color="var(--brand)" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CheckoutPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const planId = search.get('plan') || 'pro';

  const [plan, setPlan] = useState(FALLBACK_PLANS[planId] || FALLBACK_PLANS.pro);
  const [method, setMethod] = useState('card');
  const [form, setForm] = useState({
    name: '', number: '', exp: '', cvc: '',
    country: 'United States', city: '', postal: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  // Try to pull the real plan from the API; fall back to static definitions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authAPI.getPlans();
        const list = data?.data || data?.plans || [];
        const found = Array.isArray(list) && list.find(p => (p._id || p.slug || p.name) === planId);
        if (!cancelled && found) {
          setPlan({
            name: found.name,
            price: Number(found.price ?? 0),
            features: found.features || FALLBACK_PLANS[planId]?.features || [],
          });
        }
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, [planId]);

  const tax = useMemo(() => +(plan.price * 0.08).toFixed(2), [plan.price]);
  const total = useMemo(() => +(plan.price + tax).toFixed(2), [plan.price, tax]);

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (method === 'card') {
      if (!form.name.trim())      return setErr('Enter the cardholder name.');
      if (form.number.replace(/\s/g, '').length < 12) return setErr('Enter a valid card number.');
      if (!/^\d{2}\/\d{2}$/.test(form.exp)) return setErr('Expiry must be MM/YY.');
      if (form.cvc.length < 3)    return setErr('Enter the card CVC.');
    }
    setBusy(true);
    try {
      // Wire real payment provider here. UI-only for now - simulate a call.
      await new Promise(r => setTimeout(r, 900));
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1600);
    } catch (e2) {
      setErr(e2?.message || 'Payment failed. Try again.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div style={{ maxWidth:520, margin:'80px auto', textAlign:'center' }}>
        <div style={{
          width:72, height:72, borderRadius:'50%', margin:'0 auto 20px',
          background:'var(--success-bg)', color:'var(--success)',
          display:'grid', placeItems:'center',
        }}>
          <CheckCircle2 size={40} />
        </div>
        <h1 style={{ fontSize:26, fontWeight:900, marginBottom:8 }}>Payment successful</h1>
        <p style={{ color:'var(--text-2)' }}>Welcome to MarkPro {plan.name}. Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxWidth:1100, margin:'0 auto 20px' }}>
        <Link to="/register" style={{
          display:'inline-flex', alignItems:'center', gap:6,
          fontSize:13, fontWeight:600, color:'var(--text-2)',
        }}>
          <ArrowLeft size={15}/> Back
        </Link>
        <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:'-.02em', marginTop:8 }}>Complete your purchase</h1>
        <p style={{ color:'var(--text-2)', marginTop:4 }}>Secure checkout · encrypted end-to-end</p>
      </div>

      <div className="checkout-wrap">
        {/* Left: payment form */}
        <form className="checkout-panel" onSubmit={submit} noValidate>
          <div className="checkout-h">Payment method</div>
          <div className="checkout-sub">Choose how you would like to pay for your {plan.name} plan.</div>

          <div className={`checkout-method ${method === 'card' ? 'selected' : ''}`} onClick={() => setMethod('card')} role="button" tabIndex={0}>
            <div className="checkout-method-icon"><CreditCard size={16}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>Credit or debit card</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>Visa · Mastercard · Amex</div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>Instant</div>
          </div>

          <div className={`checkout-method ${method === 'bank' ? 'selected' : ''}`} onClick={() => setMethod('bank')} role="button" tabIndex={0}>
            <div className="checkout-method-icon" style={{ background:'var(--seo)' }}><Building2 size={16}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>Bank transfer</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>ACH · SEPA · Wire</div>
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)' }}>1–3 days</div>
          </div>

          <div className={`checkout-method ${method === 'wallet' ? 'selected' : ''}`} onClick={() => setMethod('wallet')} role="button" tabIndex={0}>
            <div className="checkout-method-icon" style={{ background:'var(--social)' }}><Wallet size={16}/></div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>Wallet balance</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>Pay from your MarkPro balance</div>
            </div>
          </div>

          {err && (
            <div className="auth-alert error" style={{ marginTop:16 }}>
              <span>{err}</span>
            </div>
          )}

          {method === 'card' && (
            <div style={{ marginTop:22 }}>
              <div className="checkout-h" style={{ fontSize:14 }}>Card details</div>

              <div style={{ marginTop:14 }}>
                <label className="form-lbl">Cardholder name</label>
                <input className="form-inp" placeholder="Jane Doe" value={form.name} onChange={setField('name')}/>
              </div>

              <div style={{ marginTop:12 }}>
                <label className="form-lbl">Card number</label>
                <input className="form-inp" placeholder="1234 5678 9012 3456" inputMode="numeric" maxLength={19} value={form.number} onChange={setField('number')}/>
              </div>

              <div className="field-grid" style={{ marginTop:12 }}>
                <div>
                  <label className="form-lbl">Expiry (MM/YY)</label>
                  <input className="form-inp" placeholder="12/28" maxLength={5} value={form.exp} onChange={setField('exp')}/>
                </div>
                <div>
                  <label className="form-lbl">CVC</label>
                  <input className="form-inp" placeholder="123" inputMode="numeric" maxLength={4} value={form.cvc} onChange={setField('cvc')}/>
                </div>
              </div>

              <div className="checkout-h" style={{ fontSize:14, marginTop:22 }}>Billing address</div>
              <div className="field-grid" style={{ marginTop:14 }}>
                <div>
                  <label className="form-lbl">Country</label>
                  <input className="form-inp" value={form.country} onChange={setField('country')}/>
                </div>
                <div>
                  <label className="form-lbl">City</label>
                  <input className="form-inp" placeholder="San Francisco" value={form.city} onChange={setField('city')}/>
                </div>
                <div>
                  <label className="form-lbl">Postal code</label>
                  <input className="form-inp" placeholder="94103" value={form.postal} onChange={setField('postal')}/>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy} style={{ marginTop:26 }}>
            {busy
              ? <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><Loader2 size={17} className="spin"/> Processing…</span>
              : <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><Lock size={16}/> Pay ${total.toFixed(2)}</span>}
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, fontSize:12, color:'var(--text-3)', justifyContent:'center' }}>
            <ShieldCheck size={14}/> Secured by 256-bit TLS · PCI DSS Level 1
          </div>
        </form>

        {/* Right: order summary */}
        <div>
          <div className="checkout-panel">
            <div className="checkout-h" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Receipt size={16}/> Order summary
            </div>
            <div className="checkout-sub">Review your selection before payment.</div>

            <PlanCard plan={plan}/>

            <div className="checkout-row">
              <span className="checkout-row-lbl">Subtotal</span>
              <span className="checkout-row-val">${plan.price.toFixed(2)}</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row-lbl">Tax (est. 8%)</span>
              <span className="checkout-row-val">${tax.toFixed(2)}</span>
            </div>
            <div className="checkout-row">
              <span className="checkout-row-lbl" style={{ fontWeight:700, color:'var(--text)' }}>Total due today</span>
              <span className="checkout-total">${total.toFixed(2)}</span>
            </div>

            <div style={{ marginTop:16, fontSize:12, color:'var(--text-3)', lineHeight:1.5 }}>
              Billed monthly. Cancel any time from Settings → Billing.
              Applicable taxes calculated at final step.
            </div>
          </div>

          <div className="widget" style={{ marginTop:16 }}>
            <div className="widget-title" style={{ marginBottom:8 }}>
              <div className="widget-title-icon"><ShieldCheck size={14}/></div>
              14-day money-back guarantee
            </div>
            <div style={{ fontSize:12.5, color:'var(--text-2)', lineHeight:1.5 }}>
              Not satisfied? Get a full refund within 14 days. No questions asked.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
