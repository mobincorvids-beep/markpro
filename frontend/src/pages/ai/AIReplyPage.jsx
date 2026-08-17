import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { replyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Copy, Star, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const PLATFORMS = ['general', 'twitter', 'linkedin', 'facebook', 'instagram'];
const TONES = ['professional', 'casual', 'witty', 'empathetic', 'formal'];
const MODELS = [
  { value: 'openai', label: 'GPT-4o Mini', badge: 'OpenAI' },
  { value: 'gemini', label: 'Gemini 2.0 Flash', badge: 'Google' },
  { value: 'mistral', label: 'Mistral Small', badge: 'Mistral' },
];
const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' }, { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' }, { code: 'ur', label: 'Urdu' },
  { code: 'pt', label: 'Portuguese' }, { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' }, { code: 'hi', label: 'Hindi' },
];

export default function GeneratePage() {
  const { user, updateUser, hasActiveSub, canGenerate } = useAuth();
  const [form, setForm] = useState({
    originalText: '',
    platform: user?.preferences?.defaultTone || 'general',
    tone: user?.preferences?.defaultTone || 'professional',
    language: user?.preferences?.defaultLanguage || 'en',
    aiModel: user?.preferences?.aiModel || 'openai',
    customPrompt: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    if (!form.originalText.trim()) return toast.error('Please enter the post text');
    if (!canGenerate) return toast.error('Generation limit reached. Please upgrade your plan.');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await replyAPI.generate(form);
      setResult(data.data);
      // Update usage in auth context
      updateUser({ usage: { ...user.usage, generationsUsed: data.data.usage.used } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.reply.generatedReply);
    toast.success('Copied to clipboard!');
  };

  const toggleFavorite = async () => {
    try {
      await replyAPI.toggleFavorite(result.reply._id);
      setResult((prev) => ({ ...prev, reply: { ...prev.reply, isFavorited: !prev.reply.isFavorited } }));
      toast.success(result.reply.isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const canUseModel = (model) => model === 'openai' || hasActiveSub;
  const canUseCustomPrompt = hasActiveSub;

  return (
    
      <div className="fade-in" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Generate Reply</h1>
          <p style={{ color: 'var(--text-muted)' }}>Paste a social media post and get an AI-powered reply instantly.</p>
        </div>

        {/* Usage banner */}
        {!canGenerate && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--error)' }}>Monthly limit reached ({user?.usage?.generationsLimit} generations used).</p>
            <Link to="/pricing" className="btn btn-danger btn-sm">Upgrade Now</Link>
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          {/* Platform + Tone row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select className="form-select" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tone</label>
              <select className="form-select" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Post textarea */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label">Post to reply to</label>
            <textarea className="form-input" rows={5} placeholder="Paste the social media post here..."
              value={form.originalText} onChange={(e) => setForm({ ...form, originalText: e.target.value })}
              style={{ resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {form.originalText.length} / 5000
            </div>
          </div>

          {/* Advanced options toggle */}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: showAdvanced ? 16 : 0 }}>
            {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Advanced Options
          </button>

          {showAdvanced && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select className="form-select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    AI Model {!hasActiveSub && <span className="badge badge-warning" style={{ fontSize: 10 }}>Paid</span>}
                  </label>
                  <select className="form-select" value={form.aiModel} onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
                    disabled={!hasActiveSub}>
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value} disabled={!canUseModel(m.value)}>
                        {m.label} ({m.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Custom System Prompt
                  {!canUseCustomPrompt && <span className="badge badge-warning" style={{ fontSize: 10 }}>Paid</span>}
                </label>
                <textarea className="form-input" rows={3} disabled={!canUseCustomPrompt}
                  placeholder={canUseCustomPrompt ? 'e.g. "You are a friendly startup founder who speaks authentically..."' : 'Upgrade to use custom prompts'}
                  value={form.customPrompt} onChange={(e) => setForm({ ...form, customPrompt: e.target.value })}
                  style={{ resize: 'vertical', opacity: canUseCustomPrompt ? 1 : 0.5 }} />
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={loading || !canGenerate || !form.originalText.trim()}
          className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 24 }}>
          {loading ? <><div className="spinner" /> Generating...</> : <><Sparkles size={18} /> Generate Reply</>}
        </button>

        {/* Usage info */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>
          <Info size={14} />
          <span>{user?.usage?.generationsUsed || 0} / {user?.usage?.generationsLimit || 10} generations used this month</span>
        </div>

        {/* Result */}
        {result && (
          <div className="card fade-in" style={{ borderColor: 'var(--primary)', borderWidth: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-primary">{result.reply.platform}</span>
                <span className="badge badge-gray">{result.reply.tone}</span>
                <span className="badge badge-gray">{result.reply.aiModel}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleFavorite} className="btn btn-ghost btn-sm" style={{ padding: 7 }}>
                  <Star size={15} fill={result.reply.isFavorited ? 'var(--warning)' : 'none'} color={result.reply.isFavorited ? 'var(--warning)' : 'currentColor'} />
                </button>
                <button onClick={copyToClipboard} className="btn btn-outline btn-sm"><Copy size={13} /> Copy</button>
                <button onClick={handleGenerate} className="btn btn-ghost btn-sm"><RefreshCw size={13} /> Regenerate</button>
              </div>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {result.reply.generatedReply}
            </p>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
              <span>{result.usage.remaining} generations remaining</span>
              {result.reply.tokensUsed > 0 && <span>{result.reply.tokensUsed} tokens used</span>}
            </div>
          </div>
        )}
      </div>
    
  );
}
