/**
 * BioLinks — admin console. Same shared pattern as pages/admin/index.jsx,
 * wired to the existing backend routes under /api/biolinks/admin/*.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { blAdminAPI } from '../../services/api';

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

export function BLAdminDashboard() {
  const { data, loading, error, reload } = useResource(async () => objOf(await blAdminAPI.getStats()));
  const s = data || {};
  const cards = [
    { label: 'Total links',    value: s.totalLinks ?? 0 },
    { label: 'Total users',    value: s.totalUsers ?? 0 },
    { label: 'Clicks (30d)',   value: s.recentClicks ?? s.clicks ?? 0 },
    { label: 'Revenue',        value: money(s.revenue ?? s.totalRevenue) },
  ];
  return (
    <Page title="BioLinks — overview" subtitle="Link platform health at a glance"
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

export function BLAdminUsers() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useResource(
    async () => listOf(await blAdminAPI.getUsers({ search: q || undefined, limit: 50 }), 'users'),
    [q],
  );
  const users = data || [];

  const toggle = async (u) => {
    try { await blAdminAPI.updateUserStatus(u._id, { isActive: !u.isActive }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this user.')); }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await blAdminAPI.deleteUser(u._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this user.')); }
  };

  return (
    <Page title="BioLinks — Users" subtitle={`${users.length} shown`}
          actions={
            <input className="input" placeholder="Search name or email…" defaultValue={q}
                   onKeyDown={e => { if (e.key === 'Enter') setQ(e.target.value.trim()); }}
                   style={{ minWidth: 240 }} />
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!users.length} emptyLabel="No users match this search.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Plan</th><th>Links</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{u.name || u.username || '-'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email}</div>
                  </td>
                  <td>{u.plan?.name || u.planId?.name || 'Free'}</td>
                  <td>{u.linksCount ?? '-'}</td>
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

export function BLAdminPlans() {
  const { data, loading, error, reload } = useResource(async () => listOf(await blAdminAPI.getPlans(), 'plans'));
  const plans = data || [];

  const remove = async (p) => {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    try { await blAdminAPI.deletePlan(p._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this plan.')); }
  };

  return (
    <Page title="BioLinks — Plans" subtitle="Subscription tiers and pricing">
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

/* ── Templates & Domains (one screen, two tables) ─────────────────────── */

export function BLAdminPages() {
  const { data: templates, loading: tLoading, error: tError, reload: tReload } =
    useResource(async () => listOf(await blAdminAPI.getTemplates(), 'templates'));
  const { data: domains, loading: dLoading, error: dError, reload: dReload } =
    useResource(async () => listOf(await blAdminAPI.getDomains(), 'domains'));

  const removeTemplate = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try { await blAdminAPI.deleteTemplate(t._id); tReload(); }
    catch (e) { alert(errText(e, 'Could not delete this template.')); }
  };
  const removeDomain = async (d) => {
    if (!window.confirm(`Remove domain "${d.domain}"?`)) return;
    try { await blAdminAPI.deleteDomain(d._id); dReload(); }
    catch (e) { alert(errText(e, 'Could not remove this domain.')); }
  };

  return (
    <Page title="BioLinks — Templates & Domains" subtitle="Manage page templates and custom domains">
      <div className="card-title" style={{ marginBottom: 10 }}>Templates</div>
      <Async loading={tLoading} error={tError} onRetry={tReload}
             empty={!(templates || []).length} emptyLabel="No templates yet.">
        <div className="table-wrap" style={{ marginBottom: 26 }}>
          <table>
            <thead><tr><th>Template</th><th>Category</th><th /></tr></thead>
            <tbody>
              {(templates || []).map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.category?.name || t.category || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => removeTemplate(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>

      <div className="card-title" style={{ marginBottom: 10 }}>Custom domains</div>
      <Async loading={dLoading} error={dError} onRetry={dReload}
             empty={!(domains || []).length} emptyLabel="No custom domains configured.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Domain</th><th>Owner</th><th>Status</th><th /></tr></thead>
            <tbody>
              {(domains || []).map(d => (
                <tr key={d._id}>
                  <td style={{ fontFamily: 'monospace' }}>{d.domain}</td>
                  <td>{d.user?.email || '-'}</td>
                  <td>
                    <span className={`badge ${d.verified ? 'badge-success' : 'badge-warning'}`}>
                      {d.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => removeDomain(d)}>Remove</button>
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

export function BLAdminSettings() {
  const { data, loading, error, reload } = useResource(async () => objOf(await blAdminAPI.getSettings()));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try { await blAdminAPI.updateSettings(form); reload(); }
    catch (e) { alert(errText(e, 'Could not save settings.')); }
    finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="BioLinks — Settings" subtitle="Platform-wide configuration"
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
                <span className="field-label">Default short-link domain</span>
                <input className="input" value={form.defaultDomain || ''} onChange={set('defaultDomain')} />
              </label>
              <label className="field">
                <span className="field-label">Default free-plan link limit</span>
                <input className="input" type="number" value={form.freeLinkLimit ?? ''} onChange={set('freeLinkLimit')} />
              </label>
            </div>
          </div>
        )}
      </Async>
    </Page>
  );
}

export default BLAdminDashboard;
