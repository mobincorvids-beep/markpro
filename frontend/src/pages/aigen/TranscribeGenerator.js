import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CopyButton from '../../components/aigen/CopyButton';
import { FiZap, FiUploadCloud, FiTrash2 } from 'react-icons/fi';
import { RESPONSE_LANGUAGES } from '../../utils/genTypes';

export default function TranscribeGenerator() {
  const { refreshUser } = useAuth();
  const [file, setFile]         = useState(null);
  const [language, setLanguage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading]   = useState(false);

  const onDrop = useCallback(accepted => { if (accepted[0]) setFile(accepted[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, maxFiles: 1, maxSize: 25 * 1024 * 1024,
    accept: { 'audio/*': ['.mp3','.mp4','.mpeg','.mpga','.m4a','.wav','.webm'] },
  });

  const transcribe = async () => {
    if (!file) return toast.error('Please upload an audio file');
    setLoading(true);
    setTranscript('');
    const fd = new FormData();
    fd.append('audio', file);
    if (language) fd.append('language', language);
    try {
      const { data } = await api.post('/ai/prompts/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTranscript(data.transcript);
      await refreshUser();
      toast.success('Transcription complete!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Transcription failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Speech to Text</h1></div>
      <div className="gen-page">
        <div className="gen-panel">
          <div className="card card-body">
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: 16 }}>
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                  <p style={{ fontWeight: 600 }}>{file.name}</p>
                  <p className="text-muted text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button className="btn btn-sm btn-ghost mt-2" onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <FiTrash2 size={12} /> Remove
                  </button>
                </div>
              ) : (
                <>
                  <FiUploadCloud size={36} style={{ color: 'var(--accent)', marginBottom: 10 }} />
                  <p style={{ fontWeight: 600 }}>Drop audio file here, or click to browse</p>
                  <p className="text-muted text-sm mt-2">MP3, MP4, WAV, M4A, WEBM (max 25 MB)</p>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Audio Language (optional)</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="">Auto-detect</option>
                {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>

            <button className="btn btn-primary btn-block" onClick={transcribe} disabled={loading || !file}>
              {loading ? <><span className="inline-spin" /> Transcribing…</> : <><FiZap size={14} /> Transcribe Audio</>}
            </button>
          </div>
        </div>

        <div className="gen-panel">
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>Transcript</span>
            {transcript && <CopyButton text={transcript} />}
          </div>
          <div className="gen-output">
            {loading ? (
              <span className="placeholder">Transcribing audio with Whisper AI…</span>
            ) : transcript ? (
              transcript
            ) : (
              <span className="placeholder">Your transcript will appear here after upload</span>
            )}
          </div>
          {transcript && (
            <div className="text-muted text-sm" style={{ textAlign: 'right' }}>
              {transcript.split(/\s+/).filter(Boolean).length} words
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
