import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Globe2, FileSearch, TrendingUp, Settings, ArrowRight, Zap } from 'lucide-react';

const RANK_TOOLS = [
  { href:'/rank/projects',   icon:Globe2,      label:'Projects',         sub:'Track keyword rankings across multiple sites',            color:'var(--seo)'  },
  { href:'/rank/reports',    icon:FileSearch,   label:'Audit Reports',    sub:'Full SEO audits with Core Web Vitals & on-page analysis', color:'var(--brand)'},
  { href:'/rank/tools',      icon:Zap,          label:'SEO Tools',        sub:'PageSpeed, WHOIS, backlink checks and 20+ utilities',     color:'var(--cyber)'},
  { href:'/rank/billing',    icon:BarChart3,    label:'Billing & Plans',  sub:'Manage your rank-tracker subscription',                   color:'var(--social)'},
  { href:'/rank/settings',   icon:Settings,     label:'Settings',         sub:'API keys, notification preferences, timezone',           color:'var(--ai)'   },
];

export default function RankHub() {
  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--seo)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>RANK TRACKER</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>PHPRank - Professional SEO Tracking</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:500,lineHeight:1.6 }}>
            Track keyword positions daily, run comprehensive site audits, monitor Core Web Vitals,
            and get actionable on-page recommendations - all automated.
          </p>
          <Link to="/rank/projects" className="btn" style={{ marginTop:16,background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }}>
            View Projects <ArrowRight size={14}/>
          </Link>
        </div>
        <div style={{ position:'absolute',right:0,top:0,width:'40%',height:'100%',opacity:.04,backgroundImage:'var(--brand)',backgroundSize:'22px 22px' }} />
      </div>
      <div className="hub-grid">
        {RANK_TOOLS.map(t => (
          <Link key={t.href} to={t.href} style={{ textDecoration:'none' }}>
            <div className="hub-card">
              <div className="hub-card-icon">
                <t.icon size={22} color={t.color}/>
              </div>
              <div style={{ fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:6 }}>{t.label}</div>
              <div style={{ fontSize:12.5,color:'var(--text-2)',lineHeight:1.5,marginBottom:12 }}>{t.sub}</div>
              <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:t.color }}>Open <ArrowRight size={13}/></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}