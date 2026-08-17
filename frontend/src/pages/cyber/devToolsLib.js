// ══════════════════════════════════════════════════════════════
//  Dev Tools Hub — local (in-browser) tool implementations.
//  Every function is pure: (input, opts) => string | object
//  Async allowed. Throw an Error to surface a friendly message.
// ══════════════════════════════════════════════════════════════

/* ─── tiny helpers ─────────────────────────────────────────── */
const need = (v, what = 'Input') => {
  if (!v || !String(v).trim()) throw new Error(`${what} is required`);
  return v;
};
const lines = (t) => t.replace(/\r\n/g, '\n').split('\n');
const j = (o) => JSON.stringify(o, null, 2);

/* ─── MD5 (pure JS, RFC 1321) ──────────────────────────────── */
function md5(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function au(x, y) {
    const l = (x & 0xFFFF) + (y & 0xFFFF);
    return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF);
  }
  function cmn(q, a, b, x, s, t) { return au(rl(au(au(a, q), au(x, t)), s), b); }
  const FF = (a,b,c,d,x,s,t)=>cmn((b&c)|(~b&d),a,b,x,s,t);
  const GG = (a,b,c,d,x,s,t)=>cmn((b&d)|(c&~d),a,b,x,s,t);
  const HH = (a,b,c,d,x,s,t)=>cmn(b^c^d,a,b,x,s,t);
  const II = (a,b,c,d,x,s,t)=>cmn(c^(b|~d),a,b,x,s,t);
  function toBlocks(s) {
    const nb = ((s.length + 8) >> 6) + 1, blk = new Array(nb * 16).fill(0);
    for (let i = 0; i < s.length; i++) blk[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    blk[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
    blk[nb * 16 - 2] = s.length * 8;
    return blk;
  }
  const utf8 = unescape(encodeURIComponent(str));
  const x = toBlocks(utf8);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa=a, ob=b, oc=c, od=d;
    a=FF(a,b,c,d,x[i],7,-680876936);      d=FF(d,a,b,c,x[i+1],12,-389564586);
    c=FF(c,d,a,b,x[i+2],17,606105819);    b=FF(b,c,d,a,x[i+3],22,-1044525330);
    a=FF(a,b,c,d,x[i+4],7,-176418897);    d=FF(d,a,b,c,x[i+5],12,1200080426);
    c=FF(c,d,a,b,x[i+6],17,-1473231341);  b=FF(b,c,d,a,x[i+7],22,-45705983);
    a=FF(a,b,c,d,x[i+8],7,1770035416);    d=FF(d,a,b,c,x[i+9],12,-1958414417);
    c=FF(c,d,a,b,x[i+10],17,-42063);      b=FF(b,c,d,a,x[i+11],22,-1990404162);
    a=FF(a,b,c,d,x[i+12],7,1804603682);   d=FF(d,a,b,c,x[i+13],12,-40341101);
    c=FF(c,d,a,b,x[i+14],17,-1502002290); b=FF(b,c,d,a,x[i+15],22,1236535329);
    a=GG(a,b,c,d,x[i+1],5,-165796510);    d=GG(d,a,b,c,x[i+6],9,-1069501632);
    c=GG(c,d,a,b,x[i+11],14,643717713);   b=GG(b,c,d,a,x[i],20,-373897302);
    a=GG(a,b,c,d,x[i+5],5,-701558691);    d=GG(d,a,b,c,x[i+10],9,38016083);
    c=GG(c,d,a,b,x[i+15],14,-660478335);  b=GG(b,c,d,a,x[i+4],20,-405537848);
    a=GG(a,b,c,d,x[i+9],5,568446438);     d=GG(d,a,b,c,x[i+14],9,-1019803690);
    c=GG(c,d,a,b,x[i+3],14,-187363961);   b=GG(b,c,d,a,x[i+8],20,1163531501);
    a=GG(a,b,c,d,x[i+13],5,-1444681467);  d=GG(d,a,b,c,x[i+2],9,-51403784);
    c=GG(c,d,a,b,x[i+7],14,1735328473);   b=GG(b,c,d,a,x[i+12],20,-1926607734);
    a=HH(a,b,c,d,x[i+5],4,-378558);       d=HH(d,a,b,c,x[i+8],11,-2022574463);
    c=HH(c,d,a,b,x[i+11],16,1839030562);  b=HH(b,c,d,a,x[i+14],23,-35309556);
    a=HH(a,b,c,d,x[i+1],4,-1530992060);   d=HH(d,a,b,c,x[i+4],11,1272893353);
    c=HH(c,d,a,b,x[i+7],16,-155497632);   b=HH(b,c,d,a,x[i+10],23,-1094730640);
    a=HH(a,b,c,d,x[i+13],4,681279174);    d=HH(d,a,b,c,x[i],11,-358537222);
    c=HH(c,d,a,b,x[i+3],16,-722521979);   b=HH(b,c,d,a,x[i+6],23,76029189);
    a=HH(a,b,c,d,x[i+9],4,-640364487);    d=HH(d,a,b,c,x[i+12],11,-421815835);
    c=HH(c,d,a,b,x[i+15],16,530742520);   b=HH(b,c,d,a,x[i+2],23,-995338651);
    a=II(a,b,c,d,x[i],6,-198630844);      d=II(d,a,b,c,x[i+7],10,1126891415);
    c=II(c,d,a,b,x[i+14],15,-1416354905); b=II(b,c,d,a,x[i+5],21,-57434055);
    a=II(a,b,c,d,x[i+12],6,1700485571);   d=II(d,a,b,c,x[i+3],10,-1894986606);
    c=II(c,d,a,b,x[i+10],15,-1051523);    b=II(b,c,d,a,x[i+1],21,-2054922799);
    a=II(a,b,c,d,x[i+8],6,1873313359);    d=II(d,a,b,c,x[i+15],10,-30611744);
    c=II(c,d,a,b,x[i+6],15,-1560198380);  b=II(b,c,d,a,x[i+13],21,1309151649);
    a=II(a,b,c,d,x[i+4],6,-145523070);    d=II(d,a,b,c,x[i+11],10,-1120210379);
    c=II(c,d,a,b,x[i+2],15,718787259);    b=II(b,c,d,a,x[i+9],21,-343485551);
    a=au(a,oa); b=au(b,ob); c=au(c,oc); d=au(d,od);
  }
  const hex = (n) => {
    let s = '';
    for (let i = 0; i < 4; i++) s += ((n >> (i * 8 + 4)) & 0x0F).toString(16) + ((n >> (i * 8)) & 0x0F).toString(16);
    return s;
  };
  return hex(a) + hex(b) + hex(c) + hex(d);
}

