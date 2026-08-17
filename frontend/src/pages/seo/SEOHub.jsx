import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Link2, BarChart3, TrendingUp, FileSearch, Globe2, Code2, Image as Img, Cpu } from 'lucide-react';
import { seoAPI } from '../../services/api';
import SeoResultView from './SeoResultView';

// Deep links from the sidebar (e.g. /seo/audit) map straight to a category +
// tool, instead of always falling back to the generic hub screen.
const ROUTE_MAP = {
  '/seo/audit': { category: 'technical', tool: 'audit' },
};

const SEO_CATEGORIES = [
  { id:'keyword',   label:'Keyword Research',  color:'var(--seo)',   icon:TrendingUp, desc:'Find high-value keywords',
    tools:[{id:'keyword-ideas',name:'Keyword Generator',backend:'keywords-suggestion-tool'},{id:'keyword-difficulty',name:'Keyword Difficulty',backend:'keyword-difficulty'},{id:'keyword-density',name:'Keyword Density',backend:'keyword-density-checker'},{id:'long-tail',name:'Long-tail Keywords',backend:'long-tail-keywords'},{id:'related-keywords',name:'Related Keywords',backend:'related-keywords'},{id:'lsi-keywords',name:'LSI Keywords',backend:'lsi-keywords'},{id:'keyword-gap',name:'Keyword Gap',backend:'keyword-gap',fields:[{name:'domain1',label:'Your domain',type:'text'},{name:'domain2',label:'Competitor domain',type:'text'}]},{id:'keywords-everywhere',name:'Keywords Everywhere',backend:'keywords-everywhere'},{id:'youtube-keywords',name:'YouTube Keywords',backend:'youtube-keywords'},{id:'amazon-keywords',name:'Amazon Keywords',backend:'amazon-keywords'}]},
  { id:'on-page',   label:'On-Page SEO',        color:'var(--brand)',  icon:FileSearch, desc:'Optimise every page',
    tools:[{id:'meta-generator',name:'Meta Tag Generator',backend:'meta-tag-generator'},{id:'title-tag',name:'Title Tag Analyser',backend:'meta-tags-analyzer'},{id:'og-generator',name:'Open Graph Generator',backend:'open-graph-checker'},{id:'schema-gen',name:'Schema Generator',backend:'schema-generator'},{id:'hreflang',name:'Hreflang Tag Gen',backend:'hreflang-generator'},{id:'canonical',name:'Canonical URL Gen',backend:'meta-tags-analyzer'},{id:'robots-txt',name:'Robots.txt Gen',backend:'robots-txt-generator'},{id:'sitemap-gen',name:'XML Sitemap Gen',backend:'xml-sitemap-generator'},{id:'heading-checker',name:'Heading Checker',backend:'meta-tags-analyzer'},{id:'word-counter',name:'Word Counter',backend:'word-counter'}]},
  { id:'technical', label:'Technical SEO',      color:'var(--cyber)',  icon:Cpu, desc:'Technical health checks',
    tools:[{id:'audit',name:'Site Audit',backend:'audit'},{id:'page-speed',name:'Page Speed Checker',backend:'pagespeed-insights-checker'},{id:'mobile-friendly',name:'Mobile Friendly',backend:'mobile-friendly-check'},{id:'core-web-vitals',name:'Core Web Vitals',backend:'pagespeed-insights-checker'},{id:'broken-links',name:'Broken Link Checker',backend:'broken-links-finder'},{id:'redirect-check',name:'Redirect Checker',backend:'redirect-checker'},{id:'ssl-check',name:'SSL Checker',backend:'ssl-checker'},{id:'crawl-depth',name:'Crawl Depth Analyser',backend:'spider-simulator'},{id:'structured-data',name:'Structured Data Tester',backend:'structured-data-tester'},{id:'amp-check',name:'AMP Validator',backend:'amp-validator'}]},
  { id:'backlinks', label:'Link Building',      color:'var(--stream)', icon:Link2, desc:'Build and analyse links',
    tools:[{id:'backlink-checker',name:'Backlink Checker',backend:'backlinks'},{id:'authority-check',name:'Authority Checker',backend:'authority-checker'},{id:'link-explorer',name:'Link Explorer',backend:'link-analyzer-tool'},{id:'broken-backlinks',name:'Broken Backlinks',backend:'broken-links-finder'},{id:'disavow',name:'Disavow Tool',backend:'disavow-generator'},{id:'anchor-text',name:'Anchor Text Analyser',backend:'link-analyzer-tool'}]},
  { id:'content',   label:'Content & AI',       color:'var(--ai)',     icon:Code2, desc:'AI-powered content tools',
    tools:[{id:'readability',name:'Readability Analyser',backend:'readability-analyser'},{id:'plagiarism',name:'Plagiarism Checker',backend:'plagiarism-checker'},{id:'ai-detector',name:'AI Content Detector',backend:'ai-content-detector'},{id:'grammar-check',name:'Grammar Checker',backend:'grammar-checker'},{id:'content-rewriter',name:'Content Rewriter',backend:'article-rewriter'},{id:'summariser',name:'Content Summariser',backend:'content-summariser'},{id:'content-ideas',name:'Content Idea Generator',backend:'content-idea-generator'},{id:'faq-gen',name:'FAQ Generator',backend:'faq-generator'}]},
  { id:'local',     label:'Local SEO',          color:'var(--social)', icon:Globe2, desc:'Rank locally',
    tools:[
      {id:'google-business',name:'Google Business',backend:'google-business-optimiser',fields:[{name:'businessName',label:'Business name',type:'text'},{name:'category',label:'Category (e.g. Dentist, Restaurant)',type:'text'},{name:'description',label:'Description',type:'textarea'},{name:'reviewCount',label:'Current review count',type:'number'}]},
      {id:'local-citations',name:'Local Citations',backend:'local-citation-finder',fields:[{name:'businessName',label:'Business name',type:'text'},{name:'city',label:'City (optional)',type:'text'}]},
      {id:'nap-checker',name:'NAP Checker',backend:'nap-consistency-checker',fields:[{name:'url',label:'Page URL',type:'text'},{name:'expectedName',label:'Expected business name (optional)',type:'text'},{name:'expectedPhone',label:'Expected phone (optional)',type:'text'},{name:'expectedAddress',label:'Expected address (optional)',type:'text'}]},
      {id:'local-rank',name:'Local Rank Tracker',backend:'local-rank-tracker',fields:[{name:'businessName',label:'Business name',type:'text'},{name:'keyword',label:'Keyword',type:'text'},{name:'city',label:'City (optional)',type:'text'}]},
      {id:'review-gen',name:'Review Generator',backend:'review-generator',fields:[{name:'businessName',label:'Business name',type:'text'},{name:'businessType',label:'Business type (optional)',type:'text'}]},
    ]},
  { id:'tracking',  label:'SERP & Rank',        color:'var(--bio)',    icon:BarChart3, desc:'Track your positions',
    tools:[
      {id:'rank-tracker',name:'Rank Tracker',backend:'rank-tracker',fields:[{name:'domain',label:'Your domain',type:'text'},{name:'keyword',label:'Keyword',type:'text'}]},
      {id:'serp-checker',name:'SERP Checker',backend:'serp-checker'},
      {id:'serp-preview',name:'SERP Preview',backend:'serp-preview',fields:[{name:'title',label:'Page title',type:'text'},{name:'description',label:'Meta description',type:'textarea'},{name:'url',label:'URL',type:'text'}]},
      {id:'index-check',name:'Index Checker',backend:'google-index-checker'},
      {id:'traffic-check',name:'Traffic Checker',backend:'traffic-estimator'},
      {id:'competitor-rank',name:'Competitor Analysis',backend:'competitor-rank',fields:[{name:'domain',label:'Your domain',type:'text'},{name:'competitorDomain',label:'Competitor domain',type:'text'},{name:'keyword',label:'Keyword',type:'text'}]},
    ]},
  { id:'images',    label:'Image SEO',          color:'var(--smm)',    icon:Img, desc:'Optimise images',
    tools:[
      {id:'image-compressor',name:'Image Compressor',backend:'image-compressor',fields:[{name:'image',label:'Image file',type:'file'},{name:'quality',label:'Quality (10-100)',type:'number'}]},
      {id:'alt-gen',name:'Alt Text Generator',backend:'alt-text-generator',fields:[{name:'image',label:'Image file',type:'file'},{name:'keyword',label:'Target keyword (optional)',type:'text'}]},
      {id:'image-rename',name:'Image Rename Tool',backend:'image-rename-tool',fields:[{name:'originalName',label:'Original filename',type:'text'},{name:'keywords',label:'Keywords to use instead',type:'text'}]},
      {id:'favicon-gen',name:'Favicon Generator',backend:'favicon-generator',fields:[{name:'image',label:'Source image (square, 512x512+)',type:'file'}]},
      {id:'logo-maker',name:'Logo Maker'},
    ]},
];

