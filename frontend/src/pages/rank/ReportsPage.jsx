import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportsAPI, toolsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ChevronLeft, Trash2, Play, CheckCircle, AlertTriangle, XCircle, Info, RefreshCw, Filter, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const REPORT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'seo_audit', label: 'SEO Audit' },
  { value: 'meta_tags', label: 'Meta Tags' },
  { value: 'page_speed', label: 'Page Speed' },
  { value: 'keyword_density', label: 'Keyword Density' },
  { value: 'broken_links', label: 'Broken Links' },
  { value: 'ssl_check', label: 'SSL Check' },
  { value: 'dns_lookup', label: 'DNS Lookup' },
  { value: 'whois', label: 'WHOIS' },
  { value: 'sitemap', label: 'Sitemap' },
  { value: 'robots_txt', label: 'Robots.txt' },
  { value: 'redirect_check', label: 'Redirect Check' },
  { value: 'social_preview', label: 'Social Preview' },
  { value: 'ip_lookup', label: 'IP Lookup' },
  { value: 'readability', label: 'Readability' },
];

/* ── Run Report Modal ───────────────────────────────────── */
function RunReportModal({ onClose, onStarted }) {
  const [form, setForm] = useState({ url: '', type: 'seo_audit' });
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const url = form.url.trim();
    if (!url) { toast.error('Please enter a URL'); return; }
    setLoading(true);
    const t = toast.loading('Running report… this can take up to a minute');
    try {
      const { data } = await reportsAPI.run({ ...form, url });
      toast.dismiss(t);
      if (data?.success === false) {
        toast.error(data.message || 'Report failed');
      } else {
        toast.success('Report completed!');
      }
      onStarted(data?.data?.reportId);
      onClose();
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.response?.data?.message || err.message || 'Failed to run report');
    }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 17 }}>Run New Report</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {REPORT_TYPES.filter(t => t.value).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">URL / Domain</label>
            <input className="form-input" placeholder="https://example.com" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} required />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><div className="spinner" /> Running…</> : <><Play size={13} /> Run Report</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── REPORTS LIST ───────────────────────────────────────── */
export function ReportsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', typeFilter, page],
    queryFn: () => reportsAPI.list({ type: typeFilter || undefined, page, limit: 20 }),
    keepPreviousData: true,
    // Keep polling while any report is still processing.
    refetchInterval: q => {
      const rows = q?.state?.data?.data?.data?.reports || [];
      return rows.some(r => r.status === 'running' || r.status === 'pending') ? 4000 : false;
    },
  });

  const reports = data?.data?.data?.reports || [];
  const pagination = data?.data?.data?.pagination || {};

  const handleDelete = async id => {
    if (!window.confirm('Delete this report?')) return;
    try { await reportsAPI.remove(id); qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Report deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <DashboardLayout title="Reports">
      {showNew && <RunReportModal onClose={() => setShowNew(false)} onStarted={id => { qc.invalidateQueries({ queryKey: ['reports'] }); if (id) navigate(`/rank/reports/${id}`); }} />}
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Reports</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>{pagination.total || 0} total reports</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Play size={14} /> New Report</button>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={13} color="var(--text-muted)" />
          <select className="form-select" style={{ width: 180 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 24px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 14, marginBottom: 14 }}>No reports yet. Run your first SEO report.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Play size={13} /> Run Report</button>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>URL</th><th>Type</th><th>Score</th><th>Issues</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Link to={`/rank/reports/${r._id}`} style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{r.url}</Link>
                    </td>
                    <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{r.type.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontWeight: 700, color: r.score >= 80 ? 'var(--success)' : r.score >= 50 ? 'var(--warning)' : r.score ? 'var(--error)' : 'var(--text-muted)' }}>{r.score ?? '-'}</td>
                    <td style={{ fontSize: 12 }}>
                      {r.summary?.failed > 0 && <span style={{ color: 'var(--error)', marginRight: 6 }}>{r.summary.failed}</span>}
                      {r.summary?.warnings > 0 && <span style={{ color: 'var(--warning)', marginRight: 6 }}>{r.summary.warnings}</span>}
                      {r.summary?.passed > 0 && <span style={{ color: 'var(--success)' }}>{r.summary.passed}</span>}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'running' ? 'badge-warning' : r.status === 'failed' ? 'badge-error' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {r.status === 'running' && <div className="spinner" style={{ width: 8, height: 8, marginRight: 4 }} />}
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(r._id)} title="Delete"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-outline btn-sm">Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── SEVERITY ICONS ─────────────────────────────────────── */
const SEV_ICON = { passed: <CheckCircle size={14} color="var(--success)" />, warning: <AlertTriangle size={14} color="var(--warning)" />, critical: <XCircle size={14} color="var(--error)" />, info: <Info size={14} color="var(--info)" /> };

