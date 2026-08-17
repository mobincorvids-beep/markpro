import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { designAPI } from '../../services/api';

// Fabric.js loaded via CDN in index.html: <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
const getFabric = () => window.fabric;

const FONTS = ['Arial','Helvetica','Georgia','Verdana','Times New Roman','Courier New','Impact','Trebuchet MS'];
const SHAPES = [
  { label:'Rect',    icon:'▭', type:'rect' },
  { label:'Circle',  icon:'○', type:'circle' },
  { label:'Triangle',icon:'△', type:'triangle' },
  { label:'Line',    icon:'-', type:'line' },
];

let saveTimeout = null;

export default function DesignEditor() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const canvasRef   = useRef(null);
  const fabricRef   = useRef(null);
  const historyRef  = useRef([]);
  const histIdxRef  = useRef(-1);

  const [project, setProject]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [zoom, setZoom]         = useState(1);
  const [showLayers, setShowLayers]   = useState(true);
  const [showProps, setShowProps]     = useState(true);
  const [layers, setLayers]     = useState([]);

  // ── Load project ─────────────────────────────────────────────
  useEffect(() => {
    designAPI.getProject(id).then(res => {
      setProject(res.data.project);
      setLoading(false);
    }).catch(() => navigate('/design'));
  }, [id, navigate]);

  // ── Init Fabric canvas ────────────────────────────────────────
  useEffect(() => {
    if (!project || !canvasRef.current) return;
    const fabric = getFabric();
    if (!fabric) { alert('Fabric.js not loaded. Add it to your index.html.'); return; }

    const canvas = new fabric.Canvas(canvasRef.current, {
      width:  project.canvas?.width  || 1080,
      height: project.canvas?.height || 1080,
      backgroundColor: project.canvas?.background || '#ffffff',
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Restore saved elements
    if (project.canvas?.elements && Object.keys(project.canvas.elements).length > 0) {
      canvas.loadFromJSON(project.canvas.elements, () => {
        canvas.renderAll();
        pushHistory();
        syncLayers();
      });
    } else {
      pushHistory();
    }

    // Selection events
    canvas.on('selection:created',  e => setSelected(e.selected?.[0] || null));
    canvas.on('selection:updated',  e => setSelected(e.selected?.[0] || null));
    canvas.on('selection:cleared',  ()  => setSelected(null));
    canvas.on('object:modified',    ()  => { autoSave(); syncLayers(); });
    canvas.on('object:added',       ()  => { autoSave(); syncLayers(); });
    canvas.on('object:removed',     ()  => { autoSave(); syncLayers(); });

    return () => { canvas.dispose(); };
  }, [project]); // eslint-disable-line

  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = canvas.toJSON();
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 30) historyRef.current.shift();
    histIdxRef.current = historyRef.current.length - 1;
  }, []);

  const syncLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setLayers([...canvas.getObjects()].reverse().map((obj, i) => ({
      id: obj.__uid || i,
      type: obj.type,
      label: obj.type === 'i-text' ? (obj.text?.slice(0,20) || 'Text') : obj.type,
      visible: obj.visible !== false,
      locked: obj.lockMovementX && obj.lockMovementY,
    })));
  }, []);

  const autoSave = useCallback(() => {
    setSaved(false);
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      setSaving(true);
      try {
        const elements = canvas.toJSON();
        await designAPI.updateProject(id, { canvas: { ...project?.canvas, elements } });
        setSaved(true);
      } catch {}
      setSaving(false);
      pushHistory();
    }, 2000);
  }, [id, project, pushHistory]);

  // ── Tools ──────────────────────────────────────────────────────
  const addText = () => {
    const fabric = getFabric();
    const canvas = fabricRef.current;
    const text = new fabric.IText('Double-click to edit', {
      left: 100, top: 100, fontSize: 48, fontFamily: 'Arial', fill: '#1a1a1a',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setActiveTool('select');
  };

  const addShape = (type) => {
    const fabric = getFabric();
    const canvas = fabricRef.current;
    let obj;
    if (type === 'rect')     obj = new fabric.Rect({ left:100,top:100,width:200,height:150,fill:'var(--brand)' });
    if (type === 'circle')   obj = new fabric.Circle({ left:100,top:100,radius:80,fill:'#10b981' });
    if (type === 'triangle') obj = new fabric.Triangle({ left:100,top:100,width:200,height:180,fill:'#f59e0b' });
    if (type === 'line')     obj = new fabric.Line([50,50,300,50],{ stroke:'#1a1a1a',strokeWidth:3 });
    if (obj) { canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll(); }
    setActiveTool('select');
  };

  const addImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fabric = getFabric();
    const canvas = fabricRef.current;
    const reader = new FileReader();
    reader.onload = (ev) => {
      fabric.Image.fromURL(ev.target.result, (img) => {
        img.scaleToWidth(Math.min(300, canvas.width / 2));
        img.set({ left:50, top:50 });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj) { canvas.remove(obj); canvas.renderAll(); }
  };

  const undo = () => {
    const canvas = fabricRef.current;
    if (!canvas || histIdxRef.current <= 0) return;
    histIdxRef.current--;
    canvas.loadFromJSON(historyRef.current[histIdxRef.current], () => {
      canvas.renderAll(); syncLayers();
    });
  };

  const redo = () => {
    const canvas = fabricRef.current;
    if (!canvas || histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current++;
    canvas.loadFromJSON(historyRef.current[histIdxRef.current], () => {
      canvas.renderAll(); syncLayers();
    });
  };

  const exportCanvas = (format) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = format === 'svg'
      ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(canvas.toSVG())
      : canvas.toDataURL({ format, multiplier: 1 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${project?.title || 'design'}.${format}`;
    a.click();
  };

  const saveThumbnail = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const thumbnail = canvas.toDataURL({ format:'jpeg', multiplier:0.3 });
    try { await designAPI.saveThumbnail(id, { thumbnail }); } catch {}
  };

  const generateShareLink = async () => {
    try {
      const res = await designAPI.generateShare(id);
      const url = res.data.shareUrl;
      await navigator.clipboard.writeText(url).catch(()=>{});
      alert(`Share link copied!\n${url}`);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  // ── Property panel ─────────────────────────────────────────────
  const updateProp = (key, val) => {
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set(key, val);
    canvas.renderAll();
    autoSave();
    setSelected({...obj});
  };

  const bringForward  = () => { const c=fabricRef.current; c?.bringForward(c.getActiveObject()); c?.renderAll(); syncLayers(); };
  const sendBackward  = () => { const c=fabricRef.current; c?.sendBackwards(c.getActiveObject()); c?.renderAll(); syncLayers(); };
  const bringToFront  = () => { const c=fabricRef.current; c?.bringToFront(c.getActiveObject()); c?.renderAll(); syncLayers(); };
  const sendToBack    = () => { const c=fabricRef.current; c?.sendToBack(c.getActiveObject()); c?.renderAll(); syncLayers(); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Top Bar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0, zIndex:10 }}>
        <button className="btn btn-sm" onClick={() => navigate('/design')}>← Back</button>
        <span style={{ fontWeight:500, fontSize:14, flex:1 }}>{project?.title}</span>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{saving ? 'Saving…' : saved ? 'Saved' : 'Unsaved'}</span>
        <button className="btn btn-sm" onClick={undo} title="Undo (Ctrl+Z)">↩</button>
        <button className="btn btn-sm" onClick={redo} title="Redo (Ctrl+Y)">↪</button>
        <select className="input" style={{ width:80, fontSize:12 }} value={Math.round(zoom*100)} onChange={e=>{ const v=+e.target.value/100; setZoom(v); fabricRef.current?.setZoom(v); fabricRef.current?.renderAll(); }}>
          {[25,50,75,100,125,150,200].map(v=><option key={v} value={v}>{v}%</option>)}
        </select>
        <div style={{ display:'flex', gap:4 }}>
          <button className="btn btn-sm" onClick={()=>exportCanvas('png')}>PNG</button>
          <button className="btn btn-sm" onClick={()=>exportCanvas('jpeg')}>JPG</button>
          <button className="btn btn-sm" onClick={()=>exportCanvas('svg')}>SVG</button>
        </div>
        <button className="btn btn-sm" onClick={generateShareLink}>Share</button>
        <button className="btn btn-sm btn-primary" onClick={async ()=>{ await saveThumbnail(); autoSave(); }}>Save</button>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ── Left Toolbar ── */}
        <div style={{ width:52, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', gap:4, flexShrink:0 }}>
          {[
            { id:'select',  icon:'↖', title:'Select' },
            { id:'text',    icon:'T',  title:'Add Text', action:addText },
            { id:'image',   icon:'', title:'Add Image' },
            { id:'delete',  icon:'', title:'Delete Selected', action:deleteSelected },
          ].map(t => (
            <button key={t.id} title={t.title}
              className={`btn btn-sm ${activeTool===t.id?'btn-primary':''}`}
              style={{ width:36, height:36, padding:0, fontSize:t.id==='text'?16:14 }}
              onClick={() => { if(t.action) t.action(); else setActiveTool(t.id); }}>
              {t.icon}
            </button>
          ))}
          {activeTool === 'image' && (
            <label title="Upload image" style={{ cursor:'pointer' }}>
              <span className="btn btn-sm" style={{ width:36, height:36, padding:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>+IMG</span>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={addImage} />
            </label>
          )}
          <div style={{ borderTop:'1px solid var(--border)', width:'100%', margin:'4px 0' }}/>
          {SHAPES.map(s => (
            <button key={s.type} title={`Add ${s.label}`}
              className="btn btn-sm" style={{ width:36, height:36, padding:0, fontSize:16 }}
              onClick={() => addShape(s.type)}>{s.icon}</button>
          ))}
          <div style={{ borderTop:'1px solid var(--border)', width:'100%', margin:'4px 0' }}/>
          <button title="Layers" className={`btn btn-sm ${showLayers?'btn-primary':''}`} style={{ width:36, height:36, padding:0, fontSize:11 }} onClick={()=>setShowLayers(v=>!v)}>≡</button>
          <button title="Properties" className={`btn btn-sm ${showProps?'btn-primary':''}`} style={{ width:36, height:36, padding:0, fontSize:11 }} onClick={()=>setShowProps(v=>!v)}></button>
        </div>

        {/* ── Canvas Area ── */}
        <div style={{ flex:1, overflow:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:24, background:'#e5e7eb' }}>
          <div style={{ boxShadow:'0 4px 24px rgba(0,0,0,.18)', background:'#fff' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* ── Right: Layers + Properties ── */}
        <div style={{ width:240, background:'var(--surface)', borderLeft:'1px solid var(--border)', overflow:'auto', display:'flex', flexDirection:'column', flexShrink:0 }}>

          {/* Layers */}
          {showLayers && (
            <div style={{ borderBottom:'1px solid var(--border)', padding:'10px 12px' }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Layers</div>
              {layers.length === 0 ? <div style={{ fontSize:11, color:'var(--text-muted)' }}>No objects yet</div> :
                layers.map((l, i) => (
                  <div key={i} style={{ fontSize:11, padding:'3px 6px', borderRadius:4, marginBottom:2, background:'var(--bg)', display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                    <span style={{ fontSize:10, opacity:.6 }}>{l.type === 'i-text' ? 'T' : l.type === 'rect' ? '▭' : l.type === 'circle' ? '○' : '▲'}</span>
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.label}</span>
                  </div>
                ))
              }
            </div>
          )}

          {/* Properties */}
          {showProps && selected && (
            <div style={{ padding:'10px 12px' }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Properties - {selected.type}</div>

              {/* Position & Size */}
              <div style={{ fontSize:11, fontWeight:500, marginBottom:4, color:'var(--text-muted)' }}>Position & Size</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
                {[['left','X'],['top','Y'],['scaleX','Scale X'],['scaleY','Scale Y'],['angle','Rotation']].map(([k,label])=>(
                  <div key={k}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>{label}</div>
                    <input type="number" className="input" style={{ fontSize:11, padding:'3px 6px' }}
                      value={Math.round((selected[k]||0)*100)/100}
                      onChange={e => updateProp(k, +e.target.value)} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>Opacity</div>
                  <input type="range" min="0" max="1" step="0.01"
                    value={selected.opacity ?? 1}
                    onChange={e => updateProp('opacity', +e.target.value)} style={{ width:'100%' }} />
                </div>
              </div>

              {/* Fill / Stroke */}
              <div style={{ fontSize:11, fontWeight:500, marginBottom:4, color:'var(--text-muted)' }}>Fill & Stroke</div>
              <div style={{ display:'flex', gap:6, marginBottom:10, alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, marginBottom:2 }}>Fill</div>
                  <input type="color" value={selected.fill || '#000000'}
                    onChange={e => updateProp('fill', e.target.value)} style={{ width:40, height:28, cursor:'pointer', border:'none', padding:0 }} />
                </div>
                <div>
                  <div style={{ fontSize:10, marginBottom:2 }}>Stroke</div>
                  <input type="color" value={selected.stroke || '#000000'}
                    onChange={e => updateProp('stroke', e.target.value)} style={{ width:40, height:28, cursor:'pointer', border:'none', padding:0 }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, marginBottom:2 }}>Width</div>
                  <input type="number" className="input" style={{ fontSize:11, padding:'3px 6px' }} min="0" max="20"
                    value={selected.strokeWidth || 0}
                    onChange={e => updateProp('strokeWidth', +e.target.value)} />
                </div>
              </div>

              {/* Text properties */}
              {selected.type === 'i-text' && (
                <>
                  <div style={{ fontSize:11, fontWeight:500, marginBottom:4, color:'var(--text-muted)' }}>Text</div>
                  <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                    <select className="input" style={{ fontSize:11, padding:'3px 6px', flex:1 }}
                      value={selected.fontFamily || 'Arial'}
                      onChange={e => updateProp('fontFamily', e.target.value)}>
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input type="number" className="input" style={{ fontSize:11, padding:'3px 6px', width:56 }} min="8" max="200"
                      value={selected.fontSize || 24}
                      onChange={e => updateProp('fontSize', +e.target.value)} />
                  </div>
                  <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                    {[['fontWeight','bold','B'],['fontStyle','italic','I'],['underline',true,'U']].map(([k,v,label])=>(
                      <button key={k} className={`btn btn-sm ${selected[k]===v?'btn-primary':''}`}
                        style={{ flex:1, fontWeight:k==='fontWeight'?'bold':'normal', fontStyle:k==='fontStyle'?'italic':'normal', textDecoration:k==='underline'?'underline':'none' }}
                        onClick={() => updateProp(k, selected[k]===v ? (k==='fontWeight'?'normal':k==='fontStyle'?'normal':false) : v)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Layer order */}
              <div style={{ fontSize:11, fontWeight:500, marginBottom:6, color:'var(--text-muted)' }}>Layer Order</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
                <button className="btn btn-sm" onClick={bringToFront}>⤒ Front</button>
                <button className="btn btn-sm" onClick={sendToBack}>⤓ Back</button>
                <button className="btn btn-sm" onClick={bringForward}>↑ Forward</button>
                <button className="btn btn-sm" onClick={sendBackward}>↓ Backward</button>
              </div>

              <button className="btn btn-danger btn-sm w-full" onClick={deleteSelected}>Delete Object</button>
            </div>
          )}
          {showProps && !selected && (
            <div style={{ padding:'10px 12px' }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Canvas</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>Background</div>
              <input type="color" value={project?.canvas?.background || '#ffffff'}
                onChange={async e => {
                  const c = fabricRef.current;
                  if (c) { c.backgroundColor = e.target.value; c.renderAll(); autoSave(); }
                }} style={{ width:'100%', height:32, cursor:'pointer', border:'none', padding:0 }} />
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
                {project?.canvas?.width}×{project?.canvas?.height}px
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