async function sha(text, algo = 'SHA-256') {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── TEXT TOOLS ───────────────────────────────────────────── */
export const wordCounter = (t) => {
  need(t);
  const words = t.trim().split(/\s+/).filter(Boolean);
  const freq = {};
  words.forEach(w => { const k = w.toLowerCase().replace(/[^\w']/g, ''); if (k) freq[k] = (freq[k] || 0) + 1; });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([w, n]) => `${w} (${n})`).join(', ');
  return {
    words: words.length,
    characters: t.length,
    charactersNoSpaces: t.replace(/\s/g, '').length,
    sentences: (t.match(/[^.!?]+[.!?]+/g) || []).length || (t.trim() ? 1 : 0),
    paragraphs: t.split(/\n\s*\n/).filter(p => p.trim()).length,
    readingTimeMinutes: Math.max(1, Math.round(words.length / 200)),
    topWords: top,
  };
};
export const characterCounter = (t) => {
  need(t);
  return {
    total: t.length,
    withoutSpaces: t.replace(/\s/g, '').length,
    letters: (t.match(/[a-zA-Z]/g) || []).length,
    digits: (t.match(/\d/g) || []).length,
    spaces: (t.match(/ /g) || []).length,
    lines: lines(t).length,
    bytesUtf8: new TextEncoder().encode(t).length,
  };
};
export const caseConverter = (t) => {
  need(t);
  const w = t.trim().split(/\s+/);
  return {
    UPPERCASE: t.toUpperCase(),
    lowercase: t.toLowerCase(),
    titleCase: t.replace(/\w\S*/g, s => s[0].toUpperCase() + s.slice(1).toLowerCase()),
    sentenceCase: t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()),
    camelCase: w.map((s, i) => i ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s.toLowerCase()).join('').replace(/[^\w]/g, ''),
    PascalCase: w.map(s => s[0].toUpperCase() + s.slice(1).toLowerCase()).join('').replace(/[^\w]/g, ''),
    snake_case: t.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_'),
    'kebab-case': t.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-'),
    aLtErNaTiNg: t.split('').map((c, i) => i % 2 ? c.toLowerCase() : c.toUpperCase()).join(''),
  };
};
export const textReverser = (t) => {
  need(t);
  return {
    reversedCharacters: t.split('').reverse().join(''),
    reversedWords: t.trim().split(/\s+/).reverse().join(' '),
    reversedLines: lines(t).reverse().join('\n'),
  };
};
const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
export const loremIpsum = (t) => {
  const n = Math.min(20, Math.max(1, parseInt(String(t).trim(), 10) || 3));
  const sentence = () => {
    const len = 8 + Math.floor(Math.random() * 10);
    const s = Array.from({ length: len }, () => LOREM[Math.floor(Math.random() * LOREM.length)]).join(' ');
    return s[0].toUpperCase() + s.slice(1) + '.';
  };
  return Array.from({ length: n }, () =>
    Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sentence).join(' ')
  ).join('\n\n');
};
export const duplicateLineRemover = (t) => {
  need(t);
  const all = lines(t);
  const seen = new Set(); const out = [];
  all.forEach(l => { if (!seen.has(l)) { seen.add(l); out.push(l); } });
  return { removed: all.length - out.length, kept: out.length, result: out.join('\n') };
};
export const lineSorter = (t) => {
  need(t);
  const l = lines(t).filter(x => x !== '');
  return {
    ascending: [...l].sort((a, b) => a.localeCompare(b)).join('\n'),
    descending: [...l].sort((a, b) => b.localeCompare(a)).join('\n'),
    byLength: [...l].sort((a, b) => a.length - b.length).join('\n'),
    shuffled: [...l].sort(() => Math.random() - 0.5).join('\n'),
  };
};
export const textCompare = (t) => {
  need(t, 'Two blocks separated by a line containing only "---"');
  const [a = '', b = ''] = t.split(/^\s*---\s*$/m);
  const la = lines(a.trim()), lb = lines(b.trim());
  const diff = [];
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) diff.push(`Line ${i + 1}:\n  A: ${la[i] ?? '(none)'}\n  B: ${lb[i] ?? '(none)'}`);
  }
  return { identical: a.trim() === b.trim(), differences: diff.length, details: diff.join('\n') || 'No differences' };
};
export const whitespaceRemover = (t) => {
  need(t);
  return {
    trimmedLines: lines(t).map(l => l.trim()).join('\n'),
    collapsedSpaces: t.replace(/[ \t]+/g, ' ').trim(),
    allWhitespaceRemoved: t.replace(/\s+/g, ''),
    blankLinesRemoved: lines(t).filter(l => l.trim()).join('\n'),
  };
};
export const sentenceCounter = (t) => {
  need(t);
  const s = (t.match(/[^.!?]+[.!?]+/g) || []).map(x => x.trim());
  const words = t.trim().split(/\s+/).filter(Boolean).length;
  return {
    sentences: s.length,
    words,
    avgWordsPerSentence: s.length ? +(words / s.length).toFixed(1) : 0,
    longest: s.sort((a, b) => b.length - a.length)[0] || '-',
  };
};

/* ─── JSON & DATA ──────────────────────────────────────────── */
const parseJson = (t) => {
  need(t, 'JSON');
  try { return JSON.parse(t); }
  catch (e) { throw new Error(`Invalid JSON: ${e.message}`); }
};
export const jsonFormatter = (t) => j(parseJson(t));
export const jsonValidator = (t) => {
  try { const d = JSON.parse(need(t, 'JSON')); return { valid: true, type: Array.isArray(d) ? 'array' : typeof d, keys: d && typeof d === 'object' ? Object.keys(d).length : 0, bytes: t.length }; }
  catch (e) { return { valid: false, error: e.message }; }
};
export const jsonMinifier = (t) => {
  const min = JSON.stringify(parseJson(t));
  return { original: t.length, minified: min.length, saved: `${(100 - (min.length / t.length) * 100).toFixed(1)}%`, result: min };
};
export const jsonToCsv = (t) => {
  const d = parseJson(t);
  const rows = Array.isArray(d) ? d : [d];
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap(r => Object.keys(r || {})))];
  const esc = (v) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r?.[c])).join(','))].join('\n');
};
const parseCsv = (t) => {
  const rows = []; let row = [], cur = '', q = false;
  const src = t.replace(/\r\n/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"' && src[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
};
export const csvToJson = (t) => {
  need(t, 'CSV');
  const rows = parseCsv(t.trim());
  const head = rows.shift() || [];
  return j(rows.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? '']))));
};
const toYaml = (v, ind = 0) => {
  const pad = '  '.repeat(ind);
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? v.map(x => `${pad}- ${typeof x === 'object' && x !== null ? '\n' + toYaml(x, ind + 1) : toYaml(x, 0)}`).join('\n') : '[]';
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) =>
    typeof x === 'object' && x !== null ? `${pad}${k}:\n${toYaml(x, ind + 1)}` : `${pad}${k}: ${toYaml(x, 0)}`).join('\n');
  if (typeof v === 'string' && /[:#\n]|^\s|\s$/.test(v)) return JSON.stringify(v);
  return String(v);
};
export const jsonToYaml = (t) => toYaml(parseJson(t));
export const yamlToJson = (t) => {
  need(t, 'YAML');
  const stack = [{ indent: -1, val: {} }];
  lines(t).forEach(raw => {
    if (!raw.trim() || /^\s*#/.test(raw)) return;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].val;
    const cast = (s) => {
      if (s === '') return null;
      if (s === 'true') return true; if (s === 'false') return false; if (s === 'null' || s === '~') return null;
      if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
      return s.replace(/^["'](.*)["']$/, '$1');
    };
    if (line.startsWith('- ')) {
      if (!Array.isArray(parent.__arr)) parent.__arr = [];
      parent.__arr.push(cast(line.slice(2).trim()));
      return;
    }
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) return;
    const [, k, v] = m;
    if (v === '') { const child = {}; parent[k.trim()] = child; stack.push({ indent, val: child }); }
    else parent[k.trim()] = cast(v);
  });
  const clean = (o) => {
    if (o && typeof o === 'object') {
      if (Array.isArray(o.__arr) && Object.keys(o).length === 1) return o.__arr;
      Object.keys(o).forEach(k => { o[k] = clean(o[k]); });
    }
    return o;
  };
  return j(clean(stack[0].val));
};
export const xmlFormatter = (t) => {
  need(t, 'XML');
  let depth = 0;
  return t.replace(/>\s*</g, '>\n<').split('\n').map(l => {
    if (/^<\/.+/.test(l)) depth = Math.max(0, depth - 1);
    const out = '  '.repeat(depth) + l.trim();
    if (/^<[^!?/][^>]*[^/]>$/.test(l.trim()) && !/^<.*<\/.*>$/.test(l.trim())) depth++;
    return out;
  }).join('\n');
};
const xmlNodeToObj = (node) => {
  const obj = {};
  Array.from(node.attributes || []).forEach(a => { obj[`@${a.name}`] = a.value; });
  const kids = Array.from(node.children);
  if (!kids.length) {
    const txt = (node.textContent || '').trim();
    return Object.keys(obj).length ? (txt ? { ...obj, '#text': txt } : obj) : txt;
  }
  kids.forEach(k => {
    const v = xmlNodeToObj(k);
    if (obj[k.nodeName] === undefined) obj[k.nodeName] = v;
    else { if (!Array.isArray(obj[k.nodeName])) obj[k.nodeName] = [obj[k.nodeName]]; obj[k.nodeName].push(v); }
  });
  return obj;
};
export const xmlToJson = (t) => {
  need(t, 'XML');
  const doc = new DOMParser().parseFromString(t, 'application/xml');
  const bad = doc.querySelector('parsererror');
  if (bad) throw new Error('Invalid XML');
  return j({ [doc.documentElement.nodeName]: xmlNodeToObj(doc.documentElement) });
};
export const jsonEditor = (t) => {
  const d = parseJson(t);
  const walk = (v, path = '$') => {
    if (Array.isArray(v)) return [{ path, type: 'array', value: `${v.length} items` }, ...v.flatMap((x, i) => walk(x, `${path}[${i}]`))];
    if (v && typeof v === 'object') return [{ path, type: 'object', value: `${Object.keys(v).length} keys` }, ...Object.entries(v).flatMap(([k, x]) => walk(x, `${path}.${k}`))];
    return [{ path, type: v === null ? 'null' : typeof v, value: String(v) }];
  };
  const nodes = walk(d);
  return { totalNodes: nodes.length, formatted: j(d), tree: nodes.slice(0, 200).map(n => `${n.path} : ${n.type} = ${n.value}`).join('\n') };
};

/* ─── ENCODE & DECODE ──────────────────────────────────────── */
const b64enc = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64dec = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0)));
export const base64Encode = (t) => b64enc(need(t));
export const base64Decode = (t) => { try { return b64dec(need(t)); } catch { throw new Error('Not a valid Base64 string'); } };
export const urlEncode = (t) => encodeURIComponent(need(t));
export const urlDecode = (t) => { try { return decodeURIComponent(need(t)); } catch { throw new Error('Not a valid URL-encoded string'); } };
export const htmlEncode = (t) => need(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
export const htmlDecode = (t) => { const d = document.createElement('textarea'); d.innerHTML = need(t); return d.value; };
export const md5Generator = (t) => ({ input: need(t), md5: md5(t), md5Upper: md5(t).toUpperCase() });
export const sha256Hash = async (t) => ({
  'SHA-1': await sha(need(t), 'SHA-1'),
  'SHA-256': await sha(t, 'SHA-256'),
  'SHA-384': await sha(t, 'SHA-384'),
  'SHA-512': await sha(t, 'SHA-512'),
});
export const jwtDecoder = (t) => {
  const parts = need(t, 'JWT').trim().split('.');
  if (parts.length < 2) throw new Error('Not a valid JWT (expected 3 dot-separated parts)');
  const dec = (p) => JSON.parse(b64dec(p.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(p.length / 4) * 4, '=')));
  let header, payload;
  try { header = dec(parts[0]); payload = dec(parts[1]); }
  catch { throw new Error('JWT segments are not valid base64url JSON'); }
  const exp = payload.exp ? new Date(payload.exp * 1000) : null;
  return {
    header: j(header),
    payload: j(payload),
    algorithm: header.alg || '-',
    expiresAt: exp ? exp.toISOString() : 'no exp claim',
    expired: exp ? exp < new Date() : 'unknown',
    signature: parts[2] || '(none)',
  };
};

