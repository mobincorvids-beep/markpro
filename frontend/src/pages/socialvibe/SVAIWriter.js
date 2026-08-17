import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socialvibeAPI } from '../../services/api';

const PLATFORMS = [
  { id:'twitter',  label:'Twitter/X',  icon:'', limit:280 },
  { id:'linkedin', label:'LinkedIn',   icon:'', limit:3000 },
  { id:'instagram',label:'Instagram',  icon:'', limit:2200 },
  { id:'facebook', label:'Facebook',   icon:'', limit:63206 },
];

export default function SVAIWriter() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [content, setContent]   = useState('');
  const [selectedAccts, setSelectedAccts] = useState([]);
  const [platform, setPlatform] = useState('twitter');
  const [prompt, setPrompt]     = useState('');
  const [variations, setVariations] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { socialvibeAPI.getAccounts().then(r => setAccounts(r.data.accounts || [])); }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const r = await socialvibeAPI.aiGenerate({ prompt, platform, variations: 3, tone: 'engaging' });
      setVariations(r.data.variations || []);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setGenerating(false);
  };

  const generateHashtags = async () => {
    try {
      const r = await socialvibeAPI.aiHashtags({ topic: content.slice(0, 100), count: 8 });
      setContent(c => `${c}\n\n${(r.data.hashtags || []).join(' ')}`);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const rewrite = async () => {
    if (!content.trim()) return;
    try {
      const r = await socialvibeAPI.aiRewrite({ content, tone: 'engaging' });
      setContent(r.data.rewritten);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleSubmit = async (asDraft) => {
    if (!content.trim() || selectedAccts.length === 0) return alert('Add content and select at least one account.');
    setSaving(true);
    try {
      await socialvibeAPI.createPost({
        content,
        accounts: selectedAccts.map(id => ({ socialAccount: id, platform: accounts.find(a => a._id === id)?.platform })),
        status: asDraft ? 'draft' : (scheduledAt ? 'scheduled' : 'scheduled'),
        scheduledAt: scheduledAt || new Date().toISOString(),
      });
      navigate('/socialvibe');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const charLimit = PLATFORMS.find(p => p.id === platform)?.limit || 280;

  return (
    <div className="page">
      <div className="topbar"><h1>Compose Post</h1></div>

      <div className="grid-2">
        {/* Left: AI generation */}
        <div className="card">
          <div className="card-title mb-1">AI Writer</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p.id} className={`btn btn-sm ${platform === p.id ? 'btn-primary' : ''}`} onClick={() => setPlatform(p.id)}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          <textarea className="input" rows={3} placeholder="What do you want to post about?"
            value={prompt} onChange={e => setPrompt(e.target.value)} style={{ marginBottom: 10 }} />
          <button className="btn btn-primary w-full" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate 3 Variations'}
          </button>

          {variations.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="text-muted text-sm mb-1">Click a variation to use it:</div>
              {variations.map((v, i) => (
                <div key={i} className="card" style={{ marginBottom: 8, cursor: 'pointer', padding: 10 }} onClick={() => setContent(v)}>
                  <div style={{ fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: composer */}
        <div className="card">
          <div className="card-title mb-1">Post Content</div>
          <textarea className="input" rows={6} value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write your post or generate with AI…" style={{ marginBottom: 6 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            <span>{content.length} / {charLimit} characters</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={rewrite}>Rewrite</button>
              <button className="btn btn-sm" onClick={generateHashtags}>#⃣ Add Hashtags</button>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">Post to accounts</label>
            {accounts.length === 0 ? <p className="text-muted text-sm">No accounts connected. <a href="/socialvibe/accounts">Connect one →</a></p> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {accounts.map(a => (
                  <label key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedAccts.includes(a._id)}
                      onChange={e => setSelectedAccts(s => e.target.checked ? [...s, a._id] : s.filter(x => x !== a._id))} />
                    <span style={{ fontSize: 13 }}>{a.accountName} ({a.platform})</span>
                  </label>
                ))}
              </div>
            }
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Schedule (optional)</label>
            <input type="datetime-local" className="input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={saving}>
              {saving ? 'Saving…' : scheduledAt ? 'Schedule Post' : 'Post Now'}
            </button>
            <button className="btn" onClick={() => handleSubmit(true)} disabled={saving}>Save Draft</button>
          </div>
        </div>
      </div>
    </div>
  );
}
