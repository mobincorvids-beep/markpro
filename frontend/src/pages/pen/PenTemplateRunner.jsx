import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { Bot, Copy, ArrowLeft, Zap } from 'lucide-react';

const LANGUAGES = ['English','Spanish','French','German','Portuguese','Italian','Arabic','Hindi','Chinese','Japanese'];
const TONES     = ['Professional','Casual','Friendly','Persuasive','Formal','Humorous','Confident'];

export default function PenTemplateRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [fields, setFields]     = useState({});
  const [language, setLanguage] = useState('');
  const [tone, setTone]         = useState('');
  const [creativity, setCreativity] = useState(0.7);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);

  useEffect(() => {
    penAPI.getTemplate(id).then(r => {
      const t = r.data.data || r.data;
      setTemplate(t);
      const init = {};
      (t.prompt_fields || []).forEach(f => { init[f.name] = ''; });
      setFields(init);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const run = async (e) => {
    e.preventDefault();
    setRunning(true); setResult(null);
    try {
      const paramNames  = Object.keys(fields);
      const paramValues = Object.values(fields);
      const { data } = await penAPI.generateText({
        template_id: id, param_names: paramNames, param_values: paramValues,
        language, tone, creativity,
      });
      if (data.status === '1') {
        setResult(data.data);
        toast.success(`Generated! ${data.data.tokens_used} tokens used.`);
      } else {
        toast.error(data.message || 'Generation failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed.');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner spinner-lg" /></div>;
  if (!template) return <div className="empty-state"><div className="empty-title">Template not found</div></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/pen/templates')}><ArrowLeft size={14} /> Back</button>
        <div>
          <div className="page-title" style={{ fontSize: 18 }}>{template.template_icon || ''} {template.template_name}</div>
          <div className="page-sub">{template.description}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-body">
            <div className="card-title mb-3">Input</div>
            <form onSubmit={run}>
              {(template.prompt_fields || []).length > 0 ? template.prompt_fields.map(f => (
                <div key={f.name} className="form-group">
                  <label className="form-label">{f.label || f.name}{f.required && ' *'}</label>
                  {f.type === 'textarea' ? (
                    <textarea className="form-input form-textarea" rows={4} required={f.required}
                      placeholder={f.placeholder} value={fields[f.name] || ''}
                      onChange={e => setFields(p => ({ ...p, [f.name]: e.target.value }))} />
                  ) : (
                    <input className="form-input" type={f.type || 'text'} required={f.required}
                      placeholder={f.placeholder} value={fields[f.name] || ''}
                      onChange={e => setFields(p => ({ ...p, [f.name]: e.target.value }))} />
                  )}
                  {f.description && <div className="form-hint">{f.description}</div>}
                </div>
              )) : (
                <div className="form-group">
                  <label className="form-label">Your Input *</label>
                  <textarea className="form-input form-textarea" rows={5} required
                    placeholder="Describe what you need…" value={fields.input || ''}
                    onChange={e => setFields({ input: e.target.value })} />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="">Default</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tone</label>
                  <select className="form-select" value={tone} onChange={e => setTone(e.target.value)}>
                    <option value="">Default</option>
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-ai w-full" disabled={running} style={{ marginTop: 8 }}>
                {running ? <span className="spinner" /> : <><Zap size={15} /> Generate</>}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-title mb-3">Output</div>
            {running && (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <Bot size={32} color="var(--text-3)" />
                <div className="empty-sub">AI is writing…</div>
              </div>
            )}
            {result && !running && (
              <div>
                <div className="code-block" style={{ background: 'var(--bg)', color: 'var(--text)', maxHeight: 400, overflowY: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7 }}>{result.result}</pre>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-faint text-sm">{result.tokens_used} tokens used</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(result.result); toast.success('Copied!'); }}>
                    <Copy size={13} /> Copy
                  </button>
                </div>
              </div>
            )}
            {!result && !running && (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-sub">Fill in the form and click Generate.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
