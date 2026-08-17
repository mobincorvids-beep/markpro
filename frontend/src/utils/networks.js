export const NETWORKS = {
  twitter: {
    label: 'Twitter / X',
    color: '#1DA1F2',
    darkColor: '#0d8ecf',
    icon: 'FaXTwitter',
    placeholder: 'username (without @)',
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    darkColor: '#0f5bbf',
    icon: 'FaFacebook',
    placeholder: 'Page ID or username',
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    darkColor: '#b3254f',
    icon: 'FaInstagram',
    placeholder: 'Instagram username',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    darkColor: '#cc0000',
    icon: 'FaYoutube',
    placeholder: 'Channel ID (UCxxxxxxx)',
  },
  reddit: {
    label: 'Reddit',
    color: '#FF4500',
    darkColor: '#cc3700',
    icon: 'FaReddit',
    placeholder: 'Subreddit name (no r/) or u/username',
  },
  tiktok: {
    label: 'TikTok',
    color: '#010101',
    darkColor: '#333',
    icon: 'FaTiktok',
    placeholder: 'TikTok username',
  },
  rss: {
    label: 'RSS Feed',
    color: '#F26522',
    darkColor: '#c0501a',
    icon: 'FaRss',
    placeholder: 'Full RSS feed URL',
  },
  pinterest: {
    label: 'Pinterest',
    color: '#E60023',
    darkColor: '#b5001c',
    icon: 'FaPinterest',
    placeholder: 'Pinterest username',
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    darkColor: '#07509a',
    icon: 'FaLinkedin',
    placeholder: 'LinkedIn page slug',
  },
};

export const LAYOUTS = [
  { value: 'wall',      label: 'Wall (Masonry)' },
  { value: 'timeline',  label: 'Timeline' },
  { value: 'carousel',  label: 'Carousel' },
  { value: 'rotating',  label: 'Rotating Feed' },
  { value: 'tabbed',    label: 'Ajax Tabbed Feed' },
  { value: 'ticker',    label: 'Ticker' },
];

export const THEMES = [
  { value: 'modern', label: 'Modern' },
  { value: 'flat',   label: 'Flat' },
  { value: 'default',label: 'Default' },
  { value: 'dark',   label: 'Dark' },
];