export default function SEOHub() {
  const location = useLocation();
  const navigate = useNavigate();

  const deepLink = ROUTE_MAP[location.pathname];
  const deepLinkCategory = deepLink
    ? SEO_CATEGORIES.find(c => c.id === deepLink.category)
    : null;
  const deepLinkTool = deepLinkCategory?.tools.find(t => t.id === deepLink?.tool) || null;

  const [activeCategory, setActiveCategory] = useState(deepLink?.category || null);
  const [activeTool, setActiveTool]     = useState(deepLinkTool);
  const [input, setInput]               = useState('');
  const [fieldValues, setFieldValues]   = useState({});
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  // If the user navigates to a mapped URL (e.g. clicking "Site Audit" in the
  // sidebar while already on /seo/*), open the right tool instead of staying
  // on whatever screen was already showing.
  useEffect(() => {
    const mapped = ROUTE_MAP[location.pathname];
    if (mapped) {
      const cat = SEO_CATEGORIES.find(c => c.id === mapped.category);
      const tool = cat?.tools.find(t => t.id === mapped.tool);
      if (tool) { setActiveCategory(mapped.category); setActiveTool(tool); setInput(''); setFieldValues({}); setResult(null); }
    } else if (location.pathname === '/seo') {
      setActiveCategory(null); setActiveTool(null);
    }
  }, [location.pathname]);

  const goToHub = () => { setActiveCategory(null); setActiveTool(null); navigate('/seo'); };
  const goToCategory = (catId) => {
    setActiveTool(null); setActiveCategory(catId);
    if (location.pathname !== '/seo') navigate('/seo');
  };

  const hasFields = activeTool?.fields?.length > 0;
  const hasFileField = activeTool?.fields?.some(f => f.type === 'file');

  const runTool = async () => {
    if (!activeTool.backend) return;
    if (!hasFields && !input.trim()) return;
    if (hasFields) {
      const requiredMissing = activeTool.fields.some(f => !f.label.includes('(optional)') && f.type !== 'file' && !fieldValues[f.name]?.trim?.());
      const fileMissing = activeTool.fields.some(f => f.type === 'file' && !fieldValues[f.name]);
      if (requiredMissing || fileMissing) return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      let payload;
      if (hasFileField) {
        payload = new FormData();
        activeTool.fields.forEach(f => {
          if (fieldValues[f.name] != null && fieldValues[f.name] !== '') payload.append(f.name, fieldValues[f.name]);
        });
      } else if (hasFields) {
        payload = {};
        activeTool.fields.forEach(f => { if (fieldValues[f.name]) payload[f.name] = fieldValues[f.name]; });
      } else {
        payload = { url: input, query: input, text: input, keyword: input, domain: input };
      }
      const r = await seoAPI.runTool(activeTool.backend, payload);
      setResult(r.data);
    } catch(e) {
      setError(e.response?.data?.error || e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  if (activeTool) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button className="btn btn-secondary btn-sm" onClick={() => { setActiveTool(null); setResult(null); setInput(''); setFieldValues({}); if (ROUTE_MAP[location.pathname]) navigate('/seo'); }}>← Back</button>
          <div>
            <div className="page-title" style={{ fontSize:18 }}>{activeTool.name}</div>
            <div className="page-sub">{activeCategory?.desc}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            {!activeTool.backend ? (
              <div className="alert alert-info">
                This tool is on our roadmap and isn't wired up to a live backend yet — check back soon.
              </div>
            ) : hasFields ? (
              <div className="form-group">
                {activeTool.fields.map(f => (
                  <div key={f.name} style={{ marginBottom: 12 }}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'file' ? (
                      <input type="file" accept="image/*" className="form-input"
                        onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.files[0] }))} />
                    ) : f.type === 'textarea' ? (
                      <textarea className="form-input" rows={3}
                        value={fieldValues[f.name] || ''}
                        onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.value }))} />
                    ) : (
                      <input type={f.type === 'number' ? 'number' : 'text'} className="form-input"
                        value={fieldValues[f.name] || ''}
                        onChange={e => setFieldValues(v => ({ ...v, [f.name]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && runTool()} />
                    )}
                  </div>
                ))}
                <button className="btn btn-seo" onClick={runTool} disabled={loading}>
                  {loading ? <span className="spinner"/> : <><Search size={15}/> Analyse</>}
                </button>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">URL or keyword</label>
                <div className="flex gap-3">
                  <input className="form-input" value={input} onChange={e=>setInput(e.target.value)}
                    placeholder="https://example.com or enter keyword..." onKeyDown={e => e.key==='Enter' && runTool()} />
                  <button className="btn btn-seo" onClick={runTool} disabled={loading || !input.trim()}>
                    {loading ? <span className="spinner"/> : <><Search size={15}/> Analyse</>}
                  </button>
                </div>
              </div>
            )}
            {error && <div className="alert alert-danger">{error}</div>}
            {result && (
              <div style={{ marginTop:16 }}>
                <div className="card-title mb-3">Results</div>
                <SeoResultView result={result} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeCategory) {
    const cat = SEO_CATEGORIES.find(c => c.id === activeCategory);
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button className="btn btn-secondary btn-sm" onClick={goToHub}>← Back</button>
          <div>
            <div className="page-title" style={{ fontSize:18 }}>{cat.label}</div>
            <div className="page-sub">{cat.desc}</div>
          </div>
        </div>
        <div className="tool-grid">
          {cat.tools.map(tool => (
            <div key={tool.id} className="tool-card" onClick={() => { setActiveTool(tool); setInput(''); setFieldValues({}); setResult(null); setError(''); }}>
              <div className="tool-card-header">
                <div className="tool-card-icon" style={{ background:`rgba(14,165,233,.1)` }}><Search size={18} color="var(--seo)"/></div>
                <span className="badge badge-seo">{tool.backend ? 'SEO' : 'Soon'}</span>
              </div>
              <div className="tool-card-name">{tool.name}</div>
              <div className="tool-card-desc">Professional {tool.name.toLowerCase()} tool</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-banner" style={{ display:'block', '--hub-accent':'var(--seo)' }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--text-3)',marginBottom:10 }}>SEO TOOLS SUITE</div>
          <h1 style={{ fontSize:'clamp(18px,2.4vw,22px)',fontWeight:800,color:'var(--text)',marginBottom:8 }}>50+ Professional SEO Tools</h1>
          <p style={{ color:'var(--text-3)',fontSize:13,maxWidth:480,lineHeight:1.6 }}>Keyword research, on-page analysis, technical audits, link building, content tools, and SERP tracking - all in one place.</p>
        </div>
        <div style={{ position:'absolute',right:0,top:0,width:'40%',height:'100%',opacity:.04,backgroundImage:'var(--brand)',backgroundSize:'22px 22px' }} />
      </div>
      <div className="hub-grid">
        {SEO_CATEGORIES.map(cat => (
          <div key={cat.id} className="tool-card" onClick={() => goToCategory(cat.id)}>
            <div className="tool-card-header">
              <div className="tool-card-icon" style={{ background:`rgba(14,165,233,.1)` }}><cat.icon size={20} color={cat.color}/></div>
              <span className="badge badge-seo">{cat.tools.length} tools</span>
            </div>
            <div className="tool-card-name">{cat.label}</div>
            <div className="tool-card-desc">{cat.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