/* ─── SECURITY (local parts) ───────────────────────────────── */
export const passwordGenerator = (t) => {
  const len = Math.min(128, Math.max(6, parseInt(String(t).trim(), 10) || 16));
  const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*()-_=+[]{}<>?'];
  const all = sets.join('');
  const rnd = (s) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const make = () => {
    let p = sets.map(rnd);
    while (p.length < len) p.push(rnd(all));
    return p.sort(() => Math.random() - 0.5).join('');
  };
  return { length: len, passwords: Array.from({ length: 5 }, make).join('\n') };
};
export const passwordStrength = (t) => {
  const p = need(t, 'Password');
  let score = 0;
  const checks = {
    'length >= 8': p.length >= 8,
    'length >= 12': p.length >= 12,
    'lowercase': /[a-z]/.test(p),
    'uppercase': /[A-Z]/.test(p),
    'digits': /\d/.test(p),
    'symbols': /[^A-Za-z0-9]/.test(p),
    'no repeats': !/(.)\1{2,}/.test(p),
    'not common': !/^(password|123456|qwerty|admin|letmein)/i.test(p),
  };
  Object.values(checks).forEach(v => { if (v) score++; });
  const pool = (/[a-z]/.test(p) ? 26 : 0) + (/[A-Z]/.test(p) ? 26 : 0) + (/\d/.test(p) ? 10 : 0) + (/[^A-Za-z0-9]/.test(p) ? 33 : 0);
  const entropy = Math.round(p.length * Math.log2(pool || 1));
  return {
    score: `${score}/8`,
    label: score >= 7 ? 'Very strong' : score >= 5 ? 'Strong' : score >= 3 ? 'Medium' : 'Weak',
    entropyBits: entropy,
    estimatedCrackTime: entropy > 90 ? 'centuries' : entropy > 70 ? 'years' : entropy > 50 ? 'months' : entropy > 35 ? 'days' : 'instant',
    checks: Object.entries(checks).map(([k, v]) => `${v ? 'PASS' : 'FAIL'}  ${k}`).join('\n'),
  };
};
export const htpasswdGenerator = async (t) => {
  const raw = need(t, 'user:password');
  const [user, ...rest] = raw.trim().split(':');
  const pass = rest.join(':');
  if (!user || !pass) throw new Error('Format must be  username:password');
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');
  const digest = await sha(salt + pass, 'SHA-256');
  return {
    note: 'SHA-256 salted hash (Apache 2.4 supports {SSHA}/bcrypt; use this for reference or nginx auth_basic files generated server-side).',
    htpasswdLine: `${user}:{SHA256}${salt}$${digest}`,
    md5Line: `${user}:${md5(pass)}`,
  };
};

