import React, { useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Universal renderer for SEO / dev tool results.
 *
 * Design rule: EVERY shape renders as real UI. There is no "this doesn't fit a
 * standard layout" escape hatch any more — unknown objects are rendered
 * recursively as labelled sections, unknown arrays as tables or pill lists,
 * and only code-ish payloads (JSON-LD, XML, robots.txt, raw WHOIS) are shown
 * in a code block, on purpose, with a copy button.
 */

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isPrimitive = (v) => v === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof v);

const HIDDEN_KEYS = new Set(['success', '__v', '_id']);

const humanize = (k) =>
  String(k)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Keys whose string value should be shown as preformatted code. */
const CODE_KEYS = /^(result|raw|xml|html|jsonLd|json_ld|code|source|robots|robotsTxt|sitemap|snippet|markup|output)$/i;
const looksLikeCode = (v) =>
  typeof v === 'string' && (v.includes('\n') || /^\s*[<{[]/.test(v)) && v.length > 40;

/* ─────────────────────────── primitives ─────────────────────────── */

function CopyButton({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-secondary btn-sm"
      style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch { /* clipboard blocked */ }
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ value }) {
  return (
    <div style={{ position: 'relative' }}>
      <CopyButton value={value} />
      <pre
        className="code-block"
        style={{
          margin: 0, padding: '14px 16px', paddingRight: 90, borderRadius: 10,
          background: 'var(--surface-2, rgba(127,127,127,.08))', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6,
          maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      >
        {value}
      </pre>
    </div>
  );
}

function Value({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: 'var(--text-3)' }}>—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: value ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)', fontWeight: 600 }}>
        {value ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{value ? 'Yes' : 'No'}
      </span>
    );
  }
  const str = String(value);
  if (/^https?:\/\//i.test(str)) {
    return (
      <a href={str} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {str.length > 90 ? str.slice(0, 90) + '…' : str} <ExternalLink size={12} />
      </a>
    );
  }
  return <span style={{ wordBreak: 'break-word' }}>{str}</span>;
}

function Metric({ label, value, tone }) {
  const color = tone === 'good' ? 'var(--success, #16a34a)'
    : tone === 'warn' ? 'var(--warning, #d97706)'
    : tone === 'bad' ? 'var(--danger, #dc2626)'
    : 'var(--text)';
  return (
    <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface, transparent)', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function ScoreRing({ score, label = 'Score', size = 84 }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const color = pct >= 90 ? 'var(--success, #16a34a)' : pct >= 50 ? 'var(--warning, #d97706)' : 'var(--danger, #dc2626)';
  const r = size / 2 - 8, c = 2 * Math.PI * r, cx = size / 2;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border, #e5e7eb)" strokeWidth="7" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`} />
        <text x={cx} y={cx + 6} textAnchor="middle" fontSize={size / 4} fontWeight="800" fill="var(--text)">{pct}</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────── collections ─────────────────────────── */

function PillList({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map((item, i) => (
        <span key={i} className="badge badge-seo" style={{ fontSize: 12.5, padding: '6px 12px' }}>{String(item)}</span>
      ))}
    </div>
  );
}

function Table({ rows }) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => !HIDDEN_KEYS.has(k));
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap', background: 'var(--surface-2, rgba(127,127,127,.05))' }}>
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)' }}>
              {cols.map((c) => {
                const v = row[c];
                return (
                  <td key={c} style={{ padding: '10px 14px', color: 'var(--text)', verticalAlign: 'top', maxWidth: 360 }}>
                    {isPrimitive(v) ? <Value value={v} /> : <Node value={v} depth={3} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArrayView({ items, depth }) {
  if (!items.length) return <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No entries.</div>;
  if (items.every(isPrimitive)) {
    const longText = items.some((i) => typeof i === 'string' && i.length > 60);
    if (longText) {
      return (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {items.map((i, k) => <li key={k} style={{ fontSize: 13, color: 'var(--text)' }}><Value value={i} /></li>)}
        </ul>
      );
    }
    return <PillList items={items} />;
  }
  if (items.every(isPlainObject)) {
    const flat = items.every((o) => Object.values(o).every((v) => isPrimitive(v) || (Array.isArray(v) && v.every(isPrimitive))));
    if (flat) return <Table rows={items.map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])))} />;
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((o, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>#{i + 1}</div>
            <ObjectView data={o} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((v, i) => <Node key={i} value={v} depth={depth + 1} />)}
    </div>
  );
}

function Collapsible({ title, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'var(--surface-2, rgba(127,127,127,.05))', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 13.5, fontWeight: 700, textAlign: 'left' }}
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {title}
        {count != null && <span className="badge" style={{ marginLeft: 'auto', fontSize: 11 }}>{count}</span>}
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}

/** One value of any type, rendered without ever bailing out to raw JSON. */
function Node({ value, depth = 0, fieldKey }) {
  if (isPrimitive(value)) {
    if (typeof value === 'string' && (CODE_KEYS.test(fieldKey || '') || looksLikeCode(value))) {
      return <CodeBlock value={value} />;
    }
    return <Value value={value} />;
  }
  if (Array.isArray(value)) return <ArrayView items={value} depth={depth} />;
  return <ObjectView data={value} depth={depth} />;
}

/** Object -> a key/value strip for scalars plus a section per nested field. */
function ObjectView({ data, depth = 0 }) {
  const entries = Object.entries(data).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v !== undefined);
  const scalars = entries.filter(([k, v]) => isPrimitive(v) && !CODE_KEYS.test(k) && !looksLikeCode(v));
  const complex = entries.filter(([k, v]) => !scalars.some(([sk]) => sk === k));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {scalars.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '2px 16px' }}>
          {scalars.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>{humanize(k)}</span>
              <span style={{ fontSize: 13.5, color: 'var(--text)', textAlign: 'right', minWidth: 0 }}><Value value={v} /></span>
            </div>
          ))}
        </div>
      )}

      {complex.map(([k, v]) => {
        const size = Array.isArray(v) ? v.length : isPlainObject(v) ? Object.keys(v).length : null;
        const big = Array.isArray(v) ? v.length > 12 : false;
        const body = <Node value={v} depth={depth + 1} fieldKey={k} />;
        if (depth >= 1 && !big) {
          return (
            <div key={k}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{humanize(k)}</div>
              {body}
            </div>
          );
        }
        return (
          <Collapsible key={k} title={humanize(k)} count={size} defaultOpen={!big}>
            {body}
          </Collapsible>
        );
      })}
    </div>
  );
}

