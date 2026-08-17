export const PLATFORMS = {
  facebook:  { label:'Facebook',  icon:'', color:'#1877f2', bg:'#e7f3ff', charLimit:63206 },
  instagram: { label:'Instagram', icon:'', color:'#e1306c', bg:'#fce4ec', charLimit:2200  },
  twitter:   { label:'Twitter/X', icon:'', color:'#000000', bg:'#f0f0f0', charLimit:280   },
  linkedin:  { label:'LinkedIn',  icon:'', color:'#0a66c2', bg:'#e8f0fb', charLimit:3000  },
  tiktok:    { label:'TikTok',    icon:'', color:'#000000', bg:'#f0f0f0', charLimit:2200  },
  youtube:   { label:'YouTube',   icon:'▶', color:'#ff0000', bg:'#ffe8e8', charLimit:5000  },
  threads:   { label:'Threads',   icon:'', color:'#000000', bg:'#f0f0f0', charLimit:500   },
};

export const TONES = ['Professional','Casual','Friendly','Humorous','Inspirational','Educational','Promotional','Conversational'];
export const STATUS_COLORS = {
  draft:      'badge-gray',
  scheduled:  'badge-blue',
  published:  'badge-green',
  failed:     'badge-red',
  processing: 'badge-yellow',
};

export function platformChip(platform) {
  const p = PLATFORMS[platform] || { label: platform, icon:'', color:'#6b7280', bg:'#f3f4f6' };
  return (
    `<span class="platform-chip platform-${platform}" style="--pc:${p.color};--pbg:${p.bg}">` +
    `${p.icon} ${p.label}</span>`
  );
}

export function getCharLimit(platforms = []) {
  if (!platforms.length) return 63206;
  return Math.min(...platforms.map(p => PLATFORMS[p]?.charLimit || 63206));
}

export function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n/1000000).toFixed(1)+'M';
  if (n >= 1000)    return (n/1000).toFixed(1)+'K';
  return n.toString();
}
