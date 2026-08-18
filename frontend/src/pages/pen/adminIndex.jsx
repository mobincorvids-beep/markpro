/**
 * Pen AI — admin console. Same shared pattern as pages/admin/index.jsx,
 * wired to the existing backend routes under /api/pen/admin/*. This module
 * previously had no frontend admin screen at all despite a full backend.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { penAdminAPI } from '../../services/api';

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

export function PenAdminDashboard() {
  const { data, loading, error, reload } = useResource(async () => objOf(await penAdminAPI.getStats()));
  const s = data || {};
  const cards = [
    { label: 'Total users',       value: s.totalUsers ?? 0 },
    { label: 'Generations (30d)', value: s.recentGenerations ?? s.generations ?? 0 },
    { label: 'Orders',            value: s.totalOrders ?? s.orders ?? 0 },
    { label: 'Revenue',           value: money(s.revenue ?? s.totalRevenue) },
  ];
  return (
    <Page title="Pen AI — overview" subtitle="Content generation platform health at a glance"
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

export function PenAdminUsers() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useResource(
    async () => listOf(await penAdminAPI.getUsers({ search: q || undefined, limit: 50 }), 'users'),
    [q],
  );
  const users = data || [];

  const toggle = async (u) => {
    try { await penAdminAPI.updateUserStatus(u._id, { isActive: !u.isActive }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this user.')); }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await penAdminAPI.deleteUser(u._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this user.')); }
  };
  const grantCredits = async (u) => {
    const amt = window.prompt(`Add credits for ${u.email}:`, '100');
    if (!amt || isNaN(+amt)) return;
    try { await penAdminAPI.addCredits(u._id, { amount: +amt }); reload(); }
    catch (e) { alert(errText(e, 'Could not add credits.')); }
  };

  return (
    <Page title="Pen AI — Users" subtitle={`${users.length} shown`}
          actions={
            <input className="input" placeholder="Search name or email…" defaultValue={q}
                   onKeyDown={e => { if (e.key === 'Enter') setQ(e.target.value.trim()); }}
                   style={{ minWidth: 240 }} />
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!users.length} emptyLabel="No users match this search.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Package</th><th>Credits</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name || u.username || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email}</div>
                  </td>
                  <td>{u.package?.name || u.packageId?.name || 'Free'}</td>
                  <td>{u.credits ?? 0}</td>
                  <td>{date(u.createdAt)}</td>
                  <td>
                    <span className={`badge ${u.isActive === false ? 'badge-danger' : 'badge-success'}`}>
                      {u.isActive === false ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => grantCredits(u)}>+Credits</button>{' '}
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

/* ── Packages (credit plans) ──────────────────────────────────────────── */

export function PenAdminPackages() {
  const { data, loading, error, reload } = useResource(async () => listOf(await penAdminAPI.getPackages(), 'packages'));
  const packages = data || [];

  const remove = async (p) => {
    if (!window.confirm(`Delete package "${p.name}"?`)) return;
    try { await penAdminAPI.deletePackage(p._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this package.')); }
  };

  return (
    <Page title="Pen AI — Packages" subtitle="Credit bundles and pricing">
      <Async loading={loading} error={error} onRetry={reload}
             empty={!packages.length} emptyLabel="No packages have been created yet.">
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {packages.map(p => (
            <div className="card" key={p._id}>
              <div className="card-title">{p.name}</div>
              <div style={{ fontSize: 26, fontWeight: 900, margin: '8px 0' }}>{money(p.price)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{p.credits ?? 0} credits</div>
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button className="btn btn-secondary btn-xs" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Async>
    </Page>
  );
}

/* ── Groups & Templates (content library) ─────────────────────────────── */

export function PenAdminTemplates() {
  const { data: groups, loading: gLoading, error: gError, reload: gReload } =
    useResource(async () => listOf(await penAdminAPI.getGroups(), 'groups'));
  const { data: templates, loading: tLoading, error: tError, reload: tReload } =
    useResource(async () => listOf(await penAdminAPI.getTemplates(), 'templates'));

  const removeGroup = async (g) => {
    if (!window.confirm(`Delete group "${g.name}"?`)) return;
    try { await penAdminAPI.deleteGroup(g._id); gReload(); }
    catch (e) { alert(errText(e, 'Could not delete this group.')); }
  };
  const removeTemplate = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try { await penAdminAPI.deleteTemplate(t._id); tReload(); }
    catch (e) { alert(errText(e, 'Could not delete this template.')); }
  };

  return (
    <Page title="Pen AI — Groups & Templates" subtitle="Manage the content-generation template library">
      <div className="card-title" style={{ marginBottom: 10 }}>Groups</div>
      <Async loading={gLoading} error={gError} onRetry={gReload}
             empty={!(groups || []).length} emptyLabel="No groups yet.">
        <div className="table-wrap" style={{ marginBottom: 26 }}>
          <table>
            <thead><tr><th>Group</th><th /></tr></thead>
            <tbody>
              {(groups || []).map(g => (
                <tr key={g._id}>
                  <td style={{ fontWeight: 700 }}>{g.name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => removeGroup(g)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      <div className="card-title" style={{ marginBottom: 10 }}>Templates</div>
      <Async loading={tLoading} error={tError} onRetry={tReload}
             empty={!(templates || []).length} emptyLabel="No templates yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Template</th><th>Group</th><th /></tr></thead>
            <tbody>
              {(templates || []).map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.group?.name || t.groupId?.name || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => removeTemplate(t)}>Delete</button>
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

/* ── Orders ────────────────────────────────────────────────────────────── */

export function PenAdminOrders() {
  const { data, loading, error, reload } = useResource(async () => listOf(await penAdminAPI.getOrders({ limit: 50 }), 'orders'));
  const rows = data || [];

  return (
    <Page title="Pen AI — Orders" subtitle="Most recent credit purchases"
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!rows.length} emptyLabel="No orders recorded yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reference</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.reference || r.orderId || r._id}</td>
                  <td>{r.user?.email || r.user?.name || '-'}</td>
                  <td>{money(r.amount ?? r.total)}</td>
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

/* ── Settings ──────────────────────────────────────────────────────────── */

export function PenAdminSettings() {
  const { data, loading, error, reload } = useResource(async () => objOf(await penAdminAPI.getSettings()));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try { await penAdminAPI.updateSettings(form); reload(); }
    catch (e) { alert(errText(e, 'Could not save settings.')); }
    finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="Pen AI — Settings" subtitle="Platform-wide configuration"
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
                <span className="field-label">Default free-plan credits</span>
                <input className="input" type="number" value={form.freeCredits ?? ''} onChange={set('freeCredits')} />
              </label>
              <label className="field">
                <span className="field-label">AI model provider key name</span>
                <input className="input" value={form.providerKeyName || ''} onChange={set('providerKeyName')} />
              </label>
            </div>
          </div>
        )}
      </Async>
    </Page>
  );
}

export default PenAdminDashboard;
