export const GEN_TYPES = {
  text:              { label: 'Text',           icon: '',  color: 'var(--brand)' },
  code:              { label: 'Code',           icon: '',  color: '#8b5cf6' },
  translation:       { label: 'Translation',    icon: '',  color: '#06b6d4' },
  image:             { label: 'Image',          icon: '',  color: '#ec4899' },
  'text-to-speech':  { label: 'Text to Speech', icon: '',  color: '#f59e0b' },
  'speech-to-text':  { label: 'Speech to Text', icon: '',  color: '#10b981' },
  'image-animation': { label: 'Image Animation',icon: '',  color: '#ef4444' },
};

export const GEMINI_TEXT_MODELS = [
  { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro' },
];
// Kept for backward compatibility with any code still importing the old name.
export const OPENAI_TEXT_MODELS = GEMINI_TEXT_MODELS;

export const TTS_VOICES = ['alloy','echo','fable','onyx','nova','shimmer'];
export const TTS_MODELS  = [{ value:'tts-1', label:'TTS-1 (Fast)' }, { value:'tts-1-hd', label:'TTS-1 HD (Quality)' }];

export const IMAGE_SIZES = ['256x256','512x512','1024x1024'];

export const STYLE_PRESETS = [
  'enhance','anime','photographic','digital-art','comic-book',
  'fantasy-art','line-art','analog-film','neon-punk','isometric',
  'low-poly','origami','modeling-compound','3d-model','pixel-art',
];

export const SD_MODELS = [
  { value:'stable-diffusion-xl-1024-v1-0', label:'SDXL 1.0 (1024px)' },
  { value:'stable-diffusion-xl-1024-v0-9', label:'SDXL 0.9 (1024px)' },
  { value:'stable-diffusion-v1-6',          label:'SD v1.6 (512px)'   },
  { value:'stable-diffusion-512-v2-1',      label:'SD v2.1 (512px)'   },
];

export const RESPONSE_LANGUAGES = [
  { code:'en', name:'English' },{ code:'es', name:'Spanish' },{ code:'fr', name:'French' },
  { code:'de', name:'German' },{ code:'it', name:'Italian' },{ code:'pt', name:'Portuguese' },
  { code:'ru', name:'Russian' },{ code:'zh', name:'Chinese (Simplified)' },
  { code:'ja', name:'Japanese' },{ code:'ko', name:'Korean' },{ code:'ar', name:'Arabic' },
  { code:'hi', name:'Hindi' },{ code:'tr', name:'Turkish' },{ code:'nl', name:'Dutch' },
  { code:'pl', name:'Polish' },{ code:'sv', name:'Swedish' },{ code:'da', name:'Danish' },
  { code:'fi', name:'Finnish' },{ code:'no', name:'Norwegian' },{ code:'cs', name:'Czech' },
];

export const PROGRAMMING_LANGUAGES = [
  'JavaScript','Python','TypeScript','Java','C#','C++','Go','Rust',
  'PHP','Ruby','Swift','Kotlin','HTML/CSS','SQL','Bash','R','MATLAB',
];

export function genTypeBadge(type) {
  const t = GEN_TYPES[type];
  return t ? { icon: t.icon, label: t.label, color: t.color } : { icon:'', label: type, color:'#6b7280' };
}
