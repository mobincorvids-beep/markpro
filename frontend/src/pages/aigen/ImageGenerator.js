import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiZap, FiDownload } from 'react-icons/fi';
import { IMAGE_SIZES, STYLE_PRESETS, SD_MODELS } from '../../utils/genTypes';

export default function ImageGenerator() {
  const { refreshUser } = useAuth();
  const [prompt, setPrompt]         = useState('');
  const [size, setSize]             = useState('512x512');
  const [noOfImages, setNoImages]   = useState(1);
  const [stylePreset, setStyle]     = useState('');
  const [useSD, setUseSD]           = useState(false);
  const [sdModel, setSdModel]       = useState('stable-diffusion-xl-1024-v1-0');
  const [images, setImages]         = useState([]);
  const [loading, setLoading]       = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Prompt is required');
    setLoading(true);
    setImages([]);
    try {
      const { data } = await api.post('/ai/prompts/image', {
        prompt, size, noOfImages, stylePreset: stylePreset || undefined,
        useStableDiffusion: useSD, sdModel: useSD ? sdModel : undefined,
      });
      setImages(data.files);
      await refreshUser();
      toast.success('Images generated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  const downloadImage = async (url, i) => {
    const res  = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aigen-image-${i + 1}.png`;
    link.click();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Image Generator</h1>
      </div>

      <div className="gen-page">
        {/* Input Panel */}
        <div className="gen-panel">
          <div className="card card-body">
            <div className="form-group">
              <label className="form-label">Image Prompt</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                style={{ minHeight: 120 }} placeholder="A photorealistic sunset over mountains, dramatic lighting, 8k quality…" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Style Preset</label>
                <select value={stylePreset} onChange={e => setStyle(e.target.value)}>
                  <option value="">None</option>
                  {STYLE_PRESETS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number of Images</label>
                <select value={noOfImages} onChange={e => setNoImages(Number(e.target.value))}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Provider toggle */}
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: useSD ? 400 : 700, color: useSD ? 'var(--text-muted)' : 'var(--text)' }}>
                  <input type="radio" name="provider" checked={!useSD} onChange={() => setUseSD(false)} style={{ width: 'auto' }} />
                  Gemini
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: useSD ? 700 : 400, color: useSD ? 'var(--text)' : 'var(--text-muted)' }}>
                  <input type="radio" name="provider" checked={useSD} onChange={() => setUseSD(true)} style={{ width: 'auto' }} />
                  Stable Diffusion
                </label>
              </div>

              {!useSD && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Image Size</label>
                  <select value={size} onChange={e => setSize(e.target.value)}>
                    {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {useSD && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SD Model</label>
                  <select value={sdModel} onChange={e => setSdModel(e.target.value)}>
                    {SD_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-block" onClick={generate} disabled={loading}>
              {loading ? <><span className="inline-spin" /> Generating…</> : <><FiZap size={14} /> Generate Images</>}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="gen-panel">
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Generated Images</div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div className="spinner" />
              <p className="text-muted mt-3">Generating your images…</p>
            </div>
          ) : images.length > 0 ? (
            <div className="image-gallery">
              {images.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
                  <button className="btn btn-sm btn-secondary"
                    style={{ position: 'absolute', bottom: 8, right: 8, backdropFilter: 'blur(8px)' }}
                    onClick={() => downloadImage(url, i)}>
                    <FiDownload size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="gen-output" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="placeholder">Generated images will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