/* ─────────────────────── specialised headers ─────────────────────── */

const CWV_RATING = {
  lcp: [2500, 4000], fcp: [1800, 3000], cls: [0.1, 0.25], tbt: [200, 600], inp: [200, 500], si: [3400, 5800], tti: [3800, 7300],
};
const rateMetric = (key, raw) => {
  const bounds = CWV_RATING[key];
  if (!bounds || raw == null) return undefined;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.]/g, '')) * (/s$/i.test(String(raw)) && !/ms/i.test(String(raw)) ? 1000 : 1);
  if (!Number.isFinite(n)) return undefined;
  const v = key === 'cls' ? (typeof raw === 'number' ? raw : parseFloat(raw)) : n;
  return v <= bounds[0] ? 'good' : v <= bounds[1] ? 'warn' : 'bad';
};

function PageSpeedHeader({ data }) {
  const scores = data.scores || {};
  const metrics = data.metrics || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          {data.url} · {data.strategy || 'mobile'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, justifyContent: 'space-around' }}>
          {Object.entries(scores).map(([k, v]) => <ScoreRing key={k} score={v} label={humanize(k)} />)}
        </div>
      </div>
      {Object.keys(metrics).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 10 }}>Core Web Vitals</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            {Object.entries(metrics).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <Metric key={k} label={k.toUpperCase()} value={String(v)} tone={rateMetric(k, v)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SslHeader({ data }) {
  const days = Number(data.daysLeft);
  const tone = !data.valid ? 'bad' : days < 15 ? 'bad' : days < 30 ? 'warn' : 'good';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
      <Metric label="Certificate" value={data.valid ? 'Valid' : 'Invalid'} tone={data.valid ? 'good' : 'bad'} />
      <Metric label="Expires in" value={Number.isFinite(days) ? `${days} days` : '—'} tone={tone} />
      <Metric label="Issued by" value={data.issuer?.O || data.issuer?.CN || '—'} />
      <Metric label="Host" value={data.host || data.domain || '—'} />
    </div>
  );
}

function ScoreChecksHeader({ data }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
      <ScoreRing score={data.score} label="Overall" size={96} />
      <div>
        {data.url && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{data.url}</div>}
        {data.passed != null && data.totalChecks != null && (
          <div style={{ fontSize: 15, fontWeight: 700 }}>{data.passed} / {data.totalChecks} checks passed</div>
        )}
        {data.grade && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{data.grade}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────────── entry ───────────────────────────── */

export default function SeoResultView({ result }) {
  if (result == null) return null;

  // Unwrap { success, data } / { success, ...fields } envelopes.
  let data = result;
  if (isPlainObject(result) && (isPlainObject(result.data) || Array.isArray(result.data))) data = result.data;

  if (isPrimitive(data)) return <Node value={data} />;
  if (Array.isArray(data)) return <ArrayView items={data} depth={0} />;

  const rest = Object.fromEntries(Object.entries(data).filter(([k]) => !HIDDEN_KEYS.has(k)));

  // Specialised headers, then the rest of the payload rendered generically so
  // nothing is ever dropped.
  let header = null;
  let omit = [];

  if (isPlainObject(data.scores) && ('metrics' in data || 'strategy' in data)) {
    header = <PageSpeedHeader data={data} />;
    omit = ['scores', 'metrics', 'url', 'strategy'];
  } else if ('daysLeft' in data && ('issuer' in data || 'subject' in data)) {
    header = <SslHeader data={data} />;
    omit = ['daysLeft', 'valid', 'host', 'domain'];
  } else if (typeof data.score === 'number' && (data.totalChecks != null || data.grade != null || isPlainObject(data.checks))) {
    header = <ScoreChecksHeader data={data} />;
    omit = ['score', 'passed', 'totalChecks', 'grade', 'url'];
  }

  const body = Object.fromEntries(Object.entries(rest).filter(([k]) => !omit.includes(k)));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {header}
      {Object.keys(body).length > 0 && <ObjectView data={body} depth={0} />}
    </div>
  );
}
