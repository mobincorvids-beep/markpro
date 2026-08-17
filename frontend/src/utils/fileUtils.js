// File type → icon/color mapping
const TYPE_MAP = {
  pdf:  { icon: '', color: '#dc2626' },
  doc:  { icon: '', color: '#2563eb' }, docx: { icon: '', color: '#2563eb' },
  xls:  { icon: '', color: '#059669' }, xlsx: { icon: '', color: '#059669' }, csv: { icon: '', color: '#059669' },
  ppt:  { icon: '', color: '#ea580c' }, pptx: { icon: '', color: '#ea580c' },
  txt:  { icon: '', color: '#6b7280' }, md: { icon: '', color: '#6b7280' },
  jpg:  { icon: '', color: '#9333ea' }, jpeg: { icon: '', color: '#9333ea' }, png: { icon: '', color: '#9333ea' }, gif: { icon: '', color: '#9333ea' }, svg: { icon: '', color: '#9333ea' }, webp: { icon: '', color: '#9333ea' },
  mp4:  { icon: '', color: '#0891b2' }, mov: { icon: '', color: '#0891b2' }, avi: { icon: '', color: '#0891b2' }, webm: { icon: '', color: '#0891b2' },
  mp3:  { icon: '', color: '#db2777' }, wav: { icon: '', color: '#db2777' },
  zip:  { icon: '', color: '#78716c' }, rar: { icon: '', color: '#78716c' }, '7z': { icon: '', color: '#78716c' }, tar: { icon: '', color: '#78716c' }, gz: { icon: '', color: '#78716c' },
  js:   { icon: '', color: '#ca8a04' }, ts: { icon: '', color: '#ca8a04' }, jsx: { icon: '', color: '#ca8a04' }, tsx: { icon: '', color: '#ca8a04' }, py: { icon: '', color: '#ca8a04' }, html: { icon: '', color: '#ca8a04' }, css: { icon: '', color: '#ca8a04' }, json: { icon: '', color: '#ca8a04' },
};

export function getFileIcon(ext = '') {
  return TYPE_MAP[ext.toLowerCase()]?.icon || '';
}
export function getFileColor(ext = '') {
  return TYPE_MAP[ext.toLowerCase()]?.color || '#6b7280';
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function canPreview(ext = '', mimeType = '') {
  const e = ext.toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg','bmp'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (['mp4','webm','mov','ogg'].includes(e)) return 'video';
  if (['mp3','wav','ogg'].includes(e)) return 'audio';
  if (['txt','md','json','csv','log'].includes(e) || mimeType?.startsWith('text/')) return 'text';
  return null;
}

export const DOCUMENT_TYPES = [
  'General','Contract','Invoice','Report','Proposal','Policy','HR','Legal',
  'Financial','Marketing','Technical','Personal','Requested','Other',
];
