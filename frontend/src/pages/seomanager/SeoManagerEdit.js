import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { seoManagerAPI } from '../../services/api';

const TABS = ['Meta', 'Open Graph', 'Twitter Card', 'JSON-LD', 'Advanced'];

export default function SeoManagerEdit() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [tab, setTab]           = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [preview, setPreview]   = useState('');
  const [form, setForm] = useState({
    slug: '', title: '', description: '', keywords: '', robots: 'index, follow',
    canonical: '', charset: 'UTF-8', viewport: 'width=device-width, initial-scale=1',
    google_verify: '', bing_verify: '', yandex_verify: '',
    og: { title:'', description:'', image:'', url:'', type:'website', site_name:'', locale:'' },
    twitter: { card:'summary_large_image', title:'', description:'', image:'', site:'', creator:'' },
    hreflang: [],
    jsonLd: [],
    prev_url: '', next_url: '', amp_url: '',
    custom_head: '',
  });

  useEffect(() => {
    seoManagerAPI.getPage(id).then(r => {
      const p = r.data.page;
      setForm({
        slug: p.slug || '', title: p.title || '', description: p.description || '',
        keywords: p.keywords || '', robots: p.robots || 'index, follow',
        canonical: p.canonical || '', charset: p.charset || 'UTF-8',
        viewport: p.viewport || 'width=device-width, initial-scale=1',
        google_verify: p.google_verify || '', bing_verify: p.bing_verify || '',
        yandex_verify: p.yandex_verify || '',
        og: { title:'', description:'', image:'', url:'', type:'website', site_name:'', locale:'', ...p.og },
        twitter: { card:'summary_large_image', title:'', description:'', image:'', site:'', creator:'', ...p.twitter },
        hreflang: p.hreflang || [],
        jsonLd: p.jsonLd || [],
        prev_url: p.prev_url || '', next_url: p.next_url || '',
        amp_url: p.amp_url || '', custom_head: p.custom_head || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const set  = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setOg = (key, val) => setForm(f => ({ ...f, og: { ...f.og, [key]: val } }));
  const setTw = (key, val) => setForm(f => ({ ...f, twitter: { ...f.twitter, [key]: val } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await seoManagerAPI.updatePage(id, form);
      navigate('/seo-manager');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const handlePreview = async () => {
    try {
      const r = await seoManagerAPI.preview(form);
      setPreview(r.data.html || '');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const addHreflang = () => setForm(f => ({ ...f, hreflang: [...f.hreflang, { lang:'', url:'' }] }));
  const setHreflang = (i, key, val) => setForm(f => {
    const h = [...f.hreflang]; h[i] = { ...h[i], [key]: val }; return { ...f, hreflang: h };
  });
  const removeHreflang = (i) => setForm(f => ({ ...f, hreflang: f.hreflang.filter((_, j) => j !== i) }));

  const addJsonLd = () => setForm(f => ({ ...f, jsonLd: [...f.jsonLd, { type:'WebPage', data:{} }] }));
  const setJsonLd = (i, key, val) => setForm(f => {
    const j = [...f.jsonLd]; j[i] = { ...j[i], [key]: val }; return { ...f, jsonLd: j };
  });
  const removeJsonLd = (i) => setForm(f => ({ ...f, jsonLd: f.jsonLd.filter((_, j) => j !== i) }));

  const F = ({ label, value, onChange, type='text', placeholder='', rows }) => (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      {rows
        ? <textarea className="input" rows={rows} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)} />
        : <input className="input" type={type} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)} />
      }
    </div>
  );

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Edit SEO Page - <code style={{ fontSize: 14 }}>{form.slug}</code></h1>
        <div className="topbar-actions">
          <button className="btn" onClick={handlePreview}>Preview Tags</button>
          <button className="btn" onClick={() => navigate('/seo-manager')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Preview box */}
      {preview && (
        <div className="card mb-2" style={{ background:'#1e1e1e' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ color:'#9ca3af', fontSize:11 }}>Generated HTML tags</span>
            <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(preview).catch(()=>{}); }}>Copy</button>
          </div>
          <pre style={{ color:'#d4d4d4', fontSize:11, margin:0, whiteSpace:'pre-wrap', maxHeight:200, overflow:'auto' }}>{preview}</pre>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar mb-2">
        {TABS.map((t, i) => (
          <button key={t} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        {/* Tab 0: Meta */}
        {tab === 0 && (
          <div>
            <div className="grid-2 gap-2">
              <F label="Slug *" value={form.slug} onChange={v => set('slug', v)} placeholder="/about" />
              <F label="Canonical URL" value={form.canonical} onChange={v => set('canonical', v)} placeholder="https://example.com/about" />
              <div className="col-span-2"><F label="Title *" value={form.title} onChange={v => set('title', v)} /></div>
              <div className="col-span-2"><F label="Description (120-160 chars)" value={form.description} onChange={v => set('description', v)} /></div>
              <F label="Keywords" value={form.keywords} onChange={v => set('keywords', v)} placeholder="seo, tools, marketing" />
              <div>
                <label className="label">Robots</label>
                <select className="input" value={form.robots} onChange={e => set('robots', e.target.value)}>
                  {['index, follow','index, nofollow','noindex, follow','noindex, nofollow'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
              <div className="text-muted text-sm mb-1" style={{ fontWeight:500 }}>Webmaster Verification</div>
              <div className="grid-2 gap-2">
                <F label="Google Verify" value={form.google_verify} onChange={v => set('google_verify', v)} placeholder="verification_code" />
                <F label="Bing Verify"   value={form.bing_verify}   onChange={v => set('bing_verify', v)} />
                <F label="Yandex Verify" value={form.yandex_verify} onChange={v => set('yandex_verify', v)} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Open Graph */}
        {tab === 1 && (
          <div>
            <div className="grid-2 gap-2">
              <F label="OG Title"        value={form.og.title}       onChange={v => setOg('title', v)} />
              <F label="OG Type"         value={form.og.type}        onChange={v => setOg('type', v)} />
              <div className="col-span-2"><F label="OG Description" value={form.og.description} onChange={v => setOg('description', v)} /></div>
              <F label="OG Image URL"    value={form.og.image}       onChange={v => setOg('image', v)} placeholder="https://example.com/og.jpg" />
              <F label="OG URL"          value={form.og.url}         onChange={v => setOg('url', v)} />
              <F label="Site Name"       value={form.og.site_name}   onChange={v => setOg('site_name', v)} />
              <F label="Locale"          value={form.og.locale}      onChange={v => setOg('locale', v)} placeholder="en_US" />
            </div>
            {form.og.image && (
              <div style={{ marginTop: 8 }}>
                <div className="text-muted text-sm mb-1">Preview:</div>
                <img src={form.og.image} alt="OG preview" style={{ maxWidth:300, borderRadius:6 }} onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Twitter Card */}
        {tab === 2 && (
          <div>
            <div className="grid-2 gap-2">
              <div>
                <label className="label">Card Type</label>
                <select className="input" value={form.twitter.card} onChange={e => setTw('card', e.target.value)}>
                  {['summary','summary_large_image','app','player'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <F label="Twitter Site (@handle)"    value={form.twitter.site}        onChange={v => setTw('site', v)} placeholder="@yoursite" />
              <F label="Twitter Creator (@handle)" value={form.twitter.creator}     onChange={v => setTw('creator', v)} />
              <F label="Twitter Title"             value={form.twitter.title}       onChange={v => setTw('title', v)} />
              <div className="col-span-2"><F label="Twitter Description" value={form.twitter.description} onChange={v => setTw('description', v)} /></div>
              <F label="Twitter Image URL"         value={form.twitter.image}       onChange={v => setTw('image', v)} />
            </div>
          </div>
        )}

        {/* Tab 3: JSON-LD */}
        {tab === 3 && (
          <div>
            <button className="btn btn-sm btn-primary mb-2" onClick={addJsonLd}>+ Add Schema</button>
            {form.jsonLd.length === 0 && <p className="text-muted text-sm">No JSON-LD schemas added yet.</p>}
            {form.jsonLd.map((schema, i) => (
              <div key={i} className="card mb-2" style={{ position:'relative' }}>
                <button className="btn btn-sm btn-danger" style={{ position:'absolute', top:8, right:8 }} onClick={() => removeJsonLd(i)}></button>
                <div style={{ marginBottom:10 }}>
                  <label className="label">Schema Type</label>
                  <input className="input" value={schema.type} onChange={e => setJsonLd(i, 'type', e.target.value)} placeholder="WebPage, Article, Product, Organization…" />
                </div>
                <div>
                  <label className="label">Schema Data (JSON object properties)</label>
                  <textarea className="input" rows={5} style={{ fontFamily:'monospace', fontSize:11 }}
                    defaultValue={JSON.stringify(schema.data || {}, null, 2)}
                    onBlur={e => { try { setJsonLd(i, 'data', JSON.parse(e.target.value)); } catch { alert('Invalid JSON'); } }}
                    placeholder={'{\n  "@type": "WebPage",\n  "name": "About Us"\n}'} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Advanced */}
        {tab === 4 && (
          <div>
            <div className="card-title mb-1">hreflang (Alternate Languages)</div>
            <button className="btn btn-sm mb-2" onClick={addHreflang}>+ Add Language</button>
            {form.hreflang.map((h, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input className="input" placeholder="en-US" value={h.lang} onChange={e => setHreflang(i,'lang',e.target.value)} style={{ width:100 }} />
                <input className="input" style={{ flex:1 }} placeholder="https://example.com/about" value={h.url} onChange={e => setHreflang(i,'url',e.target.value)} />
                <button className="btn btn-sm btn-danger" onClick={() => removeHreflang(i)}></button>
              </div>
            ))}

            <div style={{ marginTop:16 }}>
              <div className="grid-2 gap-2">
                <F label="Prev URL (pagination)" value={form.prev_url} onChange={v => set('prev_url', v)} placeholder="https://example.com/blog?page=1" />
                <F label="Next URL (pagination)" value={form.next_url} onChange={v => set('next_url', v)} placeholder="https://example.com/blog?page=3" />
                <F label="AMP URL" value={form.amp_url} onChange={v => set('amp_url', v)} placeholder="https://example.com/about.amp.html" />
              </div>
            </div>

            <div style={{ marginTop:12 }}>
              <F label="Custom <head> HTML" value={form.custom_head} onChange={v => set('custom_head', v)}
                rows={4} placeholder={'<!-- Any extra tags -->\n<meta name="custom" content="value">'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
