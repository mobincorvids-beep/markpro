import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { brandAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Sparkles, Plus, Trash2, Wand2, Target, MessageSquare,
  Compass, Tag, ArrowRight, X, Loader2,
} from 'lucide-react';

export default function BrandHub() {
  const [brands, setBrands]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [active, setActive]   = useState(null);
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [creating, setCreating] = useState(false);
  const [genLoading, setGenLoading] = useState('');

  const load = () => {
    setLoading(true);
    brandAPI.getBrands()
      .then(r => setBrands(r.data.brands || r.data.data || r.data || []))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createBrand = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await brandAPI.createBrand({ name, description: desc });
      toast.success('Brand created');
      setShowNew(false); setName(''); setDesc('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create brand');
    } finally { setCreating(false); }
  };

  const deleteBrand = async (id) => {
    if (!window.confirm('Delete this brand?')) return;
    try { await brandAPI.deleteBrand(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const runGenerate = async (brand, type) => {
    setGenLoading(brand._id + type);
    try {
      const fn = {
        identities: brandAPI.generateIdentities,
        audiences:  brandAPI.generateAudiences,
        voice:      brandAPI.generateVoice,
        strategy:   brandAPI.generateStrategy,
        slogan:     brandAPI.generateSlogan,
      }[type];
      const { data } = await fn(brand._id);
      toast.success(`${type[0].toUpperCase() + type.slice(1)} generated!`);
      load();
      if (active?._id === brand._id) setActive(data.brand || data.data || data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Generation failed');
    } finally { setGenLoading(''); }
  };

  if (active) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm mb-4" onClick={() => setActive(null)}>← Back to Brands</button>
        <div className="card mb-4">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width:48,height:48,borderRadius:12,background:'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'var(--brand)' }}>
                {active.name?.[0]?.toUpperCase() || 'B'}
              </div>
              <div>
                <div style={{ fontWeight:900,fontSize:18 }}>{active.name}</div>
                {active.slogan && <div style={{ fontSize:12.5,color:'var(--text-2)',fontStyle:'italic' }}>"{active.slogan}"</div>}
              </div>
            </div>
            {active.description && <p className="text-muted text-sm mt-2">{active.description}</p>}
          </div>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14 }}>
          {[
            { key:'identities', label:'Brand Identity',  icon:Compass,       desc:'Mission, vision & core values',     data: active.identities && (active.identities.mission || active.identities.vision) },
            { key:'audiences',  label:'Target Audiences', icon:Target,        desc:'AI-generated audience segments',     data: active.audiences?.length },
            { key:'voice',      label:'Brand Voice',      icon:MessageSquare, desc:'Tone, message & communication style',data: active.voices?.message },
            { key:'strategy',   label:'Content Strategy', icon:Wand2,         desc:'Posting strategy & content pillars', data: active.strategy },
            { key:'slogan',     label:'Slogan',           icon:Tag,           desc:'Catchy brand tagline',                data: active.slogan },
          ].map(card => (
            <div key={card.key} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div style={{ width:36,height:36,borderRadius:10,background:'rgba(249,115,22,.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <card.icon size={18} color="var(--ai)" />
                  </div>
                  {card.data ? <span className="badge badge-success">Generated</span> : <span className="badge badge-default">Empty</span>}
                </div>
                <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>{card.label}</div>
                <div style={{ fontSize:12,color:'var(--text-2)',marginBottom:12,lineHeight:1.5,minHeight:34 }}>
                  {card.key==='identities' && active.identities?.mission ? active.identities.mission.slice(0,90)+'…' :
                   card.key==='voice' && active.voices?.message ? active.voices.message.slice(0,90)+'…' :
                   card.key==='strategy' && active.strategy ? active.strategy.slice(0,90)+'…' :
                   card.key==='slogan' && active.slogan ? `"${active.slogan}"` :
                   card.desc}
                </div>
                <button
                  className="btn btn-ai btn-sm w-full"
                  disabled={genLoading === active._id + card.key}
                  onClick={() => runGenerate(active, card.key)}
                >
                  {genLoading === active._id + card.key
                    ? <Loader2 size={14} className="spin" />
                    : <Sparkles size={14} />}
                  {card.data ? 'Regenerate' : 'Generate with AI'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">Brand Intelligence</div>
          <div className="page-sub">AI-generated brand identity, voice, audiences & strategy</div>
        </div>
        <button className="btn btn-ai" onClick={() => setShowNew(true)}><Plus size={15}/> New Brand</button>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg"/></div>
      ) : brands.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background:'rgba(249,115,22,.1)' }}><Sparkles size={28} color="var(--ai)"/></div>
          <div className="empty-title">No brands yet</div>
          <div className="empty-sub">Create a brand to unlock AI-generated identity, voice, audiences and content strategy</div>
          <button className="btn btn-ai mt-4" onClick={() => setShowNew(true)}><Plus size={15}/> Create First Brand</button>
        </div>
      ) : (
        <div className="hub-grid">
          {brands.map(b => (
            <div key={b._id} className="card" style={{ padding:18,cursor:'pointer' }} onClick={() => setActive(b)}>
              <div className="flex items-center justify-between mb-3">
                <div style={{ width:40,height:40,borderRadius:10,background:'var(--brand-light)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'var(--brand)' }}>
                  {b.name?.[0]?.toUpperCase() || 'B'}
                </div>
                <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); deleteBrand(b._id); }}>
                  <Trash2 size={14} color="var(--danger)" />
                </button>
              </div>
              <div style={{ fontWeight:800,fontSize:15,marginBottom:4 }}>{b.name}</div>
              <div style={{ fontSize:12,color:'var(--text-2)',marginBottom:12,minHeight:32 }}>{b.description || 'No description yet'}</div>
              <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:'var(--ai)' }}>
                Open Brand <ArrowRight size={11}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowNew(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Brand</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNew(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Brand name</label>
                <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Acme Inc." />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input form-textarea" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What does this brand do?" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-ai" disabled={creating || !name.trim()} onClick={createBrand}>
                {creating ? <span className="spinner"/> : <><Plus size={14}/> Create Brand</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
