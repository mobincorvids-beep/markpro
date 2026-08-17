import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiZap, FiDownload, FiPlay, FiPause } from 'react-icons/fi';
import { TTS_VOICES, TTS_MODELS } from '../../utils/genTypes';

export default function SpeechGenerator() {
  const { refreshUser } = useAuth();
  const [text, setText]         = useState('');
  const [voice, setVoice]       = useState('alloy');
  const [model, setModel]       = useState('tts-1');
  const [speed, setSpeed]       = useState(1.0);
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading]   = useState(false);
  const [playing, setPlaying]   = useState(false);
  const audioRef = useRef(null);

  const generate = async () => {
    if (!text.trim()) return toast.error('Please enter some text');
    setLoading(true);
    setAudioUrl('');
    try {
      const { data } = await api.post('/ai/prompts/speech', { text, voice, model, speed });
      setAudioUrl(data.file);
      await refreshUser();
      toast.success('Audio generated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl; a.download = `aigen-speech-${Date.now()}.mp3`; a.click();
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Text to Speech</h1></div>

      <div className="gen-page">
        {/* Input */}
        <div className="gen-panel">
          <div className="card card-body">
            <div className="form-group">
              <label className="form-label">Text to convert</label>
              <textarea value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 200 }}
                placeholder="Enter the text you want to convert to speech…" />
              <div className="text-muted text-sm mt-2">{text.split(/\s+/).filter(Boolean).length} words</div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {TTS_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Voice</label>
                <select value={voice} onChange={e => setVoice(e.target.value)}>
                  {TTS_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Speed: {speed}x</label>
              <input type="range" min={0.25} max={4.0} step={0.05} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }} />
              <div className="flex justify-between text-muted text-sm"><span>0.25x Slow</span><span>4.0x Fast</span></div>
            </div>

            <button className="btn btn-primary btn-block" onClick={generate} disabled={loading}>
              {loading ? <><span className="inline-spin" /> Generating…</> : <><FiZap size={14} /> Generate Speech</>}
            </button>
          </div>

          {/* Voice preview info */}
          <div className="card card-body" style={{ fontSize: 13 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>Voice Descriptions</div>
            {[['alloy','Neutral, versatile'],['echo','Male, warm'],['fable','British, expressive'],['onyx','Deep, authoritative'],['nova','Female, friendly'],['shimmer','Female, clear']].map(([v, d]) => (
              <div key={v} className="flex items-center gap-3" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`badge ${v === voice ? 'badge-purple' : 'badge-gray'}`} style={{ width: 70, justifyContent: 'center' }}>{v}</span>
                <span className="text-muted">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="gen-panel">
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Generated Audio</div>
          {loading ? (
            <div className="gen-output" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div><div className="spinner" /><p className="text-muted mt-3 text-center">Generating audio…</p></div>
            </div>
          ) : audioUrl ? (
            <div className="card card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}></div>
              <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={togglePlay}>
                  {playing ? <><FiPause size={14} /> Pause</> : <><FiPlay size={14} /> Play</>}
                </button>
                <button className="btn btn-secondary" onClick={download}><FiDownload size={14} /> Download MP3</button>
              </div>
              <audio src={audioUrl} controls style={{ width: '100%', borderRadius: 8 }} />
            </div>
          ) : (
            <div className="gen-output" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="placeholder">Generated audio will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
