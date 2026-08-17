import React, { useMemo, useRef, useState } from 'react';
import { Code2, FileText, Lock, Hash, Globe2, Cpu, ArrowRight, Play, Search, Copy, Check, Image as ImageIcon, Download } from 'lucide-react';
import { getTool } from './devToolsRegistry';
import { fileToDataUrl } from './devToolsLib';

const CYBER_CATEGORIES = [
  { id:'text',     label:'Text Tools',      icon:FileText, color:'var(--info)',    desc:'String manipulation & analysis',
    tools:['Word Counter','Character Counter','Case Converter','Text Reverser','Lorem Ipsum Gen','Duplicate Line Remover','Line Sorter','Text Compare','Whitespace Remover','Sentence Counter']},
  { id:'json',     label:'JSON & Data',     icon:Code2,    color:'var(--brand-2)', desc:'Parse, format, and validate data',
    tools:['JSON Formatter','JSON Validator','JSON Minifier','JSON to CSV','CSV to JSON','JSON to YAML','YAML to JSON','XML Formatter','XML to JSON','JSON Editor']},
  { id:'encode',   label:'Encode & Decode', icon:Hash,     color:'var(--success)', desc:'Encoding and hashing utilities',
    tools:['Base64 Encode','Base64 Decode','URL Encode','URL Decode','HTML Encode','HTML Decode','MD5 Generator','SHA256 Hash','Bcrypt Generator','JWT Decoder']},
  { id:'security', label:'Security',        icon:Lock,     color:'var(--danger)',  desc:'Security analysis tools',
    tools:['Password Generator','Password Strength','SSL Checker','WHOIS Lookup','IP Lookup','DNS Lookup','Port Scanner','HTTP Headers','Safe Browsing Check','Htpasswd Generator']},
  { id:'dev',      label:'Dev Utilities',   icon:Cpu,      color:'var(--purple)',  desc:'Developer productivity tools',
    tools:['Regex Tester','Cron Generator','UUID Generator','Color Picker','CSS Minifier','JS Minifier','HTML Minifier','SQL Formatter','Markdown Preview','Diff Checker']},
  { id:'network',  label:'Network Tools',   icon:Globe2,   color:'var(--warning)', desc:'Network diagnostics',
    tools:['IP Geolocation','Ping Test','Traceroute','DNS Propagation','HTTP Status Check','Redirect Chain','Meta Tag Extractor','Link Extractor','Tech Stack Detector','Uptime Checker']},
  { id:'image',    label:'Image Tools',     icon:ImageIcon,color:'var(--brand)',   desc:'Image processing utilities',
    tools:['Image to Base64','Base64 to Image','Image Metadata','Color Extractor','Image Resize','Format Converter','EXIF Viewer','Image Compressor','Favicon Extractor','Screenshot Tool']},
  { id:'code',     label:'Code Formatters', icon:FileText, color:'var(--info)',    desc:'Format and lint code',
    tools:['HTML Formatter','CSS Formatter','JS Formatter','PHP Formatter','Python Formatter','Go Formatter','Code Minifier','SVG Optimizer','HTML to Markdown','Markdown to HTML']},
];

const label = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase());

