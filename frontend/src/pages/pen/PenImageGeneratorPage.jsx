import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { ArrowLeft, ImageIcon, Download } from 'lucide-react';

export default function PenImageGeneratorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ prompt: '', api_group: 'openai', size: '1024x1024', quality: 'standard', n: 1, negative_prompt: '' });
  const [images, setImages] = useState([]);
  const [running, setRunning] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const run = async (e) => {
    e.preventDefault();
    setRunning(true); setImages([]);
    try {
      const { data } = await penAPI.generateImage(form);
      if (data.status === '1') {
        setImages(data.data.urls);
        toast.success(`${data.data.image_count} image(s) generated!`);
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally { setRunning(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/pen/templates')}><ArrowLeft size={14} /> Back</button>
        <div>
          <div className="page-title" style={{ fontSize: 18 }}>AI Image Generator</div>
          <div className="page-sub">Create stunning visuals with DALL-E or Stable Diffusion</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card"><div className="card-body">
          <form onSubmit={run}>
            <div className="form-group">
              <label className="form-label">Image Prompt *</label>
              <textarea className="form-input form-textarea" rows={4} required
                placeholder="A futuristic city skyline at sunset, digital art"
                value={form.prompt} onChange={set('prompt')} />
            </div>
            <div className="form-group">
              <label className="form-label">AI Engine</label>
              <select className="form-select" value={form.api_group} onChange={set('api_group')}>
                <option value="openai">DALL-E 3 (OpenAI)</option>
                <option value="stable_diffusion">Stable Diffusion XL</option>
              </select>
            </div>
            {form.api_group === 'openai' ? (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Size</label>
                  <select className="form-select" value={form.size} onChange={set('size')}>
                    {['1024x1024', '1792x1024', '1024x1792'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quality</label>
                  <select className="form-select" value={form.quality} onChange={set('quality')}>
                    <option value="standard">Standard</option>
                    <option value="hd">HD</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Negative Prompt</label>
                <input className="form-input" placeholder="blurry, low quality" value={form.negative_prompt} onChange={set('negative_prompt')} />
              </div>
            )}
            <button type="submit" className="btn btn-ai w-full" disabled={running}>
              {running ? <span className="spinner" /> : <><ImageIcon size={15} /> Generate Image</>}
            </button>
          </form>
        </div></div>

        <div className="card"><div className="card-body">
          {running ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <ImageIcon size={32} color="var(--text-3)" />
              <div className="empty-sub">Painting your image…</div>
            </div>
          ) : images.length ? (
            <div className="flex-col gap-3">
              {images.map((url, i) => (
                <div key={i}>
                  <img src={url} alt="Generated" style={{ width: '100%', borderRadius: 8 }} />
                  <a href={url} download className="btn btn-secondary btn-sm w-full mt-2"><Download size={13} /> Download</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-sub">Generated images will appear here.</div>
            </div>
          )}
        </div></div>
      </div>
    </div>
  );
}
