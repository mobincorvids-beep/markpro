import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CopyButton from '../../components/aigen/CopyButton';
import {
  GEMINI_TEXT_MODELS, RESPONSE_LANGUAGES, PROGRAMMING_LANGUAGES,
} from '../../utils/genTypes';
import { FiZap, FiTrash2, FiDownload } from 'react-icons/fi';

export default function TextGenerator({ type = 'text' }) {
  const { user, refreshUser } = useAuth();
  const [templates, setTemplates]     = useState({});
  const [categories, setCategories]   = useState([]);
  const [activeCategory, setActiveCat] = useState('');
  const [activeTemplate, setActiveTpl] = useState(null);
  const [templateFields, setFields]   = useState({});
  const [customPrompt, setCustomPrompt] = useState('');
  const [model, setModel]             = useState('gemini-2.0-flash');
  const [langCode, setLangCode]       = useState('en');
  const [codeLang, setCodeLang]       = useState('JavaScript');
  const [destLang, setDestLang]       = useState('Spanish');
  const [output, setOutput]           = useState('');
  const [streaming, setStreaming]     = useState(false);
  const abortRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    api.get('/ai/prompts/templates').then(({ data }) => {
      setTemplates(data.categories);
      const cats = Object.keys(data.categories);
      setCategories(cats);
      if (cats.length) setActiveCat(cats[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const selectTemplate = tpl => {
    setActiveTpl(tpl);
    const initial = {};
    tpl.fields?.forEach(f => { initial[f.key] = f.default || ''; });
    setFields(initial);
    setCustomPrompt('');
  };

  const generate = useCallback(async () => {
    if (streaming) { abortRef.current?.abort(); setStreaming(false); return; }
    if (!user?.credits || user.credits < 1) return toast.error('Insufficient credits. Please purchase more.');

    const body = {
      type,
      model,
      languageCode: langCode,
      language: type === 'code' ? codeLang : undefined,
      destLang: type === 'translation' ? destLang : undefined,
    };

    if (activeTemplate) {
      body.templateKey = activeTemplate.key;
      body.fields = templateFields;
    } else {
      body.customPrompt = customPrompt;
    }

    if (!body.customPrompt?.trim() && (!body.templateKey || Object.values(templateFields).some(v => !v?.trim()))) {
      return toast.error('Please fill in all required fields');
    }

    setOutput('');
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const token = localStorage.getItem('aigen_token');
      const response = await fetch('/api/prompts/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Generation failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.delta) {
              accumulated += json.delta;
              setOutput(accumulated);
            }
            if (json.done) { await refreshUser(); }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') toast.error(e.message || 'Generation failed');
    } finally {
      setStreaming(false);
    }
  }, [streaming, user, type, model, langCode, codeLang, destLang, activeTemplate, templateFields, customPrompt, refreshUser]);

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `aigen-${type}-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const typeConfig = {
    text:        { label: 'Text Generator',   placeholder: 'Enter your prompt or select a template…' },
    code:        { label: 'Code Generator',   placeholder: 'Describe the code you want to generate…' },
    translation: { label: 'Translation',      placeholder: 'Enter text to translate…' },
  }[type] || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{typeConfig.label}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={model} onChange={e => setModel(e.target.value)} style={{ width: 180 }}>
            {GEMINI_TEXT_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {type === 'text' && (
            <select value={langCode} onChange={e => setLangCode(e.target.value)} style={{ width: 150 }}>
              {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="gen-page">
        {/* ── LEFT: Input Panel ── */}
        <div className="gen-panel">
          {/* Template categories (text only) */}
          {type === 'text' && categories.length > 0 && (
            <div className="card card-body" style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => { setActiveCat(cat); setActiveTpl(null); }}
                    className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }}>
                    {templates[cat]?.title}
                  </button>
                ))}
              </div>
              {activeCategory && templates[activeCategory] && (
                <div className="template-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))' }}>
                  {Object.entries(templates[activeCategory].templates || {}).map(([key, tpl]) => (
                    <div key={key} className={`template-card ${activeTemplate?.key === key ? 'active' : ''}`}
                      onClick={() => selectTemplate({ ...tpl, key })}>
                      <div className="template-name" style={{ fontSize: 12 }}>{tpl.title}</div>
                      <div className="template-desc" style={{ fontSize: 11 }}>{tpl.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card card-body">
            {/* Type-specific options */}
            {type === 'code' && (
              <div className="form-group">
                <label className="form-label">Programming Language</label>
                <select value={codeLang} onChange={e => setCodeLang(e.target.value)}>
                  {PROGRAMMING_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}
            {type === 'translation' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Language</label>
                  <select value={langCode} onChange={e => setLangCode(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Language</label>
                  <select value={destLang} onChange={e => setDestLang(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Template fields or custom prompt */}
            {activeTemplate ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{activeTemplate.title}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setActiveTpl(null)}>Clear</button>
                </div>
                {activeTemplate.fields?.map(field => (
                  <div key={field.key} className="form-group">
                    <label className="form-label">{field.title}</label>
                    {field.type === 'dropdown' ? (
                      <select value={templateFields[field.key] || ''} onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === 'number' ? (
                      <input type="number" min={1} max={20} value={templateFields[field.key] || field.default || '1'}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))} />
                    ) : (
                      <textarea value={templateFields[field.key] || ''} style={{ minHeight: 80 }}
                        placeholder={`Enter ${field.title.toLowerCase()}…`}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">{type === 'translation' ? 'Text to translate' : 'Your Prompt'}</label>
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  style={{ minHeight: 180 }} placeholder={typeConfig.placeholder} />
              </div>
            )}

            <button className="btn btn-primary btn-block" onClick={generate}>
              {streaming ? (
                <><span className="inline-spin" /> Stop Generating</>
              ) : (
                <><FiZap size={14} /> Generate</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Output Panel ── */}
        <div className="gen-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>Output</span>
            {output && (
              <div style={{ display: 'flex', gap: 8 }}>
                <CopyButton text={output} />
                <button className="btn btn-sm btn-secondary" onClick={downloadOutput}><FiDownload size={12} /> Save</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setOutput('')}><FiTrash2 size={12} /></button>
              </div>
            )}
          </div>
          <div ref={outputRef} className={`gen-output ${streaming ? 'streaming' : ''}`}
            style={{ fontFamily: type === 'code' ? 'var(--mono)' : 'inherit', fontSize: type === 'code' ? 13 : 14 }}>
            {output ? (
              <>
                {output}
                {streaming && <span className="cursor" />}
              </>
            ) : (
              <span className="placeholder">
                {streaming ? 'Generating…' : 'Your AI-generated content will appear here.'}
              </span>
            )}
          </div>
          {output && (
            <div className="text-muted text-sm" style={{ textAlign: 'right' }}>
              {output.trim().split(/\s+/).filter(Boolean).length} words · {output.length} characters
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
