import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Users, Megaphone, Bot, FileText, Settings, Zap } from 'lucide-react';
import { whatsappAPI } from '../../services/api';

const WA_SECTIONS = [
  { href:'/whatsapp/chat',      icon:MessageCircle, label:'Live Chat',       sub:'Real-time WhatsApp inbox with canned replies & AI assist',  color:'#25d366' },
  { href:'/whatsapp/contacts',  icon:Users,         label:'Contacts',        sub:'Manage leads, customers and groups with custom tags',        color:'var(--brand)' },
  { href:'/whatsapp/campaigns', icon:Megaphone,     label:'Campaigns',       sub:'Broadcast template messages to segmented audiences',         color:'var(--smm)'   },
  { href:'/whatsapp/bots',      icon:Bot,           label:'Bots & Automation',sub:'Keyword-triggered auto-replies and welcome messages',       color:'var(--ai)'    },
  { href:'/whatsapp/templates', icon:FileText,      label:'Templates',       sub:'Sync and manage approved WhatsApp message templates',        color:'var(--seo)'   },
  { href:'/whatsapp/settings',  icon:Settings,      label:'Settings',        sub:'Phone ID, API token, canned replies and AI prompts',        color:'var(--cyber)' },
];

export default function WhatsAppHub() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    whatsappAPI.getDashboard().then(r => setStats(r.data)).catch(()=>{});
  }, []);

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--wa-green)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
            <div className="page-banner-icon" style={{ width:36,height:36 }}>
              <MessageCircle size={20}/>
            </div>
            <span style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)' }}>WHATSAPP MARKETING</span>
          </div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,marginBottom:8 }}>WhatsMark - WhatsApp Business Suite</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:500,lineHeight:1.6 }}>
            Live chat inbox, broadcast campaigns, smart bots, template messages, and contact management -
            powered by the WhatsApp Business API.
          </p>
          <Link to="/whatsapp/chat" className="btn" style={{ marginTop:16,background:'var(--bg-card)',color:'var(--text)',border:'1px solid var(--border)' }}>
            <MessageCircle size={14}/> Open Live Chat
          </Link>
        </div>
        <div style={{ position:'absolute',right:0,top:0,width:'40%',height:'100%',opacity:.04,backgroundImage:'var(--brand)',backgroundSize:'22px 22px' }} />
      </div>

      {stats && (
        <div className="stat-grid" style={{ marginBottom:24 }}>
          {[
            { label:'Total Contacts',  value: stats.totalContacts    || 0, icon:Users,        color:'#25d366', bg:'rgba(37,211,102,.1)' },
            { label:'Total Chats',     value: stats.totalChats       || 0, icon:MessageCircle,color:'var(--brand)', bg:'var(--brand-light)' },
            { label:'Campaigns',       value: stats.totalCampaigns   || 0, icon:Megaphone,    color:'var(--smm)', bg:'rgba(236,72,153,.1)' },
            { label:'Active Bots',     value: stats.activeBots       || 0, icon:Bot,          color:'var(--ai)',  bg:'rgba(249,115,22,.1)' },
            { label:'Unread Chats',    value: stats.unreadChats      || 0, icon:Zap,          color:'var(--warning)', bg:'var(--warning-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tool-grid">
        {WA_SECTIONS.map(s => (
          <Link key={s.href} to={s.href} className="tool-card">
            <div className="tool-card-header">
              <span className="tool-card-icon"><s.icon size={17}/></span>
              <span className="badge">WHATSAPP</span>
            </div>
            <div className="tool-card-name">{s.label}</div>
            <div className="tool-card-desc">{s.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}