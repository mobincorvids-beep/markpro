import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiZap, FiUploadCloud, FiDownload } from 'react-icons/fi';

export default function AnimationGenerator() {
  const { refreshUser } = useAuth();
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(accepted => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] }, maxSize: 10 * 1024 * 1024,
  });

  const animate = async () => {
    if (!file) return toast.error('Please upload an image');
    setLoading(true);
    setVideoUrl('');
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await api.post('/ai/prompts/animate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes
      });
      setVideoUrl(data.file);
      await refreshUser();
      toast.success('Animation generated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Animation failed. Requires Stability AI API key.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Image Animation</h1></div>
      <div style={{ background: 'var(--yellow-light)', border: '1px solid var(--yellow)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
 Requires a <strong>Stability AI API key</strong> (STABILITY_API_KEY). Generation takes 1-3 minutes.
      </div>
      <div className="gen-page">
        <div className="gen-panel">
          <div className="card card-body">
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
              <input {...getInputProps()} />
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxHeight: 200, borderRadius: 8, margin: '0 auto' }} />
              ) : (
                <>
                  <FiUploadCloud size={36} style={{ color: 'var(--accent)', marginBottom: 10 }} />
                  <p style={{ fontWeight: 600 }}>Upload an image to animate</p>
                  <p className="text-muted text-sm mt-2">JPG, PNG, WEBP (max 10 MB)</p>
                </>
              )}
            </div>
            <button className="btn btn-primary btn-block mt-4" onClick={animate} disabled={loading || !file}>
              {loading ? <><span className="inline-spin" /> Generating animation… (may take 1-3 min)</> : <><FiZap size={14} /> Animate Image</>}
            </button>
          </div>
        </div>

        <div className="gen-panel">
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Generated Video</div>
          {loading ? (
            <div className="gen-output" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div className="spinner" />
              <p className="text-muted">Generating animation…<br /><span className="text-sm">This can take 1-3 minutes</span></p>
            </div>
          ) : videoUrl ? (
            <div className="card card-body" style={{ textAlign: 'center' }}>
              <video src={videoUrl} controls autoPlay loop style={{ width: '100%', borderRadius: 10 }} />
              <a href={videoUrl} download={`aigen-animation-${Date.now()}.mp4`} className="btn btn-secondary mt-3">
                <FiDownload size={14} /> Download MP4
              </a>
            </div>
          ) : (
            <div className="gen-output" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="placeholder">Animated video will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
