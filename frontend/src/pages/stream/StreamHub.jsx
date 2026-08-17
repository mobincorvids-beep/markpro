import React, { useState, useEffect } from 'react';
import { Radio, Plus, RefreshCcw, Users, Link2, Activity } from 'lucide-react';
import { streamAPI } from '../../services/api';

export default function StreamHub() {
  const [feed,    setFeed]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    streamAPI.getFeed().then(r => setFeed(r.data.posts || r.data || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const refresh = async () => {
    setLoading(true);
    try { const r = await streamAPI.refreshFeed(); setFeed(r.data.posts || []); } catch{}
    setLoading(false);
  };

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--stream)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>SOCIAL STREAM</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>Unified Social Feed</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:480,lineHeight:1.6 }}>
            Aggregate posts from Twitter/X, Facebook, Instagram, YouTube, TikTok, Reddit, and RSS into embeddable widgets.
          </p>
          <div style={{ display:'flex',gap:10,marginTop:16 }}>
            <button className="btn" style={{ background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }} onClick={refresh}>
              <RefreshCcw size={14}/> Refresh Feed
            </button>
          </div>
        </div>
      </div>
      <div className="stat-grid" style={{ marginBottom:24 }}>
        {[{ label:'Posts',icon:Activity,value:feed.length||0,color:'var(--stream)'},{label:'Accounts',icon:Users,value:'-',color:'var(--brand)'},{label:'Widgets',icon:Link2,value:'-',color:'var(--cyber)'}].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:'rgba(6,182,212,.1)' }}><s.icon size={20} color={s.color}/></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      {loading ? <div className="loading-overlay"><div className="spinner spinner-lg"/></div> :
      feed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background:'rgba(6,182,212,.1)' }}><Radio size={28} color="var(--stream)"/></div>
          <div className="empty-title">No social accounts connected</div>
          <div className="empty-sub">Connect your social accounts to start aggregating posts into embeddable widgets</div>
          <a href="/stream/accounts" className="btn btn-stream mt-4"><Plus size={15}/> Connect Account</a>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {feed.slice(0,20).map((p,i) => (
            <div key={i} className="card" style={{ padding:14 }}>
              <div style={{ display:'flex',gap:12,alignItems:'flex-start' }}>
                <div style={{ width:36,height:36,borderRadius:'50%',background:'var(--bg)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Radio size={16} color="var(--stream)"/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:600,fontSize:13,color:'var(--text)',marginBottom:3 }}>{p.author?.name || p.platform || 'Social Post'}</div>
                  <div style={{ fontSize:13,color:'var(--text-2)',lineHeight:1.5 }}>{p.text || p.content || ''}</div>
                  <div style={{ fontSize:11,color:'var(--text-4)',marginTop:6 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <span className="badge badge-default" style={{ flexShrink:0 }}>{p.platform || 'feed'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
