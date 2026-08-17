import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatBytes, getFileIcon, DOCUMENT_TYPES } from '../../utils/fileUtils';
import { FiUploadCloud, FiX, FiFile } from 'react-icons/fi';

export default function UploadModal({ folderId, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState({ documentType: 'General', tags: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = idx => setFiles(f => f.filter((_,i) => i!==idx));

  const handleUpload = async () => {
    if (!files.length) return toast.error('Select at least one file');
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('documentType', meta.documentType);
      fd.append('tags', meta.tags);
      fd.append('description', meta.description);
      if (folderId) fd.append('folder', folderId);
      try {
        await api.post('/docs/documents/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: e => setProgress(p => ({ ...p, [file.name]: Math.round((e.loaded/e.total)*100) })),
        });
        successCount++;
      } catch (e) {
        toast.error(`${file.name}: ${e.response?.data?.message || 'Upload failed'}`);
      }
    }
    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount>1?'s':''} uploaded successfully`);
      onUploaded?.();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && !uploading && onClose()}>
      <div className="modal wide">
        <div className="modal-header">
          <h3 className="modal-title">Upload Documents</h3>
          <button className="btn-icon" onClick={onClose} disabled={uploading}><FiX/></button>
        </div>
        <div className="modal-body">
          <div {...getRootProps()} className={`dropzone ${isDragActive?'active':''}`}>
            <input {...getInputProps()} />
            <FiUploadCloud size={36} style={{ color:'var(--accent)', marginBottom:10 }} />
            <p style={{ fontWeight:600 }}>Drag & drop files here, or click to browse</p>
            <p className="text-muted text-sm mt-2">Max file size: 50 MB</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4" style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:180, overflowY:'auto' }}>
              {files.map((f,i) => (
                <div key={i} className="flex items-center gap-3" style={{ padding:'8px 12px', background:'var(--surface2)', borderRadius:8 }}>
                  <span style={{ fontSize:20 }}>{getFileIcon(f.name.split('.').pop())}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                    <div className="text-muted text-sm">{formatBytes(f.size)}</div>
                  </div>
                  {progress[f.name] !== undefined && progress[f.name] < 100 && (
                    <div style={{ width:60 }}>
                      <div className="progress-bar"><div className="progress-fill" style={{ width:`${progress[f.name]}%` }} /></div>
                    </div>
                  )}
                  {!uploading && <button className="btn-icon" style={{ width:28, height:28 }} onClick={()=>removeFile(i)}><FiX size={13}/></button>}
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select value={meta.documentType} onChange={e=>setMeta({...meta,documentType:e.target.value})}>
                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input value={meta.tags} onChange={e=>setMeta({...meta,tags:e.target.value})} placeholder="urgent, q4, draft" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={meta.description} onChange={e=>setMeta({...meta,description:e.target.value})} placeholder="Optional description…" style={{ minHeight:60 }} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading && <span className="inline-spin" />}
            {uploading ? 'Uploading…' : `Upload ${files.length || ''} File${files.length!==1?'s':''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
