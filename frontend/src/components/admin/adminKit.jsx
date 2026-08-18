/**
 * Shared building blocks for every module's admin console. Extracted from
 * the original pattern in pages/admin/index.jsx so each module file only
 * needs to define its own screens, not this scaffolding.
 */
import React, { useCallback, useEffect, useState } from 'react';

export const listOf = (res, key) => {
  const b = res?.data ?? {};
  const d = b.data ?? b;
  return Array.isArray(d) ? d : (d?.[key] ?? b?.[key] ?? []);
};
export const objOf = (res) => (res?.data?.data ?? res?.data ?? {});
export const money = (n) => `$${Number(n || 0).toFixed(2)}`;
export const date  = (d) => (d ? new Date(d).toLocaleDateString() : '-');
export const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

export function Page({ title, subtitle, actions, children }) {
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

export function Async({ loading, error, empty, emptyLabel, children, onRetry }) {
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

export function useResource(fetcher, deps = []) {
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

/** Generic stat-card grid dashboard — used by modules whose only admin
 * surface is a stats endpoint (SiteSpy, Teleman, WhatsML, ZAM Nexus, SEO
 * Manager). Pass a fetcher and a list of {label, key, fmt} cards. */
export function StatsDashboard({ title, subtitle, fetcher, cards }) {
  const { data, loading, error, reload } = useResource(fetcher);
  const s = data || {};
  return (
    <Page title={title} subtitle={subtitle}
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {cards.map(c => (
            <div className="stat-card" key={c.label}>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
                {c.fmt ? c.fmt(s[c.key]) : (s[c.key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </Async>
    </Page>
  );
}
