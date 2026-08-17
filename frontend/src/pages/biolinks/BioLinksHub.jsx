import React from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Link2, QrCode, BarChart3, Wrench, ArrowRight } from 'lucide-react';

const BL_TOOLS = [
  { href:'/biolinks/pages',     icon:Globe2,    label:'Bio Pages',        sub:'Build stunning link-in-bio pages with custom themes',  color:'var(--bio)'   },
  { href:'/biolinks/links',     icon:Link2,     label:'Link Shortener',   sub:'Shorten, track and manage URLs with custom slugs',     color:'var(--brand)' },
  { href:'/biolinks/tools',     icon:Wrench,    label:'Link Tools',       sub:'QR code generator, link inspector and more utilities', color:'var(--cyber)' },
  { href:'/biolinks/stats',     icon:BarChart3, label:'Analytics',        sub:'Click tracking, geo, device, and referrer breakdown',  color:'var(--social)'},
];

export default function BioLinksHub() {
  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--bio)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>BIO & LINK TOOLS</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>BioLinks - Pages, Shortener & QR Codes</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:500,lineHeight:1.6 }}>
            Create beautiful bio pages, shorten URLs, generate QR codes, and track every click -
            all from a single unified dashboard.
          </p>
          <Link to="/biolinks/pages" className="btn" style={{ marginTop:16,background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }}>
            My Pages <ArrowRight size={14}/>
          </Link>
        </div>
      </div>
      <div className="tool-grid">
        {BL_TOOLS.map(t => (
          <Link key={t.href} to={t.href} className="tool-card">
            <div className="tool-card-header">
              <span className="tool-card-icon"><t.icon size={17}/></span>
              <span className="badge">BIOLINKS</span>
            </div>
            <div className="tool-card-name">{t.label}</div>
            <div className="tool-card-desc">{t.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}