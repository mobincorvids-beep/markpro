import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, reportsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Trash2, ChevronLeft, Play, FileText, ExternalLink, Edit3, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

/* ── New Project Modal ───────────────────────────────────── */
function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', domain: '', url: '' });
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!form.url.startsWith('http')) form.url = 'https://' + form.url;
    setLoading(true);
    try {
      const { data } = await projectsAPI.create(form);
      toast.success('Project created!');
      onCreated(data.data);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 17 }}>New Project</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input className="form-input" placeholder="My Website" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Full URL <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(including https://)</span></label>
            <input className="form-input" placeholder="https://example.com" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value, domain: e.target.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '') }))} required />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><div className="spinner" /> Creating…</> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── PROJECTS LIST ───────────────────────────────────────── */
export function ProjectsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsAPI.list });
  const projects = data?.data?.data || [];

  const handleDelete = async id => {
    if (!window.confirm('Delete project and all its reports?')) return;
    try {
      await projectsAPI.remove(id);
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <DashboardLayout title="Projects">
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={() => qc.invalidateQueries({ queryKey: ['projects'] })} />}
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Projects</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> New Project</button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28 }} /></div>
        ) : projects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No projects yet. Create one to start tracking your SEO.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Create First Project</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{p.name}</h3>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ExternalLink size={10} />{p.domain}
                    </a>
                  </div>
                  {p.latestScore !== null && (
                    <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${p.latestScore >= 80 ? 'var(--success)' : p.latestScore >= 50 ? 'var(--warning)' : 'var(--error)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                      {p.latestScore}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {p.keywords?.length || 0} keywords · {p.competitors?.length || 0} competitors
                  {p.latestAuditAt && <> · Last audit: {format(new Date(p.latestAuditAt), 'MMM d')}</>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/rank/projects/${p._id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Open</Link>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(p._id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── PROJECT DETAIL ──────────────────────────────────────── */
export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [runningReport, setRunningReport] = useState(false);

  const { data: projData, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => projectsAPI.getOne(id) });
  const { data: repData } = useQuery({ queryKey: ['reports', id], queryFn: () => reportsAPI.list({ projectId: id, limit: 20 }) });

  const project = projData?.data?.data;
  const reports = repData?.data?.data?.reports || [];

  const handleRunAudit = async () => {
    setRunningReport(true);
    try {
      const { data } = await reportsAPI.run({ url: project.url, type: 'seo_audit', projectId: id });
      toast.success('SEO audit started!');
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const r = await reportsAPI.list({ projectId: id, limit: 1 });
          const latest = r?.data?.data?.reports?.[0];
          if (latest?.status === 'completed' || latest?.status === 'failed') {
            clearInterval(poll);
            qc.invalidateQueries({ queryKey: ['reports', id] });
            qc.invalidateQueries({ queryKey: ['project', id] });
            if (latest.status === 'completed') navigate(`/rank/reports/${latest._id}`);
          }
        } catch { clearInterval(poll); }
      }, 2500);
      setTimeout(() => clearInterval(poll), 60000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to run audit');
    } finally { setRunningReport(false); }
  };

  if (isLoading) return <DashboardLayout title="Project"><div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div></DashboardLayout>;
  if (!project) return <DashboardLayout title="Not Found"><p className="text-muted">Project not found.</p></DashboardLayout>;

  return (
    <DashboardLayout title={project.name}>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/rank/projects')} className="btn btn-ghost btn-sm btn-icon"><ChevronLeft size={16} /></button>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700 }}>{project.name}</h1>
              <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={10} />{project.domain}
              </a>
            </div>
          </div>
          <button onClick={handleRunAudit} className="btn btn-primary btn-sm" disabled={runningReport}>
            {runningReport ? <><div className="spinner" /> Running…</> : <><Play size={13} /> Run SEO Audit</>}
          </button>
        </div>

        {/* Score + stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
          {[
            ['Latest Score', project.latestScore ?? '-', project.latestScore >= 80 ? 'var(--success)' : project.latestScore >= 50 ? 'var(--warning)' : 'var(--error)'],
            ['Keywords', project.keywords?.length || 0, 'var(--primary)'],
            ['Competitors', project.competitors?.length || 0, 'var(--secondary)'],
            ['Reports', reports.length, 'var(--info)'],
          ].map(([l, v, c]) => (
            <div key={l} className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Reports history */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Report History</h3>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: .2 }} />
              <p style={{ fontSize: 13 }}>No reports yet. Run an SEO audit to get started.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Type</th><th>URL</th><th>Score</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{r.type.replace(/_/g, ' ')}</span></td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{r.url}</td>
                    <td style={{ fontWeight: 700, color: r.score >= 80 ? 'var(--success)' : r.score >= 50 ? 'var(--warning)' : r.score ? 'var(--error)' : 'var(--text-muted)' }}>{r.score ?? '-'}</td>
                    <td><span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'failed' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: 10 }}>{r.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '-'}</td>
                    <td><Link to={`/rank/reports/${r._id}`} className="btn btn-ghost btn-sm btn-icon" title="View"><Search size={13} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProjectsPage;