/* ── Copy-to-clipboard button ───────────────────────────────── */
function CopyBtn({ value }) {
  const [done, setDone] = useState(false);
  if (value == null || value === '') return null;
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={() => {
        navigator.clipboard?.writeText(String(value));
        setDone(true); setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
    </button>
  );
}

/* ── Result renderer ────────────────────────────────────────── */
function ResultView({ data }) {
  if (data == null) return null;

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    const text = String(data);
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="page-sub">Output</span><CopyBtn value={text} />
        </div>
        <div className="code-block"><pre style={{ whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>{text}</pre></div>
      </div>
    );
  }

  if (Array.isArray(data)) return <ResultView data={{ items: data.map(String).join('\n') }} />;

  const entries = Object.entries(data).filter(([k]) => !['preview','download','swatches','__html'].includes(k));

  return (
    <div style={{ display:'grid', gap:14 }}>
      {data.preview && (
        <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:12, background:'var(--bg-subtle)' }}>
          <img src={data.preview} alt="Result preview" style={{ maxWidth:'100%', maxHeight:320, display:'block', margin:'0 auto', borderRadius:'var(--r-sm)' }} />
          {data.download && (
            <div className="flex justify-center mt-2">
              <a className="btn btn-secondary btn-sm" href={data.download} download="markpro-output">
                <Download size={13} /> Download
              </a>
            </div>
          )}
        </div>
      )}

      {Array.isArray(data.swatches) && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {data.swatches.map(c => (
            <div key={c} style={{ textAlign:'center' }}>
              <div style={{ width:56, height:44, borderRadius:'var(--r-sm)', background:c, border:'1px solid var(--border)' }} />
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4, fontFamily:'monospace' }}>{c}</div>
            </div>
          ))}
        </div>
      )}

      {data.__html && (
        <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:14, background:'var(--bg-card)', color:'var(--text)' }}
             dangerouslySetInnerHTML={{ __html: data.__html }} />
      )}

      <div style={{ border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
        {entries.map(([k, v], i) => {
          const str = v == null ? '—' : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
          const multiline = str.includes('\n') || str.length > 70;
          return (
            <div key={k}
              style={{
                display:multiline ? 'block' : 'flex', justifyContent:'space-between', gap:16,
                alignItems:'center', padding:'11px 14px',
                borderTop: i ? '1px solid var(--border)' : 'none',
                background: i % 2 ? 'var(--bg-subtle)' : 'transparent',
              }}>
              <div style={{ fontSize:12.5, color:'var(--text-3)', fontWeight:600, marginBottom:multiline ? 8 : 0 }}>{label(k)}</div>
              {multiline ? (
                <>
                  <pre style={{
                    margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word', fontSize:12.5,
                    fontFamily:'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
                    color:'var(--text)', background:'var(--bg-input)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-sm)', padding:'10px 12px', maxHeight:340, overflow:'auto',
                  }}>{str}</pre>
                  <div className="mt-2"><CopyBtn value={str} /></div>
                </>
              ) : (
                <div style={{ fontSize:13, color:'var(--text)', fontWeight:600, textAlign:'right', wordBreak:'break-word' }}>{str}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main hub ───────────────────────────────────────────────── */
export default function CyberHub() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [input, setInput]     = useState('');
  const [file, setFile]       = useState(null);
  const [dataUrl, setDataUrl] = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [query, setQuery]     = useState('');
  const fileRef = useRef(null);

  const spec = activeTool ? getTool(activeTool) : null;

  const openTool = (name) => {
    const s = getTool(name);
    setActiveTool(name);
    setResult(null); setError(''); setFile(null); setDataUrl('');
    setInput(s?.defaultInput || '');
  };
  const closeTool = () => { setActiveTool(null); setResult(null); setError(''); setInput(''); setFile(null); setDataUrl(''); };

  const pickFile = async (f) => {
    if (!f) return;
    setFile(f); setError(''); setResult(null);
    try { setDataUrl(await fileToDataUrl(f)); }
    catch (e) { setError(e.message); }
  };

  const runTool = async () => {
    if (!spec) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const out = await spec.run(input, { file, dataUrl });
      setResult(out ?? 'Done');
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CYBER_CATEGORIES.flatMap(c => c.tools.filter(t => t.toLowerCase().includes(q)).map(t => ({ cat: c, tool: t }))).slice(0, 24);
  }, [query]);

  const canRun = spec && (spec.kind === 'file' ? !!dataUrl : (spec.allowEmpty || !!input.trim()));

  /* ── Tool runner view ─────────────────────────────────────── */
  if (activeTool && spec) {
    const cat = CYBER_CATEGORIES.find(c => c.id === activeCategory);
    return (
      <div className="page">
        <div className="flex items-center gap-3 mb-4">
          <button className="btn btn-secondary btn-sm" onClick={closeTool}>← Back</button>
          <div>
            <div className="page-title" style={{ fontSize:18 }}>{activeTool}</div>
            <div className="page-sub">{cat?.desc || 'Developer utility'}</div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems:'start' }}>
          <div className="card">
            <div className="card-title mb-3">Input</div>

            {spec.kind === 'file' && (
              <div className="form-group">
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                       onChange={e => pickFile(e.target.files?.[0])} />
                <button type="button" className="btn btn-secondary w-full" onClick={() => fileRef.current?.click()}>
                  <ImageIcon size={15} /> {file ? file.name : 'Choose an image…'}
                </button>
                {dataUrl && (
                  <img src={dataUrl} alt="Selected" style={{ maxWidth:'100%', maxHeight:170, marginTop:10, borderRadius:'var(--r-sm)', border:'1px solid var(--border)' }} />
                )}
              </div>
            )}

            {(spec.kind === 'text' || spec.placeholder) && (
              <div className="form-group">
                <label className="form-label">{spec.kind === 'file' ? 'Options' : 'Value'}</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: spec.kind === 'file' ? 60 : 150, fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:13 }}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={spec.placeholder || 'Enter input…'}
                />
              </div>
            )}

            {spec.note && <div className="alert alert-info mb-3" style={{ fontSize:12.5 }}>{spec.note}</div>}

            <button className="btn btn-primary w-full" onClick={runTool} disabled={loading || !canRun}>
              {loading ? <span className="spinner" /> : <><Play size={15} /> Run {activeTool}</>}
            </button>

            {error && <div className="alert alert-danger mt-3">{error}</div>}
          </div>

          <div className="card">
            <div className="card-title mb-3">Results</div>
            {!result && !loading && !error && (
              <div className="page-sub">Run the tool to see results here.</div>
            )}
            {loading && <div className="page-sub">Working…</div>}
            <ResultView data={result} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Category view ────────────────────────────────────────── */
  if (activeCategory) {
    const cat = CYBER_CATEGORIES.find(c => c.id === activeCategory);
    return (
      <div className="page">
        <div className="flex items-center gap-3 mb-4">
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveCategory(null)}>← Back</button>
          <div>
            <div className="page-title" style={{ fontSize:18 }}>{cat.label}</div>
            <div className="page-sub">{cat.desc}</div>
          </div>
        </div>
        <div className="tool-grid">
          {cat.tools.map(tool => (
            <div key={tool} className="tool-card card-hover" onClick={() => openTool(tool)}>
              <div className="tool-card-header">
                <div className="tool-card-icon"><cat.icon size={18} color={cat.color} /></div>
                <span className="badge badge-active">Tool</span>
              </div>
              <div className="tool-card-name">{tool}</div>
              <div className="tool-card-desc">{getTool(tool)?.kind === 'file' ? 'Upload an image and process it instantly' : 'Run instantly in your browser'}</div>
              <div style={{ fontSize:11, color:'var(--brand-2)', fontWeight:700, marginTop:8, display:'flex', alignItems:'center', gap:4 }}>
                Run Tool <ArrowRight size={11} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Hub view ─────────────────────────────────────────────── */
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--text-3)', marginBottom:8 }}>Dev Tools Hub</div>
          <h1 className="page-title">80 Developer Utilities</h1>
          <p className="page-sub" style={{ maxWidth:560 }}>
            Text tools, JSON/data formatters, encoders, security checks, network diagnostics, image utilities and code formatters — all working, most of them instant and fully in-browser.
          </p>
        </div>
      </div>

      <div className="form-group" style={{ maxWidth:420 }}>
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
          <input className="form-input" style={{ paddingLeft:34 }} placeholder="Search 80 tools…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {query.trim() ? (
        <div className="tool-grid">
          {searchHits.length === 0 && <div className="page-sub">No tools match “{query}”.</div>}
          {searchHits.map(({ cat, tool }) => (
            <div key={`${cat.id}-${tool}`} className="tool-card card-hover" onClick={() => { setActiveCategory(cat.id); openTool(tool); }}>
              <div className="tool-card-header">
                <div className="tool-card-icon"><cat.icon size={18} color={cat.color} /></div>
                <span className="badge badge-active">{cat.label}</span>
              </div>
              <div className="tool-card-name">{tool}</div>
              <div className="tool-card-desc">Run instantly</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="hub-grid">
          {CYBER_CATEGORIES.map(cat => (
            <div key={cat.id} className="tool-card card-hover" onClick={() => setActiveCategory(cat.id)}>
              <div className="tool-card-header">
                <div className="tool-card-icon"><cat.icon size={20} color={cat.color} /></div>
                <span className="badge badge-active">{cat.tools.length} tools</span>
              </div>
              <div className="tool-card-name">{cat.label}</div>
              <div className="tool-card-desc">{cat.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