/* ─── DEV UTILITIES ────────────────────────────────────────── */
export const regexTester = (t) => {
  need(t, 'Pattern on line 1, flags on line 2 (optional), test text below');
  const all = lines(t);
  const pattern = all[0];
  const flags = /^[gimsuy]*$/.test(all[1] || '') ? (all[1] || 'g') : 'g';
  const body = all.slice(/^[gimsuy]*$/.test(all[1] || '') ? 2 : 1).join('\n');
  let re;
  try { re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); }
  catch (e) { throw new Error(`Invalid regex: ${e.message}`); }
  const matches = [...body.matchAll(re)];
  return {
    pattern, flags,
    matchCount: matches.length,
    matches: matches.slice(0, 100).map((m, i) => `${i + 1}. "${m[0]}" @ ${m.index}${m.length > 1 ? `  groups: ${JSON.stringify(m.slice(1))}` : ''}`).join('\n') || 'No matches',
  };
};
const CRON_FIELDS = ['minute', 'hour', 'day of month', 'month', 'day of week'];
export const cronGenerator = (t) => {
  const expr = need(t, 'Cron expression').trim();
  const parts = expr.split(/\s+/);
  if (parts.length < 5) throw new Error('Cron needs 5 fields: minute hour day month weekday (e.g. "0 9 * * 1-5")');
  const describe = (v, i) => v === '*' ? `every ${CRON_FIELDS[i]}`
    : v.startsWith('*/') ? `every ${v.slice(2)} ${CRON_FIELDS[i]}s`
    : v.includes('-') ? `${CRON_FIELDS[i]} ${v.replace('-', ' through ')}`
    : v.includes(',') ? `${CRON_FIELDS[i]} ${v}`
    : `${CRON_FIELDS[i]} ${v}`;
  return {
    expression: parts.slice(0, 5).join(' '),
    breakdown: parts.slice(0, 5).map((p, i) => `${CRON_FIELDS[i].padEnd(14)} ${p.padEnd(8)} → ${describe(p, i)}`).join('\n'),
    presets: ['Every minute        * * * * *', 'Hourly              0 * * * *', 'Daily 09:00         0 9 * * *', 'Weekdays 09:00      0 9 * * 1-5', 'Weekly Sunday       0 0 * * 0', 'Monthly 1st         0 0 1 * *'].join('\n'),
  };
};
export const uuidGenerator = (t) => {
  const n = Math.min(50, Math.max(1, parseInt(String(t).trim(), 10) || 5));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));
  return Array.from({ length: n }, uuid).join('\n');
};
const hexToRgb = (h) => {
  let s = h.replace('#', '').trim();
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
};
export const colorPicker = (t) => {
  const c = need(t, 'Color (hex like #3b82f6)');
  const rgb = hexToRgb(c);
  if (!rgb) throw new Error('Enter a hex color, e.g. #3b82f6');
  const { r, g, b } = rgb;
  const [r1, g1, b1] = [r / 255, g / 255, b / 255];
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1), d = max - min;
  let h = 0;
  if (d) h = max === r1 ? ((g1 - b1) / d) % 6 : max === g1 ? (b1 - r1) / d + 2 : (r1 - g1) / d + 4;
  h = Math.round(h * 60); if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const lum = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
  return {
    hex: `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    cmyk: (() => { const k = 1 - Math.max(r1, g1, b1); const f = (x) => k === 1 ? 0 : Math.round(((1 - x - k) / (1 - k)) * 100); return `cmyk(${f(r1)}%, ${f(g1)}%, ${f(b1)}%, ${Math.round(k * 100)}%)`; })(),
    luminance: lum.toFixed(3),
    bestTextColor: lum > 0.5 ? '#000000' : '#ffffff',
    complement: `#${[255 - r, 255 - g, 255 - b].map(v => v.toString(16).padStart(2, '0')).join('')}`,
  };
};
export const cssMinifier = (t) => {
  need(t, 'CSS');
  const out = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1').replace(/;}/g, '}').trim();
  return { original: t.length, minified: out.length, saved: `${(100 - out.length / t.length * 100).toFixed(1)}%`, result: out };
};
export const jsMinifier = (t) => {
  need(t, 'JavaScript');
  const out = t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1')
    .replace(/\n\s*/g, '\n').replace(/\n{2,}/g, '\n')
    .replace(/\s*([=+\-*/%<>!&|,;:?{}()[\]])\s*/g, '$1')
    .trim();
  return { original: t.length, minified: out.length, saved: `${(100 - out.length / t.length * 100).toFixed(1)}%`, result: out };
};
export const htmlMinifier = (t) => {
  need(t, 'HTML');
  const out = t.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
  return { original: t.length, minified: out.length, saved: `${(100 - out.length / t.length * 100).toFixed(1)}%`, result: out };
};
export const sqlFormatter = (t) => {
  need(t, 'SQL');
  const kw = ['SELECT', 'FROM', 'WHERE', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'UNION ALL', 'UNION', 'ON', 'AND', 'OR'];
  let out = t.replace(/\s+/g, ' ').trim();
  kw.forEach(k => { out = out.replace(new RegExp(`\\s${k.replace(/ /g, '\\s+')}\\s`, 'gi'), `\n${k} `); });
  out = out.replace(/,\s*/g, ',\n  ');
  return out.split('\n').map(l => (/^(AND|OR|ON)\b/i.test(l.trim()) ? '  ' + l.trim() : l.trim())).join('\n');
};
export const markdownToHtml = (t) => {
  need(t, 'Markdown');
  let h = htmlEncode(t);
  h = h.replace(/^###### (.*)$/gm, '<h6>$1</h6>').replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>').replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\W)\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^[*-] (.*)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  return h.split(/\n{2,}/).map(b => (/^<(h\d|ul|pre|blockquote|hr|img)/.test(b.trim()) ? b : `<p>${b.replace(/\n/g, '<br />')}</p>`)).join('\n');
};
export const markdownPreview = (t) => ({ html: markdownToHtml(t), __html: markdownToHtml(t) });
export const diffChecker = (t) => {
  need(t, 'Two blocks separated by a line containing only "---"');
  const [a = '', b = ''] = t.split(/^\s*---\s*$/m);
  const la = lines(a.trim()), lb = lines(b.trim());
  const out = []; let add = 0, del = 0, same = 0;
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] === lb[i]) { out.push(`  ${la[i] ?? ''}`); same++; }
    else {
      if (la[i] !== undefined) { out.push(`- ${la[i]}`); del++; }
      if (lb[i] !== undefined) { out.push(`+ ${lb[i]}`); add++; }
    }
  }
  return { added: add, removed: del, unchanged: same, diff: out.join('\n') };
};

