import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, MessagesSquare, ImageIcon, Code2 } from 'lucide-react';
import { toolsaiAPI } from '../../services/api';
import api from '../../services/api';

const AI_LAUNCHERS = [
  { to:'/toolsai/write',  icon:PenLine,        label:'Writer', sub:'Gemini streaming copy' },
  { to:'/toolsai/chat',   icon:MessagesSquare, label:'Chat',   sub:'Multi turn assistant' },
  { to:'/toolsai/images', icon:ImageIcon,      label:'Images', sub:'Gemini image generation' },
  { to:'/toolsai/code',   icon:Code2,          label:'Code',   sub:'Snippets and refactors' },
];

export default function ToolsAIDashboard() {
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([toolsaiAPI.getTemplates({ featured:true }), toolsaiAPI.getDocs({ limit:6 })])
      .then(([t,d]) => { setTemplates(t.data.templates||[]); setDocs(d.data.docs||[]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>ToolsAI</h1></div>
      <div className="section-heading">Create with AI</div>
      <div className="ai-rail">
        {AI_LAUNCHERS.map(({ to, icon:Icon, label, sub })=>(
          <Link key={to} to={to} className="ai-rail-item">
            <span className="ai-rail-icon"><Icon size={17}/></span>
            <span style={{ minWidth:0 }}>
              <span className="ai-rail-label" style={{ display:'block' }}>{label}</span>
              <span className="ai-rail-sub" style={{ display:'block' }}>{sub}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="grid-2">
        <div>
          <div className="section-heading">Featured Templates</div>
          {templates.length===0 ? <p className="text-muted text-sm">No templates yet.</p> :
            <div className="section-list">
              {templates.slice(0,6).map(t=>(<div key={t._id} className="section-list-row" style={{ display:'block' }}><div style={{ fontWeight:600, fontSize:13 }}>{t.title}</div><div className="text-muted text-sm">{t.description}</div></div>))}
            </div>
          }
        </div>
        <div>
          <div className="section-heading">Recent Documents</div>
          {docs.length===0 ? <p className="text-muted text-sm">No documents yet.</p> :
            <div className="section-list">
              {docs.map(d=>(<div key={d._id} className="section-list-row"><span style={{ fontSize:13 }}>{d.title}</span><span className="badge badge-secondary">{d.type}</span></div>))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}

export function ToolsAIWrite() {
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setOutput(''); setStreaming(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${api.defaults.baseURL}/toolsai/generate/write`, {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ templateSlug:'free-write', inputs:{ title: prompt.slice(0,60), prompt } }),
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const lines = buf.split('\n\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.delta) setOutput(o => o + data.delta);
        }
      }
    } catch (e) { alert('Streaming error: ' + e.message); }
    setStreaming(false);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>AI Writer</h1></div>
      <div className="grid-2">
        <div className="card">
          <label className="label">What do you want to write about?</label>
          <textarea className="input" rows={6} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Write a blog post about…" style={{ marginBottom:10 }}/>
          <button className="btn btn-primary" onClick={generate} disabled={streaming}>{streaming ? 'Generating…' : 'Generate'}</button>
        </div>
        <div className="card">
          <div className="card-title mb-1">Output</div>
          <div style={{ minHeight:300, whiteSpace:'pre-wrap', fontSize:13, lineHeight:1.6 }}>{output || <span className="text-muted">Output will stream here…</span>}</div>
        </div>
      </div>
    </div>
  );
}

export function ToolsAIChat() {
  const [conv, setConv]   = useState(null);
  const [msgs, setMsgs]   = useState([]);
  const [text, setText]   = useState('');
  const [sending, setSending] = useState(false);

  const startChat = async () => {
    const r = await toolsaiAPI.createConversation({ title:'New Chat' });
    setConv(r.data.conversation);
    setMsgs([]);
  };
  useEffect(() => { startChat(); }, []); // eslint-disable-line

  const send = async () => {
    if (!text.trim() || !conv) return;
    const userMsg = { role:'user', content:text };
    setMsgs(m => [...m, userMsg]);
    setText(''); setSending(true);
    try {
      const r = await toolsaiAPI.chatMessage(conv._id, { message:text });
      setMsgs(m => [...m, { role:'assistant', content:r.data.message }]);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setSending(false);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>AI Chat</h1><div className="topbar-actions"><button className="btn" onClick={startChat}>+ New Chat</button></div></div>
      <div className="card" style={{ height:500, display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflow:'auto', marginBottom:10 }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ marginBottom:10, textAlign: m.role==='user'?'right':'left' }}>
              <span style={{ display:'inline-block', padding:'8px 12px', borderRadius:10, maxWidth:'70%', fontSize:13, background: m.role==='user'?'var(--primary)':'var(--bg)', color: m.role==='user'?'#fff':'inherit' }}>{m.content}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" style={{ flex:1 }} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything…"/>
          <button className="btn btn-primary" onClick={send} disabled={sending}>{sending?'…':'Send'}</button>
        </div>
      </div>
    </div>
  );
}

export function ToolsAIImages() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try { const r = await toolsaiAPI.generateImage({ prompt, size:'1024x1024' }); setImages(i => [r.data.url, ...i]); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setGenerating(false);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>AI Images</h1></div>
      <div className="card mb-2">
        <textarea className="input" rows={2} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="A futuristic city skyline at sunset…" style={{ marginBottom:10 }}/>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>{generating?'Generating…':'Generate Image'}</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
        {images.map((url,i)=>(<img key={i} src={url} alt="Generated" style={{ width:'100%', borderRadius:8 }}/>))}
      </div>
    </div>
  );
}
