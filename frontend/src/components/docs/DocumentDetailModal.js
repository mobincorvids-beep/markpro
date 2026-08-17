import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { formatBytes, getFileIcon, canPreview, DOCUMENT_TYPES } from '../../utils/fileUtils';
import {
  FiX, FiDownload, FiShare2, FiStar, FiTrash2, FiUploadCloud,
  FiMessageSquare, FiClock, FiEdit2, FiSave, FiRotateCcw, FiCheck,
} from 'react-icons/fi';

export default function DocumentDetailModal({ docId, onClose, onUpdated, onDeleted, onShare }) {
  const [doc, setDoc]   = useState(null);
  const [tab, setTab]   = useState('preview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [comment, setComment] = useState('');
  const [auditLogs, setAuditLogs] = useState(null);
  const versionInputRef = useRef();

  useEffect(() => { load(); }, [docId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/docs/documents/${docId}`);
      setDoc(data.document);
      setForm({
        name: data.document.name, description: data.document.description,
        documentType: data.document.documentType, tags: (data.document.tags||[]).join(', '),
        expiryDate: data.document.expiryDate?.slice(0,10) || '', reminderDate: data.document.reminderDate?.slice(0,10) || '',
      });
    } catch { toast.error('Failed to load document'); onClose(); }
    finally { setLoading(false); }
  };

  const saveMetadata = async () => {
    try {
      const { data } = await api.put(`/docs/documents/${docId}`, form);
      setDoc(data.document);
      setEditing(false);
      onUpdated?.(data.document);
      toast.success('Updated successfully');
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
  };

  const toggleStar = async () => {
    const { data } = await api.put(`/docs/documents/${docId}/star`);
    setDoc(d => ({ ...d, isStarred: data.isStarred }));
    onUpdated?.({ ...doc, isStarred: data.isStarred });
  };

  const handleDownload = () => { window.open(`/api/documents/${docId}/download?token=${localStorage.getItem('dm_token')}`, '_blank'); downloadWithAuth(); };
  const downloadWithAuth = async () => {
    try {
      const res = await api.get(`/docs/documents/${docId}/download`, { responseType:'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.originalName; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Move this document to trash?')) return;
    await api.delete(`/docs/documents/${docId}`);
    onDeleted?.(docId);
    onClose();
    toast.success('Moved to trash');
  };

  const handleVersionUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post(`/docs/documents/${docId}/versions`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setDoc(data.document);
      toast.success('New version uploaded');
    } catch (e) { toast.error(e.response?.data?.message || 'Upload failed'); }
  };

  const restoreVersion = async vnum => {
    if (!window.confirm(`Restore version ${vnum}? This will create a new version.`)) return;
    try {
      const { data } = await api.post(`/docs/documents/${docId}/versions/${vnum}/restore`);
      setDoc(data.document);
      toast.success('Version restored');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const addComment = async e => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/docs/documents/${docId}/comments`, { text: comment });
      setDoc(d => ({ ...d, comments: data.comments }));
      setComment('');
    } catch { toast.error('Failed to add comment'); }
  };

  const loadAudit = async () => {
    try {
      const { data } = await api.get(`/docs/documents/${docId}/audit`);
      setAuditLogs(data.logs);
    } catch {}
  };

  if (loading || !doc) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ padding:60 }}><div className="spinner" /></div>
      </div>
    );
  }

  const previewType = canPreview(doc.extension, doc.mimeType);
  const previewUrl  = `/api/documents/${docId}/preview`;

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal wide" style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <div className="flex items-center gap-3" style={{ minWidth:0 }}>
            <span style={{ fontSize:24 }}>{getFileIcon(doc.extension)}</span>
            {editing ? (
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ fontWeight:700, fontSize:15 }} />
            ) : (
              <h3 className="modal-title" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.name}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-icon" onClick={toggleStar} title="Star">
              <FiStar size={15} style={{ color: doc.isStarred ? '#f59e0b' : undefined, fill: doc.isStarred ? '#f59e0b' : 'none' }} />
            </button>
            <button className="btn-icon" onClick={onClose}><FiX/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding:'14px 22px 0' }}>
          <div className="tab-bar">
            {[['preview','Preview'],['details','Details'],['versions',`Versions (${doc.versions?.length||1})`],['comments',`Comments (${doc.comments?.length||0})`],['activity','Activity']].map(([k,l]) => (
              <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={() => { setTab(k); if (k==='activity' && !auditLogs) loadAudit(); }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ minHeight: 280, maxHeight: '60vh', overflowY:'auto' }}>
          {/* ── Preview Tab ── */}
          {tab === 'preview' && (
            <div style={{ textAlign:'center' }}>
              {previewType === 'image' && <img src={previewUrl} alt={doc.name} style={{ maxWidth:'100%', maxHeight:380, borderRadius:8, margin:'0 auto' }} />}
              {previewType === 'pdf' && <iframe src={previewUrl} title={doc.name} style={{ width:'100%', height:420, border:'1px solid var(--border)', borderRadius:8 }} />}
              {previewType === 'video' && <video src={previewUrl} controls style={{ maxWidth:'100%', maxHeight:380, borderRadius:8 }} />}
              {previewType === 'audio' && <audio src={previewUrl} controls style={{ width:'100%', marginTop:60 }} />}
              {previewType === 'text' && <iframe src={previewUrl} title={doc.name} style={{ width:'100%', height:380, border:'1px solid var(--border)', borderRadius:8, background:'white' }} />}
              {!previewType && (
                <div className="empty-state">
                  <div className="empty-state-icon">{getFileIcon(doc.extension)}</div>
                  <div className="empty-state-title">No preview available</div>
                  <p className="text-muted">Download the file to view its contents</p>
                </div>
              )}
            </div>
          )}

          {/* ── Details Tab ── */}
          {tab === 'details' && (
            <div>
              {editing ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Document Type</label>
                      <select value={form.documentType} onChange={e=>setForm({...form,documentType:e.target.value})}>
                        {DOCUMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tags</label>
                      <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="tag1, tag2" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reminder Date</label>
                      <input type="date" value={form.reminderDate} onChange={e=>setForm({...form,reminderDate:e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn btn-primary btn-sm" onClick={saveMetadata}><FiSave size={13}/> Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={()=>setEditing(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <table className="data-table">
                    <tbody>
                      <tr><td style={{ color:'var(--text-muted)', width:140 }}>Description</td><td>{doc.description || <span className="text-muted">-</span>}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Type</td><td><span className="badge badge-blue">{doc.documentType}</span></td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Tags</td><td>{doc.tags?.length ? doc.tags.map(t=><span key={t} className="badge badge-gray" style={{marginRight:4}}>{t}</span>) : <span className="text-muted">-</span>}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Owner</td><td>{doc.owner?.name}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Size</td><td>{formatBytes(doc.size)}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Type</td><td className="text-mono">{doc.mimeType}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Created</td><td>{format(new Date(doc.createdAt), 'PPp')}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Modified</td><td>{format(new Date(doc.updatedAt), 'PPp')}</td></tr>
                      {doc.expiryDate && <tr><td style={{ color:'var(--text-muted)' }}>Expires</td><td>{format(new Date(doc.expiryDate), 'PP')}</td></tr>}
                      <tr><td style={{ color:'var(--text-muted)' }}>Views</td><td>{doc.viewCount}</td></tr>
                      <tr><td style={{ color:'var(--text-muted)' }}>Downloads</td><td>{doc.downloadCount}</td></tr>
                    </tbody>
                  </table>
                  <button className="btn btn-secondary btn-sm mt-3" onClick={()=>setEditing(true)}><FiEdit2 size={13}/> Edit Details</button>
                </>
              )}
            </div>
          )}

          {/* ── Versions Tab ── */}
          {tab === 'versions' && (
            <div>
              <input type="file" ref={versionInputRef} style={{ display:'none' }} onChange={handleVersionUpload} />
              <button className="btn btn-secondary btn-sm mb-3" onClick={()=>versionInputRef.current.click()}>
                <FiUploadCloud size={13}/> Upload New Version
              </button>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[...(doc.versions||[])].reverse().map(v => (
                  <div key={v._id} className="flex items-center gap-3" style={{ padding:'10px 12px', background: v.versionNumber===doc.currentVersion?'var(--accent-light)':'var(--surface2)', borderRadius:8 }}>
                    <span className="badge badge-blue">v{v.versionNumber}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.originalName}</div>
                      <div className="text-muted text-sm">{formatBytes(v.size)} · {v.uploadedBy?.name} · {formatDistanceToNow(new Date(v.createdAt),{addSuffix:true})}</div>
                      {v.note && <div className="text-muted text-sm">{v.note}</div>}
                    </div>
                    {v.versionNumber !== doc.currentVersion && (
                      <button className="btn btn-sm btn-secondary" onClick={()=>restoreVersion(v.versionNumber)}><FiRotateCcw size={12}/> Restore</button>
                    )}
                    {v.versionNumber === doc.currentVersion && <span className="badge badge-green"><FiCheck size={11}/> Current</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Comments Tab ── */}
          {tab === 'comments' && (
            <div>
              <form onSubmit={addComment} className="flex gap-2 mb-4">
                <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment…" />
                <button type="submit" className="btn btn-primary"><FiMessageSquare size={14}/></button>
              </form>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {(doc.comments||[]).length === 0 ? (
                  <p className="text-muted text-sm text-center" style={{ padding:20 }}>No comments yet</p>
                ) : [...doc.comments].reverse().map(c => (
                  <div key={c._id} className="flex gap-3">
                    <div className="avatar avatar-sm">{c.user?.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <div className="flex items-center gap-2">
                        <strong style={{ fontSize:13 }}>{c.user?.name}</strong>
                        <span className="text-muted text-sm">{formatDistanceToNow(new Date(c.createdAt),{addSuffix:true})}</span>
                      </div>
                      <p style={{ fontSize:13, marginTop:2 }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === 'activity' && (
            <div>
              {!auditLogs ? <div className="spinner" /> : auditLogs.length === 0 ? (
                <p className="text-muted text-sm text-center" style={{ padding:20 }}>No activity recorded</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {auditLogs.map(l => (
                    <div key={l._id} className="flex gap-3 items-center">
                      <FiClock size={14} className="text-muted" />
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{l.user?.name}</span>{' '}
                        <span className="text-muted text-sm">{l.action.replace(/_/g,' ')} {l.details && `(${l.details})`}</span>
                      </div>
                      <span className="text-muted text-sm">{formatDistanceToNow(new Date(l.createdAt),{addSuffix:true})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={handleDelete}><FiTrash2 size={13}/> Trash</button>
          <div style={{ flex:1 }} />
          <button className="btn btn-secondary" onClick={()=>onShare?.(doc)}><FiShare2 size={13}/> Share</button>
          <button className="btn btn-primary" onClick={downloadWithAuth}><FiDownload size={13}/> Download</button>
        </div>
      </div>
    </div>
  );
}
