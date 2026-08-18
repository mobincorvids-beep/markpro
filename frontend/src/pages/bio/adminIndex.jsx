/**
 * Bio Pages — admin console. Mirrors the shared pattern used by the
 * platform admin screens in pages/admin/index.jsx (Page/Async/useResource),
 * wired to the already-existing backend routes under /api/bio/admin/*.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { bioAdminAPI } from '../../services/api';

/* ── helpers ───────────────────────────────────────────────────────────── */
const listOf = (res, key) => {
  const b = res?.data ?? {};
  const d = b.data ?? b;
  return Array.isArray(d) ? d : (d?.[key] ?? b?.[key] ?? []);
};
const objOf = (res) => (res?.data?.data ?? res?.data ?? {});
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const date  = (d) => (d ? new Date(d).toLocaleDateString() : '-');
const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

function Page({ title, subtitle, actions, children }) {
  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-sub">{subtitle}</div>}
        </div>
        {actions && <div className="topbar-actions">{actions}</div>}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Async({ loading, error, empty, emptyLabel, children, onRetry }) {
  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (error) return (
    <div className="empty-state">
      <div className="empty-title">Couldn't load this</div>
      <div className="empty-sub">{error}</div>
      {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
  if (empty) return (
    <div className="empty-state">
      <div className="empty-title">Nothing here yet</div>
      <div className="empty-sub">{emptyLabel}</div>
    </div>
  );
  return children;
}

function useResource(fetcher, deps = []) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const run = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fetcher()); }
    catch (e) { setError(errText(e, 'Request failed.')); }
    finally { setLoading(false); }
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { data, loading, error, reload: run };
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */

export function BioAdminDashboard() {
  const { data, loading, error, reload } = useResource(async () => objOf(await bioAdminAPI.getAnalytics()));
  const s = data || {};
  const cards = [
    { label: 'Total pages',    value: s.totalCampaigns ?? s.totalPages ?? 0 },
    { label: 'Active users',   value: s.totalUsers ?? s.users ?? 0 },
    { label: 'Page views',     value: s.totalViews ?? s.views ?? 0 },
    { label: 'Revenue',        value: money(s.revenue ?? s.totalRevenue) },
  ];
  return (
    <Page title="Bio Pages — overview" subtitle="Bio page platform health at a glance"
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {cards.map(c => (
            <div className="stat-card" key={c.label}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{c.value}</div>
            </div>
          ))}
        </div>
      </Async>
    </Page>
  );
}

/* ── Users ─────────────────────────────────────────────────────────────── */

export function BioAdminUsers() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useResource(
    async () => listOf(await bioAdminAPI.getUsers({ search: q || undefined, limit: 50 }), 'users'),
    [q],
  );
  const users = data || [];

  const toggle = async (u) => {
    try { await bioAdminAPI.updateUserStatus({ id: u._id, isActive: !u.isActive }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this user.')); }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await bioAdminAPI.deleteUser(u._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this user.')); }
  };

  return (
    <Page title="Bio Pages — Users" subtitle={`${users.length} shown`}
          actions={
            <input className="input" placeholder="Search name or email…" defaultValue={q}
                   onKeyDown={e => { if (e.key === 'Enter') setQ(e.target.value.trim()); }}
                   style={{ minWidth: 240 }} />
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!users.length} emptyLabel="No users match this search.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Plan</th><th>Pages</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name || u.username || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email}</div>
                  </td>
                  <td>{u.plan?.name || u.planId?.name || 'Free'}</td>
                  <td>{u.campaignsCount ?? u.pagesCount ?? '-'}</td>
                  <td>{date(u.createdAt)}</td>
                  <td>
                    <span className={`badge ${u.isActive === false ? 'badge-danger' : 'badge-success'}`}>
                      {u.isActive === false ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => toggle(u)}>
                      {u.isActive === false ? 'Reactivate' : 'Suspend'}
                    </button>{' '}
                    <button className="btn btn-secondary btn-xs" onClick={() => remove(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

/* ── Plans ─────────────────────────────────────────────────────────────── */

export function BioAdminPlans() {
  const { data, loading, error, reload } = useResource(async () => listOf(await bioAdminAPI.getPlans(), 'plans'));
  const plans = data || [];

  const toggle = async (p) => {
    try { await bioAdminAPI.updatePlanStatus({ id: p._id, isActive: !(p.isActive !== false) }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this plan.')); }
  };

  return (
    <Page title="Bio Pages — Plans" subtitle="Subscription tiers and pricing">
      <Async loading={loading} error={error} onRetry={reload}
             empty={!plans.length} emptyLabel="No plans have been created yet.">
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
          {plans.map(p => (
            <div className="card" key={p._id}>
              <div className="card-title">{p.name}</div>
              <div style={{ fontSize: 28, fontWeight: 900, margin: '8px 0' }}>
                {money(p.price)}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>
                  /{p.interval || p.billingCycle || 'month'}
                </span>
              </div>
              {!!(p.features || []).length && (
                <ul style={{ fontSize: 13, color: 'var(--text-2)', paddingLeft: 18, margin: '8px 0 0' }}>
                  {p.features.slice(0, 6).map((f, i) => <li key={i}>{typeof f === 'string' ? f : f.label}</li>)}
                </ul>
              )}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${p.isActive === false ? 'badge-default' : 'badge-brand'}`}>
                  {p.isActive === false ? 'Hidden' : 'Live'}
                </span>
                <button className="btn btn-secondary btn-xs" onClick={() => toggle(p)}>
                  {p.isActive === false ? 'Publish' : 'Hide'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Async>
    </Page>
  );
}

/* ── Templates ─────────────────────────────────────────────────────────── */

export function BioAdminTemplates() {
  const { data, loading, error, reload } = useResource(async () => listOf(await bioAdminAPI.getTemplates(), 'templates'));
  const templates = data || [];

  const toggle = async (t) => {
    try { await bioAdminAPI.updateTemplateStatus({ id: t._id, isActive: !(t.isActive !== false) }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this template.')); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try { await bioAdminAPI.deleteTemplate(t._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this template.')); }
  };

  return (
    <Page title="Bio Pages — Templates" subtitle={`${templates.length} templates`}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!templates.length} emptyLabel="No templates yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Template</th><th>Category</th><th>Status</th><th /></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.category?.name || t.category || '-'}</td>
                  <td>
                    <span className={`badge ${t.isActive === false ? 'badge-default' : 'badge-success'}`}>
                      {t.isActive === false ? 'Hidden' : 'Live'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => toggle(t)}>
                      {t.isActive === false ? 'Publish' : 'Hide'}
                    </button>{' '}
                    <button className="btn btn-secondary btn-xs" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

/* ── Coupons ───────────────────────────────────────────────────────────── */

export function BioAdminCoupons() {
  const { data, loading, error, reload } = useResource(async () => listOf(await bioAdminAPI.getCoupons(), 'coupons'));
  const coupons = data || [];

  const toggle = async (c) => {
    try { await bioAdminAPI.updateCouponStatus({ id: c._id, isActive: !(c.isActive !== false) }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this coupon.')); }
  };

  return (
    <Page title="Bio Pages — Coupons" subtitle={`${coupons.length} coupons`}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!coupons.length} emptyLabel="No coupons yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Expires</th><th>Status</th><th /></tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c._id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                  <td>{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td>
                  <td>{date(c.expiresAt)}</td>
                  <td>
                    <span className={`badge ${c.isActive === false ? 'badge-default' : 'badge-success'}`}>
                      {c.isActive === false ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => toggle(c)}>
                      {c.isActive === false ? 'Enable' : 'Disable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

/* ── Pending payments ──────────────────────────────────────────────────── */

export function BioAdminPayments() {
  const { data, loading, error, reload } = useResource(async () => listOf(await bioAdminAPI.getPendingPayments(), 'payments'));
  const rows = data || [];

  const setStatus = async (p, status) => {
    try { await bioAdminAPI.updatePaymentStatus({ id: p._id, status }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this payment.')); }
  };

  return (
    <Page title="Bio Pages — Pending payments" subtitle={`${rows.length} awaiting review`}
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!rows.length} emptyLabel="No payments awaiting review.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Date</th><th /></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.reference || r._id}</td>
                  <td>{r.user?.email || r.user?.name || '-'}</td>
                  <td>{money(r.amount)}</td>
                  <td>{date(r.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => setStatus(r, 'approved')}>Approve</button>{' '}
                    <button className="btn btn-secondary btn-xs" onClick={() => setStatus(r, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

export function BioAdminSettings() {
  const { data, loading, error, reload } = useResource(async () => objOf(await bioAdminAPI.getSettings()));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try { await bioAdminAPI.updateSettings(form); reload(); }
    catch (e) { alert(errText(e, 'Could not save settings.')); }
    finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="Bio Pages — Settings" subtitle="Platform-wide configuration"
          actions={<button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>}>
      <Async loading={loading} error={error} onRetry={reload}>
        {form && (
          <div className="card" style={{ maxWidth: 520 }}>
            <div className="card-body" style={{ display: 'grid', gap: 14 }}>
              <label className="field">
                <span className="field-label">Platform name</span>
                <input className="input" value={form.siteName || ''} onChange={set('siteName')} />
              </label>
              <label className="field">
                <span className="field-label">Support email</span>
                <input className="input" value={form.supportEmail || ''} onChange={set('supportEmail')} />
              </label>
              <label className="field">
                <span className="field-label">Default free-plan page limit</span>
                <input className="input" type="number" value={form.freePageLimit ?? ''} onChange={set('freePageLimit')} />
              </label>
            </div>
          </div>
        )}
      </Async>
    </Page>
  );
}

export default BioAdminDashboard;
