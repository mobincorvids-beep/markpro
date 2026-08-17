import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { genTypeBadge, GEN_TYPES } from '../../utils/genTypes';
import CopyButton from '../../components/aigen/CopyButton';
import { FiTrash2, FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';

export default function History() {
  const [prompts, setPrompts] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [typeFilter, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, [page, typeFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/ai/prompts/history', { params });
      setPrompts(data.prompts);
      setTotal(data.total);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  };

  const deletePrompt = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this generation?')) return;
    try {
      await api.delete(`/ai/prompts/${id}`);
      setPrompts(p => p.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Generation History</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }} style={{ width: 160 }}>
            <option value="">All Types</option>
            {Object.entries(GEN_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="spinner" /> : prompts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <p>No generations found. Start creating!</p>
        </div>
      ) : (
        <>
          <div className="text-muted text-sm mb-3">{total} total generations</div>
          {prompts.map(p => {
            const tb = genTypeBadge(p.type);
            const isExpanded = expanded === p._id;
            return (
              <div key={p._id} className="history-item" onClick={() => setExpanded(isExpanded ? null : p._id)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 22 }}>{tb.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{p.title || tb.label}</span>
                        <span className="badge badge-purple" style={{ background: `${tb.color}22`, color: tb.color }}>{tb.label}</span>
                      </div>
                      <div className="text-muted text-sm">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })} · {p.creditsUsed} credits</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-icon" onClick={e => deletePrompt(p._id, e)} title="Delete">
                      <FiTrash2 size={13} />
                    </button>
                    {isExpanded ? <FiChevronUp size={16} className="text-muted" /> : <FiChevronDown size={16} className="text-muted" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                    {p.prompt && (
                      <div className="mb-3">
                        <div className="form-label">Prompt</div>
                        <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>{p.prompt}</div>
                      </div>
                    )}
                    {p.promptResponse && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="form-label">Response</div>
                          <CopyButton text={p.promptResponse} />
                        </div>
                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto' }}>
                          {p.promptResponse}
                        </div>
                      </div>
                    )}
                    {p.mediaUrls?.length > 0 && (
                      <div>
                        <div className="form-label mb-2">Generated Media</div>
                        {p.type === 'image' ? (
                          <div className="image-gallery">
                            {p.mediaUrls.map((url, i) => (
                              <div key={i} style={{ position: 'relative' }}>
                                <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', borderRadius: 8 }} />
                                <a href={url} download className="btn btn-sm btn-secondary" style={{ position: 'absolute', bottom: 8, right: 8 }}>
                                  <FiDownload size={11} />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : p.type === 'text-to-speech' || p.type === 'image-animation' ? (
                          p.mediaUrls.map((url, i) => (
                            p.type === 'text-to-speech'
                              ? <audio key={i} src={url} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
                              : <video key={i} src={url} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
                          ))
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
            <span className="text-muted text-sm">Page {page} of {Math.ceil(total / 20)}</span>
            <button className="btn btn-secondary btn-sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
