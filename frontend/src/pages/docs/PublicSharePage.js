import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { formatBytes, getFileIcon, canPreview } from '../../utils/fileUtils';
import { format } from 'date-fns';
import { FiHardDrive, FiDownload, FiAlertCircle } from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function PublicShare() {
  const { link, type } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (type !== 'document') { setError('Public folder sharing is not yet available'); return; }
    axios.get(`${API_BASE}/docs/public/documents/${link}`)
      .then(r => setDoc(r.data.document))
      .catch(e => setError(e.response?.data?.message || 'Document not found'));
  }, [link, type]);

  const download = () => window.open(`${API_BASE}/docs/public/documents/${link}/download`, '_blank');

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign:'center' }}>
          <FiAlertCircle size={40} style={{ color:'var(--red)', marginBottom:12 }} />
          <h3>Unable to load document</h3>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (!doc) return <div className="auth-page"><div className="spinner" /></div>;

  const previewType = canPreview(doc.extension, doc.mimeType);
  const previewUrl  = `${API_BASE}/docs/public/documents/${link}/download`; // serve through download for preview too (inline works for images via content-disposition? use preview alt below)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'40px 20px' }}>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div className="flex items-center gap-2 mb-4" style={{ fontWeight:800, color:'var(--accent)', fontSize:18 }}>
          <FiHardDrive /> DocManage
        </div>
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize:24 }}>{getFileIcon(doc.extension)}</span>
            <div>
              <div className="card-title">{doc.name}</div>
              <div className="text-muted text-sm">Shared by {doc.owner?.name} · {formatBytes(doc.size)} · {format(new Date(doc.createdAt),'PP')}</div>
            </div>
            <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={download}>
              <FiDownload size={14}/> Download
            </button>
          </div>
          <div className="card-body" style={{ textAlign:'center' }}>
            {doc.description && <p className="text-muted mb-3">{doc.description}</p>}
            {previewType === 'image' ? (
              <img src={previewUrl} alt={doc.name} style={{ maxWidth:'100%', maxHeight:420, borderRadius:8, margin:'0 auto' }} />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">{getFileIcon(doc.extension)}</div>
                <p className="text-muted">Click download to view this file</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
