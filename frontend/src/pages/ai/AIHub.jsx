import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, ImageIcon, Star, Clock, ArrowRight, Zap } from 'lucide-react';

const AI_TOOLS = [
  { href:'/ai/reply',   label:'Social Reply Generator', sub:'Generate AI-powered replies for Twitter, LinkedIn, Instagram, and more with custom tone control.',icon:MessageSquare,color:'var(--ai)', badge:'GPT-4' },
  { href:'/ai/history', label:'Reply History',          sub:'Browse all your previously generated replies, mark favourites, and copy with one click.',       icon:Clock,         color:'var(--brand)',badge:'History' },
  { href:'/ai/images',  label:'AI Image Generator',     sub:'Generate stunning AI images via Stable Diffusion and DALL-E with style controls.',              icon:ImageIcon,     color:'var(--smm)', badge:'SD + DALL-E' },
  { href:'/ai/gallery', label:'Image Gallery',          sub:'Browse your generated images, download, share, or add to favourites.',                          icon:Star,          color:'var(--social)',badge:'Gallery' },
  { href:'/ai/favorites',label:'Favourite Images',      sub:'Your curated collection of favourite AI-generated images.',                                     icon:Star,          color:'var(--bio)', badge:'Saved' },
  { href:'/ai/generate',           label:'Multi-Gen Studio',  sub:'Credit-based studio: text, code, translation, image, speech, transcription & animation in one place.', icon:Zap,           color:'var(--ai)',    badge:'7 Types'  },
  { href:'/ai/generate/text',      label:'Text & Code Generator',sub:'Generate articles, code snippets, and translations from prompt templates.',                          icon:MessageSquare, color:'var(--brand)', badge:'AIGen'    },
  { href:'/ai/generate/speech',    label:'Speech & Transcription',sub:'Text-to-speech, speech-to-text and audio transcription tools.',                                       icon:MessageSquare, color:'var(--cyber)', badge:'AIGen'    },
  { href:'/ai/generate/credits',   label:'AI Credits',        sub:'Purchase credit packages and track your usage across all generators.',                                  icon:Star,           color:'var(--smm)',   badge:'Billing'  },
];

export default function AIHub() {
  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--ai)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
            <Zap size={16} color="var(--text-3)"/>
            <span style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)' }}>AI SUITE</span>
          </div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>AI-Powered Content Generation</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:500,lineHeight:1.6 }}>
            Generate social media replies, create AI images via Stable Diffusion & DALL-E, and build your creative library - all powered by the latest AI models.
          </p>
        </div>
        <div style={{ position:'absolute',right:0,top:0,width:'40%',height:'100%',opacity:.04,backgroundImage:'var(--brand)',backgroundSize:'22px 22px' }} />
      </div>

      <div className="hub-grid">
        {AI_TOOLS.map(tool => (
          <Link key={tool.href} to={tool.href} style={{ textDecoration:'none' }}>
            <div className="hub-card">
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:`rgba(249,115,22,.1)`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <tool.icon size={20} color={tool.color}/>
                </div>
                <span className="badge badge-ai">{tool.badge}</span>
              </div>
              <div style={{ fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:6 }}>{tool.label}</div>
              <div style={{ fontSize:12.5,color:'var(--text-2)',lineHeight:1.5,marginBottom:12 }}>{tool.sub}</div>
              <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:tool.color }}>
                Open <ArrowRight size={13}/>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
