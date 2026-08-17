import React from 'react';
import { PLATFORMS } from '../../utils/platforms';

export default function PlatformChip({ platform, size = 'sm' }) {
  const p = PLATFORMS[platform] || { label: platform, icon: '', color: '#6b7280', bg: '#f3f4f6' };
  const pad = size === 'xs' ? '2px 7px' : '3px 10px';
  const fs  = size === 'xs' ? 10 : 11;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:pad, borderRadius:999, fontSize:fs, fontWeight:700, background:p.bg, color:p.color }}>
      {p.icon} {p.label}
    </span>
  );
}
