/**
 * Wallet top-up over local Pakistani rails: JazzCash, EasyPaisa and bank
 * transfer. The user pays into the merchant account shown here, then submits
 * the transaction id. An admin approves it and the wallet is credited
 * atomically on the server (see controllers/payments/localPayments.controller).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet, Smartphone, Building2, CheckCircle2, AlertCircle, Clock,
  XCircle, Copy, Loader2,
} from 'lucide-react';
import { paymentsAPI } from '../../services/api';

const METHOD_ICONS = { jazzcash: Smartphone, easypaisa: Smartphone, bank_transfer: Building2 };
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const STATUS_STYLES = {
  pending:  { icon: Clock,        cls: 'badge-warning', label: 'Awaiting review' },
  approved: { icon: CheckCircle2, cls: 'badge-success', label: 'Approved' },
  rejected: { icon: XCircle,      cls: 'badge-danger',  label: 'Rejected' },
};

export default function LocalTopUpPage() {
  const [config, setConfig] = useState({ methods: [], min: 200, max: 500000, currency: 'PKR' });
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [txId, setTxId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, mine] = await Promise.all([paymentsAPI.methods(), paymentsAPI.mine()]);
      const c = cfg.data?.data || cfg.data;
      setConfig(c);
      if (c?.methods?.length) setMethod(m => m || c.methods[0].id);
      setHistory(mine.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not load payment options.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1600);
    } catch { /* clipboard blocked, the value is visible on screen anyway */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const value = Number(amount);
    if (!method) return setError('Choose a payment method.');
    if (!Number.isFinite(value) || value < config.min || value > config.max)
      return setError(`Amount must be between ${config.min} and ${config.max} ${config.currency}.`);
    if (txId.trim().length < 4) return setError('Enter the transaction id from your receipt.');

    setBusy(true);
    try {
      await paymentsAPI.create({
        method, amount: value, transactionId: txId.trim(),
        senderName: senderName.trim(), senderAccount: senderAccount.trim(),
      });
      setSuccess('Payment submitted. Your wallet is credited as soon as our team verifies the transaction, usually within a few hours.');
      setAmount(''); setTxId(''); setSenderName(''); setSenderAccount('');
      const mine = await paymentsAPI.mine();
      setHistory(mine.data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit the payment.');
    } finally { setBusy(false); }
  };

  const selected = config.methods.find(m => m.id === method);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <Loader2 size={28} className="spin"color="var(--brand)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 900 }}>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--brand-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Wallet size={26} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Add funds</h1>
            <p style={{ opacity: .85, fontSize: 13.5 }}>
              Pay with JazzCash, EasyPaisa or a direct bank transfer in {config.currency}.
            </p>
          </div>
        </div>
      </div>

      {!config.methods.length && (
        <div className="auth-alert error">
          <AlertCircle />
          <span>No local payment method is configured yet. An administrator needs to set the merchant account details in the backend environment.</span>
        </div>
      )}

      {config.methods.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">1. Send the money</div></div>
          <div className="card-body"style={{ display: 'grid', gap: 16 }}>
            <div className="pay-methods">
              {config.methods.map(m => {
                const Icon = METHOD_ICONS[m.id] || Wallet;
                return (
                  <button type="button"key={m.id} onClick={() => setMethod(m.id)}
                          className={`pay-method ${method === m.id ? 'selected' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Icon size={18} color="var(--brand)" />
                      <span className="pay-method-name">{m.label}</span>
                    </div>
                    <div className="pay-method-acc">{m.accountNumber}</div>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand-soft)', borderRadius: 'var(--r-lg)', padding: 16, display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{selected.instructions}</div>
                <Detail label="Account title"value={selected.accountTitle} onCopy={() => copy(selected.accountTitle, 'title')} copied={copied === 'title'} />
                <Detail label={selected.id === 'bank_transfer' ? 'IBAN' : 'Wallet number'} value={selected.accountNumber} onCopy={() => copy(selected.accountNumber, 'acc')} copied={copied === 'acc'} />
                {selected.bankName && <Detail label="Bank"value={selected.bankName} />}
              </div>
            )}
          </div>
        </div>
      )}

      {config.methods.length > 0 && (
        <form className="card"onSubmit={submit}>
          <div className="card-header"><div className="card-title">2. Confirm your payment</div></div>
          <div className="card-body"style={{ display: 'grid', gap: 16 }}>
            {error && <div className="auth-alert error"><AlertCircle /><span>{error}</span></div>}
            {success && <div className="auth-alert success"><CheckCircle2 /><span>{success}</span></div>}

            <div>
              <label className="form-label">Amount ({config.currency})</label>
              <div className="pay-amounts"style={{ marginBottom: 10 }}>
                {QUICK_AMOUNTS.map(a => (
                  <button type="button"key={a} className={`pay-chip ${Number(amount) === a ? 'selected' : ''}`}
                          onClick={() => setAmount(String(a))}>{a.toLocaleString()}</button>
                ))}
              </div>
              <input className="form-input"type="number"min={config.min} max={config.max}
                     placeholder={`Minimum ${config.min}`} value={amount}
                     onChange={e => setAmount(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              <div>
                <label className="form-label">Transaction id</label>
                <input className="form-input"placeholder="TID / TRX from your receipt"
                       value={txId} onChange={e => setTxId(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Sender name</label>
                <input className="form-input"placeholder="Name on the sending account"
                       value={senderName} onChange={e => setSenderName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Sender number or IBAN</label>
                <input className="form-input"placeholder="03xx xxxxxxx"
                       value={senderAccount} onChange={e => setSenderAccount(e.target.value)} />
              </div>
            </div>

            <button type="submit"className="btn btn-primary btn-lg"disabled={busy} style={{ justifySelf: 'start' }}>
              {busy ? 'Submitting...' : 'Submit payment for review'}
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header"><div className="card-title">Your top-ups</div></div>
        <div className="card-body"style={{ padding: 0 }}>
          {history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13.5 }}>
              No top-ups yet. Your submitted payments appear here with their review status.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Method</th><th>Amount</th><th>Transaction id</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {history.map(p => {
                    const s = STATUS_STYLES[p.status] || STATUS_STYLES.pending;
                    const Icon = s.icon;
                    return (
                      <tr key={p._id}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</td>
                        <td style={{ fontWeight: 700 }}>{p.amount.toLocaleString()} {p.currency}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.transactionId}</td>
                        <td>
                          <span className={`badge ${s.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Icon size={12} /> {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, onCopy, copied }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{value}</div>
      </div>
      {onCopy && (
        <button type="button"className="btn btn-secondary btn-sm"onClick={onCopy}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}
