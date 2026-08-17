import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { ArrowLeft, Mic, Download } from 'lucide-react';

const VOICE_OPTIONS = {
  openai:     ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  google_tts: ['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Wavenet-D', 'en-GB-Standard-A'],
  azure_tts:  ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural', 'en-AU-NatashaNeural'],
};

export default function PenAudioGeneratorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ text: '', api_group: 'openai', voice: 'alloy', voice_name: '', language_code: 'en-US', speaking_rate: 1, pitch: 0 });
  const [audioUrl, setAudioUrl] = useState(null);
  const [running, setRunning] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const run = async (e) => {
    e.preventDefault();
    setRunning(true); setAudioUrl(null);
    try {
      const payload = { ...form };
      if (form.api_group !== 'openai') payload.voice_name = form.voice_name || VOICE_OPTIONS[form.api_group][0];
      const { data } = await penAPI.generateAudio(payload);
      if (data.status === '1') { setAudioUrl(data.data.url); toast.success('Audio generated!'); }
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally { setRunning(false); }
  };

  const apiBase = (process.env.REACT_APP_API_URL || '').replace('/api', '');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/pen/templates')}><ArrowLeft size={14} /> Back</button>
        <div>
          <div className="page-title" style={{ fontSize: 18 }}>Text to Speech</div>
          <div className="page-sub">Convert text into natural-sounding audio</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card"><div className="card-body">
          <form onSubmit={run}>
            <div className="form-group">
              <label className="form-label">Text to Convert *</label>
              <textarea className="form-input form-textarea" rows={5} required
                placeholder="Enter the text you want to convert to speech…"
                value={form.text} onChange={set('text')} />
            </div>
            <div className="form-group">
              <label className="form-label">TTS Engine</label>
              <select className="form-select" value={form.api_group} onChange={set('api_group')}>
                <option value="openai">OpenAI TTS</option>
                <option value="google_tts">Google Cloud TTS</option>
                <option value="azure_tts">Azure TTS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Voice</label>
              <select className="form-select"
                value={form.api_group === 'openai' ? form.voice : form.voice_name}
                onChange={e => setForm(p => ({ ...p, [form.api_group === 'openai' ? 'voice' : 'voice_name']: e.target.value }))}>
                {(VOICE_OPTIONS[form.api_group] || []).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {form.api_group !== 'openai' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Speaking Rate</label>
                  <input className="form-input" type="number" step="0.1" value={form.speaking_rate} onChange={set('speaking_rate')} />
                  <div className="form-hint">0.5 - 2.0</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Pitch</label>
                  <input className="form-input" type="number" value={form.pitch} onChange={set('pitch')} />
                  <div className="form-hint">-20 to 20</div>
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-ai w-full" disabled={running}>
              {running ? <span className="spinner" /> : <><Mic size={15} /> Generate Audio</>}
            </button>
          </form>
        </div></div>

        <div className="card"><div className="card-body">
          {running ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <Mic size={32} color="var(--text-3)" />
              <div className="empty-sub">Synthesizing speech…</div>
            </div>
          ) : audioUrl ? (
            <div>
              <audio controls src={audioUrl.startsWith('http') ? audioUrl : `${apiBase}${audioUrl}`} style={{ width: '100%' }} />
              <a href={audioUrl} download className="btn btn-secondary btn-sm w-full mt-3"><Download size={13} /> Download MP3</a>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-sub">Generated audio will appear here.</div>
            </div>
          )}
        </div></div>
      </div>
    </div>
  );
}
