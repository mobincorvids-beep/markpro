import React, { useState, useEffect } from 'react';
import { Globe2, Plus, Eye, Edit2, Trash2, BarChart3, ArrowRight, ExternalLink, Star } from 'lucide-react';
import { bioAPI } from '../../services/api';

export default function BioHub() {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState('list'); // list | new

  useEffect(() => {
    bioAPI.getPages().then(r => setPages(r.data.data || r.data || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--bio)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>BIO PAGE BUILDER</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>Your Link-in-Bio Command Centre</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:480,lineHeight:1.6 }}>Create stunning bio pages, campaign landing pages, and social hubs with templates, themes, and analytics.</p>
          <button className="btn" style={{ marginTop:16,background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }} onClick={()=>setView('new')}>
            <Plus size={15}/> Create Bio Page
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg"/></div>
      ) : pages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background:'rgba(245,158,11,.1)' }}><Globe2 size={28} color="var(--bio)"/></div>
          <div className="empty-title">No bio pages yet</div>
          <div className="empty-sub">Create your first bio page to share all your links in one place</div>
          <button className="btn btn-bio mt-4" onClick={()=>setView('new')}><Plus size={15}/> Create First Page</button>
        </div>
      ) : (
        <div>
          <div className="page-header-row">
            <div><div className="page-title">My Bio Pages</div><div className="page-sub">{pages.length} page{pages.length!==1?'s':''}</div></div>
            <button className="btn btn-bio" onClick={()=>setView('new')}><Plus size={15}/> New Page</button>
          </div>
          <div className="hub-grid">
            {pages.map(p => (
              <div key={p._id} className="card" style={{ padding:0,overflow:'hidden' }}>
                <div style={{ height:8,background:'var(--brand)' }} />
                <div style={{ padding:16 }}>
                  <div style={{ fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:4 }}>{p.title || p.name || 'Untitled Page'}</div>
                  <div style={{ fontSize:12,color:'var(--text-3)',marginBottom:10,display:'flex',alignItems:'center',gap:5 }}>
                    <Globe2 size={12}/> {p.slug || p.url || 'No URL'}
                  </div>
                  <div style={{ display:'flex',gap:6 }}>
                    <span className="badge badge-bio">{p.status === 1 ? 'Live' : 'Draft'}</span>
                    {p.views && <span className="badge badge-default"><Eye size={10}/> {p.views}</span>}
                  </div>
                  <div style={{ display:'flex',gap:8,marginTop:14 }}>
                    <button className="btn btn-secondary btn-sm flex-1"><Edit2 size={13}/> Edit</button>
                    <button className="btn btn-ghost btn-sm"><BarChart3 size={13}/></button>
                    <button className="btn btn-ghost btn-sm"><ExternalLink size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