/* ─── CODE FORMATTERS ──────────────────────────────────────── */
const indentFormat = (t, openRe = /[{[(]\s*$/, closeRe = /^\s*[}\])]/) => {
  let depth = 0;
  return lines(t).map(l => l.trim()).filter(l => l !== '').map(l => {
    if (closeRe.test(l)) depth = Math.max(0, depth - 1);
    const out = '  '.repeat(depth) + l;
    if (openRe.test(l)) depth++;
    return out;
  }).join('\n');
};
export const cssFormatter = (t) => {
  need(t, 'CSS');
  let depth = 0;
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, ' {\n').replace(/;\s*/g, ';\n').replace(/\s*}\s*/g, '\n}\n')
    .split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      if (l === '}') depth = Math.max(0, depth - 1);
      const out = '  '.repeat(depth) + l;
      if (l.endsWith('{')) depth++;
      return out;
    }).join('\n');
};
export const htmlFormatter = (t) => {
  need(t, 'HTML');
  const VOID = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i;
  let depth = 0;
  return t.replace(/>\s*</g, '>\n<').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    if (/^<\//.test(l)) depth = Math.max(0, depth - 1);
    const out = '  '.repeat(depth) + l;
    if (/^<[a-zA-Z]/.test(l) && !VOID.test(l) && !/\/>$/.test(l) && !/<\/[a-zA-Z][^>]*>\s*$/.test(l)) depth++;
    return out;
  }).join('\n');
};
export const jsFormatter = (t) => {
  need(t, 'JavaScript');
  const spaced = t.replace(/\s*{\s*/g, ' {\n').replace(/;\s*/g, ';\n').replace(/\s*}\s*/g, '\n}\n');
  return indentFormat(spaced);
};
export const phpFormatter = (t) => indentFormat(need(t, 'PHP').replace(/\s*{\s*/g, ' {\n').replace(/;\s*/g, ';\n').replace(/\s*}\s*/g, '\n}\n'));
export const pythonFormatter = (t) => {
  need(t, 'Python');
  let depth = 0;
  return lines(t).map(l => l.trim()).map(l => {
    if (!l) return '';
    if (/^(return|pass|break|continue|raise)\b/.test(l) && depth > 0) { /* keep */ }
    if (/^(elif|else|except|finally)\b/.test(l)) depth = Math.max(0, depth - 1);
    const out = '    '.repeat(depth) + l;
    if (l.endsWith(':')) depth++;
    return out;
  }).join('\n');
};
export const goFormatter = (t) => indentFormat(need(t, 'Go').replace(/\s*{\s*/g, ' {\n').replace(/\s*}\s*/g, '\n}\n'));
export const codeMinifier = (t) => {
  need(t, 'Code');
  const out = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1')
    .split('\n').map(l => l.trim()).filter(Boolean).join(' ').replace(/\s{2,}/g, ' ');
  return { original: t.length, minified: out.length, saved: `${(100 - out.length / t.length * 100).toFixed(1)}%`, result: out };
};
export const svgOptimizer = (t) => {
  need(t, 'SVG');
  const out = t.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(metadata|title|desc)[\s\S]*?<\/\1>/g, '')
    .replace(/\s(id|class|data-name)="[^"]*"/g, '')
    .replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ')
    .replace(/(\d+\.\d{3})\d+/g, '$1').trim();
  return { original: t.length, optimized: out.length, saved: `${(100 - out.length / t.length * 100).toFixed(1)}%`, result: out };
};
export const htmlToMarkdown = (t) => {
  need(t, 'HTML');
  const doc = new DOMParser().parseFromString(t, 'text/html');
  const walk = (n) => {
    if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ');
    if (n.nodeType !== 1) return '';
    const kids = Array.from(n.childNodes).map(walk).join('');
    switch (n.tagName.toLowerCase()) {
      case 'h1': return `\n# ${kids}\n`;
      case 'h2': return `\n## ${kids}\n`;
      case 'h3': return `\n### ${kids}\n`;
      case 'h4': return `\n#### ${kids}\n`;
      case 'h5': return `\n##### ${kids}\n`;
      case 'h6': return `\n###### ${kids}\n`;
      case 'strong': case 'b': return `**${kids}**`;
      case 'em': case 'i': return `*${kids}*`;
      case 'code': return `\`${kids}\``;
      case 'pre': return `\n\`\`\`\n${n.textContent.trim()}\n\`\`\`\n`;
      case 'a': return `[${kids}](${n.getAttribute('href') || ''})`;
      case 'img': return `![${n.getAttribute('alt') || ''}](${n.getAttribute('src') || ''})`;
      case 'li': return `- ${kids}\n`;
      case 'br': return '\n';
      case 'hr': return '\n---\n';
      case 'blockquote': return `\n> ${kids.trim()}\n`;
      case 'p': case 'div': return `\n${kids}\n`;
      default: return kids;
    }
  };
  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
};
export const htmlStripTags = (t) => {
  const doc = new DOMParser().parseFromString(need(t, 'HTML'), 'text/html');
  return doc.body.textContent.replace(/\n{3,}/g, '\n\n').trim();
};

