import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { designAPI } from '../../services/api';

function ProjectCard({ project, onDelete, onDuplicate }) {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ position:'relative', cursor:'pointer' }}
         onClick={() => navigate(`/design/editor/${project._id}`)}>
      <div style={{ height:140, background:'#f5f5f5', borderRadius:8, marginBottom:12, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {project.thumbnail
          ? <img src={project.thumbnail} alt={project.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontSize:32 }}></span>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontWeight:500, fontSize:14 }}>{project.title}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            {project.canvas?.width}×{project.canvas?.height} · {new Date(project.updatedAt||project.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm" onClick={() => onDuplicate(project._id)} title="Duplicate">⧉</button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(project._id)} title="Delete"></button>
        </div>
      </div>
    </div>
  );
}

const PRESETS = [
  { label:'Instagram Post', width:1080, height:1080 },
  { label:'Instagram Story', width:1080, height:1920 },
  { label:'Facebook Post', width:1200, height:630 },
  { label:'YouTube Thumbnail', width:1280, height:720 },
  { label:'Twitter/X Post', width:1600, height:900 },
  { label:'LinkedIn Banner', width:1584, height:396 },
  { label:'A4 Document', width:794, height:1123 },
  { label:'Presentation 16:9', width:1280, height:720 },
  { label:'Custom Size', width:0, height:0 },
];

export default function DesignDashboard() {
  const navigate     = useNavigate();
  const [projects, setProjects]   = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('projects');
  const [showNew, setShowNew]     = useState(false);
  const [preset, setPreset]       = useState(PRESETS[0]);
  const [customW, setCustomW]     = useState(1080);
  const [customH, setCustomH]     = useState(1080);
  const [search, setSearch]       = useState('');

  const load = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        designAPI.getProjects({ page:1, limit:50 }),
        designAPI.getTemplates({ page:1, limit:48 }),
      ]);
      setProjects(pRes.data.projects || []);
      setTemplates(tRes.data.templates || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const w = preset.label === 'Custom Size' ? +customW : preset.width;
    const h = preset.label === 'Custom Size' ? +customH : preset.height;
    try {
      const res = await designAPI.createProject({
        title: `${preset.label} - ${new Date().toLocaleDateString()}`,
        canvas: { width: w, height: h, background:'#ffffff', elements:[] },
      });
      navigate(`/design/editor/${res.data.project._id}`);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleUseTemplate = async (id) => {
    try {
      const res = await designAPI.useTemplate(id);
      navigate(`/design/editor/${res.data.project._id}`);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    await designAPI.deleteProject(id);
    setProjects(p => p.filter(x => x._id !== id));
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await designAPI.duplicateProject(id);
      setProjects(p => [res.data.project, ...p]);
    } catch {}
  };

  const filtered = projects.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()));
  const filteredTpl = templates.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Design Studio</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Design</button>
          <Link to="/design/media"><button className="btn">Media Library</button></Link>
        </div>
      </div>

      {showNew && (
        <div className="card mb-2">
          <h3 style={{ marginBottom:16 }}>Create New Design</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8, marginBottom:16 }}>
            {PRESETS.map(p => (
              <button key={p.label} className={`btn ${preset.label===p.label?'btn-primary':''}`}
                      style={{ textAlign:'left', padding:'8px 12px', display:'flex', flexDirection:'column', gap:2 }}
                      onClick={() => setPreset(p)}>
                <span style={{ fontWeight:500, fontSize:13 }}>{p.label}</span>
                {p.width > 0 && <span style={{ fontSize:11, opacity:.7 }}>{p.width}×{p.height}px</span>}
              </button>
            ))}
          </div>
          {preset.label === 'Custom Size' && (
            <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
              <label style={{ fontSize:13 }}>Width (px)</label>
              <input type="number" className="input" style={{ width:100 }} value={customW} onChange={e=>setCustomW(e.target.value)} min="100" max="5000" />
              <label style={{ fontSize:13 }}>Height (px)</label>
              <input type="number" className="input" style={{ width:100 }} value={customH} onChange={e=>setCustomH(e.target.value)} min="100" max="5000" />
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={handleCreate}>Create Design</button>
            <button className="btn" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="tab-bar mb-2">
        {['projects','templates'].map(t => (
          <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)} {t==='projects'?`(${projects.length})`:`(${templates.length})`}
          </button>
        ))}
        <input className="input ml-auto" style={{ width:200 }} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {tab === 'projects' && (
        filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon"></div><p>No designs yet.</p><button className="btn btn-primary" onClick={() => setShowNew(true)}>Create your first design</button></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
              {filtered.map(p => <ProjectCard key={p._id} project={p} onDelete={handleDelete} onDuplicate={handleDuplicate} />)}
            </div>
      )}

      {tab === 'templates' && (
        filteredTpl.length === 0
          ? <div className="empty-state"><p>No templates found.</p></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
              {filteredTpl.map(t => (
                <div key={t._id} className="card" style={{ cursor:'pointer', position:'relative' }}>
                  <div style={{ height:120, background:'#f5f5f5', borderRadius:6, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                    {t.thumbnail ? <img src={t.thumbnail} alt={t.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:28 }}></span>}
                    {t.isPremium && <span style={{ position:'absolute', top:8, right:8, background:'#f59e0b', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:10 }}>PRO</span>}
                  </div>
                  <div style={{ fontWeight:500, fontSize:13, marginBottom:8 }}>{t.title}</div>
                  <button className="btn btn-primary btn-sm w-full" onClick={() => handleUseTemplate(t._id)}>Use Template</button>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
