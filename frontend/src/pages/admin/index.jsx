/**
 * Phase 1 - platform admin console (Stitch purple design system).
 *
 * Exports the four screens that App.js lazy-loads through the thin
 * AdminDashboard/AdminUsers/AdminPlans/AdminPayments re-export files.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

/* ── helpers ───────────────────────────────────────────────────────────── */

/** Reads a list out of any of the response shapes the API can return. */
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
      <div className="empty-title">Couldn’t load this</div>
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

/** Shared fetch-once hook so each screen handles loading/error identically. */
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

export function AdminDashboard() {
  const { data, loading, error, reload } = useResource(async () => {
    const res = await adminAPI.getStats().catch(() => adminAPI.getDashboard());
    return objOf(res);
  });

  const s = data || {};
  const cards = [
    { label: 'Total users',    value: s.totalUsers ?? s.users ?? 0 },
    { label: 'Active plans',   value: s.activeSubscriptions ?? s.activePlans ?? 0 },
    { label: 'Orders',         value: s.totalOrders ?? s.orders ?? 0 },
    { label: 'Revenue',        value: money(s.revenue ?? s.totalRevenue) },
  ];

  return (
    <Page title="Admin overview" subtitle="Platform health at a glance"
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

export function AdminUsers() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useResource(
    async () => listOf(await adminAPI.listUsers({ search: q || undefined, limit: 50 }), 'users'),
    [q],
  );
  const users = data || [];

  const toggle = async (u) => {
    try { await adminAPI.toggleStatus(u._id, { isActive: !u.isActive }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this user.')); }
  };

  return (
    <Page title="Users" subtitle={`${users.length} shown`}
          actions={
            <input className="input" placeholder="Search name or email…" defaultValue={q}
                   onKeyDown={e => { if (e.key === 'Enter') setQ(e.target.value.trim()); }}
                   style={{ minWidth: 240 }} />
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!users.length} emptyLabel="No users match this search.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name || u.username || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email}</div>
                  </td>
                  <td><span className="badge badge-default">{u.role || 'user'}</span></td>
                  <td>{u.plan?.name || u.planId?.name || 'Free'}</td>
                  <td>{date(u.createdAt)}</td>
                  <td>
                    <span className={`badge ${u.isActive === false ? 'badge-danger' : 'badge-success'}`}>
                      {u.isActive === false ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => toggle(u)}>
                      {u.isActive === false ? 'Reactivate' : 'Suspend'}
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

/* ── Plans ─────────────────────────────────────────────────────────────── */

export function AdminPlans() {
  const { data, loading, error, reload } = useResource(
    async () => listOf(await adminAPI.listPlans(), 'plans'),
  );
  const plans = data || [];

  return (
    <Page title="Plans" subtitle="Subscription tiers and pricing">
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
              <div style={{ marginTop: 12 }}>
                <span className={`badge ${p.isActive === false ? 'badge-default' : 'badge-brand'}`}>
                  {p.isActive === false ? 'Hidden' : 'Live'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Async>
    </Page>
  );
}

/* ── Payments ──────────────────────────────────────────────────────────── */

export function AdminPayments() {
  const { data, loading, error, reload } = useResource(
    async () => listOf(await adminAPI.listOrders({ limit: 50 }), 'orders'),
  );
  const rows = data || [];

  return (
    <Page title="Payments" subtitle="Most recent transactions"
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!rows.length} emptyLabel="No payments recorded yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.reference || r.orderId || r._id}</td>
                  <td>{r.user?.email || r.user?.name || '-'}</td>
                  <td>{money(r.amount ?? r.charge ?? r.total)}</td>
                  <td>
                    <span className={`badge ${
                      /paid|completed|succeeded/i.test(r.status) ? 'badge-success'
                        : /fail|cancel|refund/i.test(r.status)   ? 'badge-danger'
                        : 'badge-warning'}`}>{r.status || 'pending'}</span>
                  </td>
                  <td>{date(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

export default AdminDashboard;
