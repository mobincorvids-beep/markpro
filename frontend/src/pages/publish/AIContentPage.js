import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { TONES } from '../../utils/platforms';
import { FiZap, FiCopy, FiArrowRight, FiImage } from 'react-icons/fi';

export default function AIContent() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [activeTpl, setActiveTpl] = useState(null);
  const [vars, setVars]           = useState({});
  const [customPrompt, setCustom] = useState('');
  const [tone, setTone]           = useState('Professional');
  const [includeEmoji, setEmoji]  = useState(true);
  const [includeHashtags, setHashtags] = useState(true);
  const [output, setOutput]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [mode, setMode]           = useState('text'); // text | image
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgSize, setImgSize]     = useState('1024x1024');
  const [images, setImages]       = useState([]);

  useEffect(() => { api.get('/publish/ai/templates').then(r=>setTemplates(r.data.templates)).catch(()=>{}); }, []);

  const selectTpl = tpl => {
    setActiveTpl(tpl);
    const initial = {};
    tpl.variables?.forEach(v => initial[v.key] = '');
    setVars(initial);
  };

  const generateText = async () => {
    setLoading(true); setOutput('');
    try {
      const body = activeTpl
        ? { templateId: activeTpl._id, variables: vars, tone, includeEmoji, includeHashtags }
        : { customPrompt, tone, includeEmoji, includeHashtags };
      const { data } = await api.post('/publish/ai/generate-text', body);
      setOutput(data.text);
      await refreshUser();
    } catch (e) { toast.error(e.response?.data?.message || 'Generation failed'); }
    finally { setLoading(false); }
  };

  const generateImage = async () => {
    if (!imgPrompt.trim()) return toast.error('Enter an image prompt');
    setLoading(true); setImages([]);
    try {
      const { data } = await api.post('/publish/ai/generate-image', { prompt: imgPrompt, size: imgSize });
      setImages(data.files);
      await refreshUser();
      toast.success('Images generated!');
    } catch (e) { toast.error(e.response?.data?.message || 'Generation failed'); }
    finally { setLoading(false); }
  };

  const useInPost = () => {
    navigate('/compose', { state: { content: output } });
    toast.success('Open compose to paste your content');
  };

  const categories = [...new Set(templates.map(t=>t.category))];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI Content Generator</h1>
        <div className="flex gap-2">
          <button className={`btn btn-sm ${mode==='text'?'btn-indigo':'btn-secondary'}`} onClick={()=>setMode('text')}>Text</button>
          <button className={`btn btn-sm ${mode==='image'?'btn-indigo':'btn-secondary'}`} onClick={()=>setMode('image')}><FiImage size={12}/> Image</button>
        </div>
      </div>

      {mode === 'text' ? (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div>
            {templates.length > 0 && (
              <div className="card card-body mb-4">
                <div className="form-label mb-3">Choose a Template</div>
                {categories.map(cat=>(
                  <div key={cat} className="mb-3">
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:8}}>{cat}</div>
                    <div className="flex gap-2 flex-wrap">
                      {templates.filter(t=>t.category===cat).map(t=>(
                        <button key={t._id} onClick={()=>selectTpl(t)}
                          className={`btn btn-sm ${activeTpl?._id===t._id?'btn-indigo':'btn-secondary'}`}>
                          {t.icon} {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="card card-body">
              {activeTpl ? (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span style={{fontWeight:700}}>{activeTpl.icon} {activeTpl.name}</span>
                    <button className="btn btn-sm btn-ghost" onClick={()=>setActiveTpl(null)}>Clear</button>
                  </div>
                  {activeTpl.variables?.map(v=>(
                    <div className="form-group" key={v.key}>
                      <label className="form-label">{v.label}</label>
                      {v.type==='select' ? (
                        <select value={vars[v.key]||''} onChange={e=>setVars({...vars,[v.key]:e.target.value})}>
                          {v.options?.map(o=><option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : v.type==='textarea' ? (
                        <textarea value={vars[v.key]||''} onChange={e=>setVars({...vars,[v.key]:e.target.value})} placeholder={v.placeholder} />
                      ) : (
                        <input value={vars[v.key]||''} onChange={e=>setVars({...vars,[v.key]:e.target.value})} placeholder={v.placeholder} />
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Custom Prompt</label>
                  <textarea value={customPrompt} onChange={e=>setCustom(e.target.value)} placeholder="Describe what you want to create…" style={{minHeight:140}} />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tone</label>
                  <select value={tone} onChange={e=>setTone(e.target.value)}>{TONES.map(t=><option key={t}>{t}</option>)}</select>
                </div>
                <div className="form-group" style={{display:'flex',gap:16,alignItems:'center',paddingTop:20}}>
                  <label className="flex items-center gap-2" style={{fontSize:13,cursor:'pointer'}}>
                    <input type="checkbox" checked={includeEmoji} onChange={e=>setEmoji(e.target.checked)} style={{width:'auto'}} /> Emoji
                  </label>
                  <label className="flex items-center gap-2" style={{fontSize:13,cursor:'pointer'}}>
                    <input type="checkbox" checked={includeHashtags} onChange={e=>setHashtags(e.target.checked)} style={{width:'auto'}} /> Hashtags
                  </label>
                </div>
              </div>

              <button className="btn btn-primary btn-block" onClick={generateText} disabled={loading}>
                {loading ? <span className="inline-spin"/> : <FiZap size={14}/>} Generate Content
              </button>
            </div>
          </div>

          <div>
            <div className="card card-body" style={{minHeight:300}}>
              <div className="form-label mb-3">Generated Content</div>
              {output ? (
                <>
                  <div style={{whiteSpace:'pre-wrap',fontSize:14,lineHeight:1.7,marginBottom:16}}>{output}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={()=>{navigator.clipboard.writeText(output);toast.success('Copied!');}}><FiCopy size={12}/> Copy</button>
                    <button className="btn btn-primary btn-sm" onClick={useInPost}><FiArrowRight size={12}/> Use in Post</button>
                  </div>
                </>
              ) : (
                <p className="text-muted">Generated content will appear here…</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div className="card card-body">
            <div className="form-group">
              <label className="form-label">Image Prompt</label>
              <textarea value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} placeholder="A vibrant flat-lay photo of healthy breakfast foods, bright morning light…" style={{minHeight:140}} />
            </div>
            <div className="form-group">
              <label className="form-label">Size</label>
              <select value={imgSize} onChange={e=>setImgSize(e.target.value)}>
                <option value="1024x1024">Square (1024×1024)</option>
                <option value="1792x1024">Landscape (1792×1024)</option>
                <option value="1024x1792">Portrait (1024×1792)</option>
              </select>
            </div>
            <button className="btn btn-primary btn-block" onClick={generateImage} disabled={loading}>
              {loading ? <span className="inline-spin"/> : <FiZap size={14}/>} Generate Image
            </button>
          </div>
          <div className="card card-body" style={{minHeight:300}}>
            <div className="form-label mb-3">Generated Images</div>
            {images.length>0 ? (
              <div className="img-grid">
                {images.map((url,i)=><img key={i} src={url} alt="" className="img-thumb"/>)}
              </div>
            ) : <p className="text-muted">Generated images will appear here…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
