import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Upload, Share2, Bell, Shield, HardDrive, ArrowRight, Plus } from 'lucide-react';
import { docsAPI } from '../../services/api';

const DOCS_FEATURES = [
  { href:'/docs/drive',    icon:FolderOpen, label:'Document Drive',   sub:'Upload, organise and manage all your files in nested folders', color:'var(--brand)' },
  { href:'/docs/requests', icon:Share2,     label:'File Requests',    sub:'Request files from clients or team members via secure links',   color:'var(--seo)'  },
  { href:'/docs/shared',   icon:Shield,     label:'Shared With Me',   sub:'Files shared with you by others',                              color:'var(--social)'},
];

export default function DocsHub() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    docsAPI.getStats().then(r => setStats(r.data)).catch(()=>{});
  }, []);

  const formatBytes = (b) => {
    if (!b) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
    return (b/1073741824).toFixed(2) + ' GB';
  };

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--stream)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>DOCUMENT VAULT</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>DocManage - Secure File Storage & Sharing</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:500,lineHeight:1.6 }}>
            Upload documents, organise into folders, share securely, request files from clients,
            and maintain a full audit trail of every action.
          </p>
          <div style={{ display:'flex',gap:10,marginTop:16 }}>
            <Link to="/docs/drive" className="btn" style={{ background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }}>
              <FolderOpen size={14}/> Open Drive
            </Link>
            <Link to="/docs/requests" className="btn" style={{ background:'rgba(255,255,255,.08)',color:'var(--text-3)',border:'1px solid rgba(255,255,255,.1)' }}>
              <Share2 size={14}/> File Requests
            </Link>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stat-grid" style={{ marginBottom:24 }}>
          {[
            { label:'Total Files',   value: stats.totalFiles   || 0,           icon:FolderOpen, color:'var(--brand)',  bg:'var(--brand-light)' },
            { label:'Storage Used',  value: formatBytes(stats.storageUsed||0), icon:HardDrive,  color:'var(--seo)',    bg:'rgba(14,165,233,.1)' },
            { label:'Shared Files',  value: stats.sharedFiles  || 0,           icon:Share2,     color:'var(--social)', bg:'rgba(16,185,129,.1)' },
            { label:'Pending Requests',value:stats.pendingRequests||0,         icon:Bell,       color:'var(--warning)',bg:'var(--warning-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="hub-grid">
        {DOCS_FEATURES.map(f => (
          <Link key={f.href} to={f.href} style={{ textDecoration:'none' }}>
            <div className="hub-card">
              <div className="hub-card-icon">
                <f.icon size={22} color={f.color}/>
              </div>
              <div style={{ fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:6 }}>{f.label}</div>
              <div style={{ fontSize:12.5,color:'var(--text-2)',lineHeight:1.5,marginBottom:12 }}>{f.sub}</div>
              <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:f.color }}>Open <ArrowRight size={13}/></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}