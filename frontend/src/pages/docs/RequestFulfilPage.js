import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatBytes, getFileIcon } from '../../utils/fileUtils';
import { FiHardDrive, FiUploadCloud, FiCheckCircle, FiX, FiAlertCircle } from 'react-icons/fi';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function RequestFulfil() {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError]     = useState(null);
  const [file, setFile]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/docs/public/requests/${token}`)
      .then(r => setRequest(r.data.request))
      .catch(e => setError(e.response?.data?.message || 'Request not found'));
  }, [token]);

  const onDrop = useCallback(accepted => setFile(accepted[0]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const submit = async () => {
    if (!file) return toast.error('Please select a file');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post(`${API_BASE}/docs/public/requests/${token}/upload`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      setDone(true);
    } catch (e) { toast.error(e.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo"><FiHardDrive style={{marginRight:8}}/>DocManage</div>

        {error ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <FiAlertCircle size={40} style={{ color:'var(--red)', marginBottom:12 }} />
            <h3 style={{ marginBottom:8 }}>Unable to load request</h3>
            <p className="text-muted">{error}</p>
          </div>
        ) : done ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <FiCheckCircle size={40} style={{ color:'var(--green)', marginBottom:12 }} />
            <h3 style={{ marginBottom:8 }}>File uploaded successfully!</h3>
            <p className="text-muted">Thank you. The requester has been notified.</p>
          </div>
        ) : request ? (
          <>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6, textAlign:'center' }}>{request.title}</h2>
            <p className="text-muted text-sm text-center mb-4">
              Requested by <strong>{request.requestedBy?.name}</strong>
            </p>
            {request.message && (
              <div style={{ background:'var(--surface2)', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:13 }}>
                {request.message}
              </div>
            )}

            <div {...getRootProps()} className={`dropzone ${isDragActive?'active':''}`}>
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center gap-3" style={{ justifyContent:'center' }}>
                  <span style={{ fontSize:28 }}>{getFileIcon(file.name.split('.').pop())}</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{file.name}</div>
                    <div className="text-muted text-sm">{formatBytes(file.size)}</div>
                  </div>
                  <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); setFile(null);}}><FiX size={13}/></button>
                </div>
              ) : (
                <>
                  <FiUploadCloud size={32} style={{ color:'var(--accent)', marginBottom:10 }} />
                  <p style={{ fontWeight:600 }}>Drag & drop a file, or click to browse</p>
                </>
              )}
            </div>

            <button className="btn btn-primary btn-block mt-4" onClick={submit} disabled={!file || uploading}>
              {uploading && <span className="inline-spin"/>} {uploading ? 'Uploading…' : 'Upload File'}
            </button>
          </>
        ) : <div className="spinner" />}
      </div>
    </div>
  );
}