/* ─── HTML-page parsing helpers (used by network tools) ────── */
export const extractMeta = (html, baseUrl = '') => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = {};
  doc.querySelectorAll('meta').forEach(m => {
    const k = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv');
    if (k) meta[k] = m.getAttribute('content') || '';
  });
  return {
    url: baseUrl,
    title: doc.title || '(none)',
    titleLength: (doc.title || '').length,
    description: meta.description || '(none)',
    descriptionLength: (meta.description || '').length,
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '(none)',
    robots: meta.robots || '(none)',
    viewport: meta.viewport || '(none)',
    ogTitle: meta['og:title'] || '(none)',
    ogDescription: meta['og:description'] || '(none)',
    ogImage: meta['og:image'] || '(none)',
    twitterCard: meta['twitter:card'] || '(none)',
    h1Count: doc.querySelectorAll('h1').length,
    imgWithoutAlt: Array.from(doc.querySelectorAll('img')).filter(i => !i.getAttribute('alt')).length,
    allMetaTags: Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n') || '(none)',
  };
};
export const extractLinks = (html, baseUrl = '') => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let host = '';
  try { host = new URL(baseUrl).hostname; } catch { /* ignore */ }
  const abs = (h) => { try { return new URL(h, baseUrl || undefined).href; } catch { return h; } };
  const all = Array.from(doc.querySelectorAll('a[href]')).map(a => abs(a.getAttribute('href')));
  const uniq = [...new Set(all)];
  const internal = uniq.filter(u => { try { return new URL(u).hostname === host; } catch { return false; } });
  const external = uniq.filter(u => !internal.includes(u));
  return {
    totalLinks: all.length,
    uniqueLinks: uniq.length,
    internal: internal.length,
    external: external.length,
    internalList: internal.slice(0, 100).join('\n') || '(none)',
    externalList: external.slice(0, 100).join('\n') || '(none)',
  };
};
const TECH_SIGNATURES = [
  [/wp-content|wp-includes/i, 'WordPress'],
  [/\/_next\/|__NEXT_DATA__/i, 'Next.js'],
  [/nuxt|__NUXT__/i, 'Nuxt'],
  [/data-reactroot|react(-dom)?[.@]/i, 'React'],
  [/ng-version|angular/i, 'Angular'],
  [/vue(\.runtime)?[.@]|data-v-/i, 'Vue.js'],
  [/svelte/i, 'Svelte'],
  [/shopify/i, 'Shopify'],
  [/wix\.com|wixstatic/i, 'Wix'],
  [/squarespace/i, 'Squarespace'],
  [/cdn\.shopify|myshopify/i, 'Shopify CDN'],
  [/bootstrap(\.min)?\.css/i, 'Bootstrap'],
  [/tailwind/i, 'Tailwind CSS'],
  [/jquery/i, 'jQuery'],
  [/googletagmanager/i, 'Google Tag Manager'],
  [/google-analytics|gtag\(/i, 'Google Analytics'],
  [/facebook\.net\/.*fbevents/i, 'Meta Pixel'],
  [/hotjar/i, 'Hotjar'],
  [/cloudflare/i, 'Cloudflare'],
  [/stripe\.com\/v3/i, 'Stripe'],
];
export const detectTech = (html, baseUrl = '') => {
  const found = TECH_SIGNATURES.filter(([re]) => re.test(html)).map(([, n]) => n);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const gen = doc.querySelector('meta[name="generator"]')?.getAttribute('content');
  if (gen) found.push(`Generator: ${gen}`);
  return {
    url: baseUrl,
    detected: found.length,
    technologies: [...new Set(found)].join('\n') || 'No known signatures found',
    scripts: Array.from(doc.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).slice(0, 40).join('\n') || '(none)',
  };
};

/* ─── IMAGE TOOLS (canvas based) ───────────────────────────── */
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not load the image'));
  img.src = src;
});
export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});
export const imageToBase64 = async (_t, { file, dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  return {
    fileName: file?.name || 'image',
    sizeKB: +(((dataUrl.length * 3) / 4) / 1024).toFixed(2),
    mimeType: dataUrl.slice(5, dataUrl.indexOf(';')),
    dataUrl,
    preview: dataUrl,
    base64Only: dataUrl.split(',')[1],
  };
};
export const base64ToImage = async (t) => {
  const raw = need(t, 'Base64 string').trim();
  const src = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`;
  const img = await loadImage(src);
  return { width: img.naturalWidth, height: img.naturalHeight, preview: src };
};
export const imageMetadata = async (_t, { file, dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  const img = await loadImage(dataUrl);
  return {
    fileName: file?.name || '-',
    type: file?.type || dataUrl.slice(5, dataUrl.indexOf(';')),
    sizeKB: file ? +(file.size / 1024).toFixed(2) : +(((dataUrl.length * 3) / 4) / 1024).toFixed(2),
    width: img.naturalWidth,
    height: img.naturalHeight,
    aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
    megapixels: +((img.naturalWidth * img.naturalHeight) / 1e6).toFixed(2),
    lastModified: file?.lastModified ? new Date(file.lastModified).toISOString() : '-',
    preview: dataUrl,
  };
};
export const exifViewer = async (_t, { file, dataUrl } = {}) => {
  if (!file) throw new Error('Choose a JPEG file first');
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);
  const out = { fileName: file.name, sizeKB: +(file.size / 1024).toFixed(2), hasExif: false };
  if (view.getUint16(0) !== 0xFFD8) { out.note = 'Not a JPEG — EXIF only exists in JPEG/TIFF files.'; out.preview = dataUrl; return out; }
  let off = 2;
  while (off < view.byteLength - 4) {
    const marker = view.getUint16(off);
    const size = view.getUint16(off + 2);
    if (marker === 0xFFE1) {
      out.hasExif = true;
      out.exifSegmentBytes = size;
      const tags = { 0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x9003: 'DateTimeOriginal', 0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8827: 'ISO' };
      const base = off + 10;
      const little = view.getUint16(base) === 0x4949;
      try {
        const ifd = base + view.getUint32(base + 4, little);
        const count = view.getUint16(ifd, little);
        const found = [];
        for (let i = 0; i < count; i++) {
          const e = ifd + 2 + i * 12;
          const tag = view.getUint16(e, little);
          if (tags[tag]) found.push(tags[tag]);
        }
        out.tagsPresent = found.join(', ') || '(none readable)';
      } catch { out.tagsPresent = '(could not parse IFD)'; }
      break;
    }
    if ((marker & 0xFF00) !== 0xFF00) break;
    off += 2 + size;
  }
  if (!out.hasExif) out.note = 'No EXIF segment found (often stripped by social platforms).';
  out.preview = dataUrl;
  return out;
};
export const colorExtractor = async (_t, { dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  const img = await loadImage(dataUrl);
  const c = document.createElement('canvas');
  const w = c.width = 100, h = c.height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * 100));
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = {};
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = [data[i], data[i + 1], data[i + 2]].map(v => Math.round(v / 24) * 24).join(',');
    buckets[key] = (buckets[key] || 0) + 1;
  }
  const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  return {
    palette: top.map(([k, n]) => {
      const [r, g, b] = k.split(',').map(Number);
      return `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('')}  rgb(${r},${g},${b})  ${((n / total) * 100).toFixed(1)}%`;
    }).join('\n'),
    swatches: top.map(([k]) => {
      const [r, g, b] = k.split(',').map(Number);
      return `#${[r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('')}`;
    }),
    preview: dataUrl,
  };
};
const drawResized = async (dataUrl, w, h, type = 'image/png', quality) => {
  const img = await loadImage(dataUrl);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL(type, quality);
};
export const imageResize = async (t, { dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  const img = await loadImage(dataUrl);
  const spec = String(t || '').trim();
  let w, h;
  const m = spec.match(/^(\d+)\s*[xX*]\s*(\d+)$/);
  if (m) { w = +m[1]; h = +m[2]; }
  else if (/^\d+$/.test(spec)) { w = +spec; h = Math.round((img.naturalHeight / img.naturalWidth) * w); }
  else { w = Math.round(img.naturalWidth / 2); h = Math.round(img.naturalHeight / 2); }
  const out = await drawResized(dataUrl, w, h);
  return { from: `${img.naturalWidth}x${img.naturalHeight}`, to: `${w}x${h}`, hint: 'Type "800x600" or "800" in the input to set a size.', preview: out, download: out };
};
export const formatConverter = async (t, { dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  const fmt = (String(t || 'png').trim().toLowerCase().replace('jpg', 'jpeg')) || 'png';
  if (!['png', 'jpeg', 'webp'].includes(fmt)) throw new Error('Supported formats: png, jpeg, webp');
  const img = await loadImage(dataUrl);
  const out = await drawResized(dataUrl, img.naturalWidth, img.naturalHeight, `image/${fmt}`, 0.92);
  return { format: fmt, sizeKB: +(((out.length * 3) / 4) / 1024).toFixed(2), preview: out, download: out };
};
export const imageCompressor = async (t, { dataUrl } = {}) => {
  if (!dataUrl) throw new Error('Choose an image file first');
  const q = Math.min(1, Math.max(0.05, (parseFloat(String(t).trim()) || 60) / 100));
  const img = await loadImage(dataUrl);
  const out = await drawResized(dataUrl, img.naturalWidth, img.naturalHeight, 'image/jpeg', q);
  const before = ((dataUrl.length * 3) / 4) / 1024, after = ((out.length * 3) / 4) / 1024;
  return {
    quality: `${Math.round(q * 100)}%`,
    beforeKB: +before.toFixed(2),
    afterKB: +after.toFixed(2),
    saved: `${Math.max(0, 100 - (after / before) * 100).toFixed(1)}%`,
    hint: 'Type a quality number (1-100) in the input.',
    preview: out, download: out,
  };
};
export const faviconExtractor = (t) => {
  const raw = need(t, 'Website URL');
  let host;
  try { host = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname; }
  catch { throw new Error('Enter a valid URL, e.g. example.com'); }
  const sizes = [16, 32, 64, 128, 256];
  return {
    domain: host,
    sources: sizes.map(s => `https://www.google.com/s2/favicons?domain=${host}&sz=${s}`).join('\n'),
    directGuess: `https://${host}/favicon.ico`,
    preview: `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
  };
};

/* ─── MISC ─────────────────────────────────────────────────── */
export const screenshotInfo = (t) => {
  const raw = need(t, 'Website URL');
  let url;
  try { url = new URL(raw.startsWith('http') ? raw : `https://${raw}`); }
  catch { throw new Error('Enter a valid URL'); }
  return {
    url: url.href,
    note: 'Rendered screenshots require a headless browser on the server. Open the live preview below or use the Site Spy module for full page captures.',
    livePreview: url.href,
  };
};

export { md5, sha };
