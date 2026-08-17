import React from 'react';
export default function RotatingLayout({ posts=[] }) {
  return <div className="flex-col gap-3">{posts.map((p,i)=><div key={i} style={{padding:12,background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>{p.text||p.content||''}</div>)}</div>;
}