/* ── SCORE RING ─────────────────────────────────────────── */
function ScoreRing({ score }) {
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--error)';
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="var(--border)" strokeWidth={7} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 45 45)" />
      <text x={45} y={45} textAnchor="middle" dy=".35em" fill={color} fontSize={18} fontWeight={700}>{score}</text>
    </svg>
  );
}

/* ── REPORT DETAIL ──────────────────────────────────────── */
export function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [polling, setPolling] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsAPI.getOne(id),
    refetchInterval: (data) => {
      const status = data?.data?.data?.status;
      return status === 'running' || status === 'pending' ? 2500 : false;
    },
  });

  const report = data?.data?.data;

  const handleDelete = async () => {
    if (!window.confirm('Delete this report?')) return;
    try { await reportsAPI.remove(id); navigate('/rank/reports'); toast.success('Report deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  if (isLoading) return <DashboardLayout title="Report"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div></DashboardLayout>;
  if (!report) return <DashboardLayout title="Not Found"><p className="text-muted">Report not found.</p></DashboardLayout>;

  const issues = report.issues || [];
  const shownIssues = filter === 'all' ? issues : issues.filter(i => i.severity === filter);
  const isRunning = ['pending', 'running'].includes(report.status);

  return (
    <DashboardLayout title="Report Detail">
      <div className="fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700 }}>{report.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h1>
              <a href={report.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={10} />{report.url}
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className={`badge ${report.status === 'completed' ? 'badge-success' : report.status === 'running' ? 'badge-warning' : report.status === 'failed' ? 'badge-error' : 'badge-gray'}`}>
              {isRunning && <div className="spinner" style={{ width: 8, height: 8, marginRight: 4 }} />}
              {report.status}
            </span>
            <button onClick={handleDelete} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>

        {isRunning && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 20 }}>
            <div className="spinner spinner-dark" style={{ width: 36, height: 36, margin: '0 auto 14px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Analysis in progress… This page will update automatically.</p>
          </div>
        )}

        {report.status === 'failed' && (
          <div className="card" style={{ borderColor: 'var(--error)', marginBottom: 20 }}>
            <p style={{ color: 'var(--error)' }}>Report failed: {report.errorMessage || 'Unknown error'}</p>
          </div>
        )}

        {report.status === 'completed' && report.results && (
          <>
            {/* SEO Audit layout */}
            {report.type === 'seo_audit' && (
              <>
                <div className="card" style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                    {report.score !== null && <ScoreRing score={report.score} />}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, flex: 1 }}>
                      {[['Passed', report.summary?.passed, 'var(--success)'], ['Warnings', report.summary?.warnings, 'var(--warning)'], ['Critical', report.summary?.failed, 'var(--error)'], ['Duration', `${((report.duration || 0) / 1000).toFixed(1)}s`, 'var(--info)']].map(([l, v, c]) => (
                        <div key={l} style={{ textAlign: 'center', padding: '10px', background: 'var(--bg)', borderRadius: 8 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {[['all', `All (${issues.length})`], ['critical', `Critical (${issues.filter(i => i.severity === 'critical').length})`], ['warning', `Warnings (${issues.filter(i => i.severity === 'warning').length})`], ['passed', `Passed (${issues.filter(i => i.severity === 'passed').length})`], ['info', 'Info']].map(([id, label]) => (
                      <button key={id} onClick={() => setFilter(id)} className={`btn btn-sm ${filter === id ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12 }}>{label}</button>
                    ))}
                  </div>
                  {shownIssues.map((issue, i) => (
                    <div key={i} className="issue-item">
                      {SEV_ICON[issue.severity]}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{issue.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: issue.recommendation ? 4 : 0 }}>{issue.description}</div>
                        {issue.recommendation && <div style={{ fontSize: 12, color: 'var(--primary)' }}>→ {issue.recommendation}</div>}
                        {issue.value && typeof issue.value === 'string' && issue.value.length < 200 && (
                          <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>{issue.value}</code>
                        )}
                      </div>
                      <span className={`badge ${issue.severity === 'critical' ? 'badge-error' : issue.severity === 'warning' ? 'badge-warning' : issue.severity === 'passed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 10, flexShrink: 0 }}>{issue.category}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Generic results fallback */}
            {report.type !== 'seo_audit' && (
              <div className="card">
                <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Results</h3>
                <pre className="code-block">{JSON.stringify(report.results, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;
