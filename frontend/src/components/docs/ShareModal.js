import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiX, FiLink, FiCopy, FiCheck, FiTrash2, FiMail } from 'react-icons/fi';

export default function ShareModal({ item, type = 'document', onClose, onUpdated }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [sharing, setSharing] = useState(false);
  const [item_, setItem] = useState(item);
  const [copied, setCopied] = useState(false);

  const publicUrl = item_.publicLink ? `${window.location.origin}/share/${type}/${item_.publicLink}` : '';

  const handleShare = async e => {
    e.preventDefault();
    if (!email) return;
    setSharing(true);
    try {
      const { data } = await api.post(`/docs/${type}s/${item._id}/share`, { email, permission });
      setItem(data[type] || data.folder || data.document);
      setEmail('');
      toast.success(`Shared with ${email}`);
      onUpdated?.(data[type] || data.folder || data.document);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Share failed');
    } finally { setSharing(false); }
  };

  const handleUnshare = async shareId => {
    try {
      const { data } = await api.delete(`/docs/documents/${item._id}/share/${shareId}`);
      setItem(data.document);
      onUpdated?.(data.document);
    } catch { toast.error('Failed to remove'); }
  };

  const togglePublicLink = async () => {
    try {
      const { data } = await api.post(`/docs/${type}s/${item._id}/public-link`);
      setItem(i => ({ ...i, isPublic: data.isPublic, publicLink: data.publicLink }));
    } catch { toast.error('Failed'); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Share "{item.name}"</h3>
          <button className="btn-icon" onClick={onClose}><FiX/></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleShare} className="flex gap-2 mb-4">
            <input type="email" placeholder="Enter email address" value={email} onChange={e=>setEmail(e.target.value)} required />
            <select value={permission} onChange={e=>setPermission(e.target.value)} style={{ width:110 }}>
              <option value="view">View</option>
              <option value="edit">Edit</option>
              <option value="download">Download</option>
            </select>
            <button type="submit" className="btn btn-primary" disabled={sharing}>
              {sharing ? <span className="inline-spin"/> : <FiMail size={14}/>}
            </button>
          </form>

          {item_.sharedWith?.length > 0 && (
            <div className="mb-4">
              <div className="form-label">People with access</div>
              {item_.sharedWith.map(s => (
                <div key={s._id} className="flex items-center gap-3" style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div className="avatar avatar-sm">{(s.user?.name||s.email||'?')[0].toUpperCase()}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{s.user?.name || s.email}</div>
                    <div className="text-muted text-sm">{s.user?.email || s.email}</div>
                  </div>
                  <span className="badge badge-blue">{s.permission}</span>
                  <button className="btn-icon" style={{ width:28, height:28 }} onClick={()=>handleUnshare(s._id)}><FiTrash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />

          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>Public Link</div>
              <div className="text-muted text-sm">Anyone with the link can view</div>
            </div>
            <button className={`btn btn-sm ${item_.isPublic?'btn-secondary':'btn-primary'}`} onClick={togglePublicLink}>
              <FiLink size={13}/> {item_.isPublic ? 'Disable' : 'Create Link'}
            </button>
          </div>

          {item_.isPublic && publicUrl && (
            <div className="flex gap-2 mt-3">
              <input readOnly value={publicUrl} style={{ fontFamily:'monospace', fontSize:12 }} />
              <button className="btn btn-secondary" onClick={copyLink}>
                {copied ? <FiCheck size={14}/> : <FiCopy size={14}/>}
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
