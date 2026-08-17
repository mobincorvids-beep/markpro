import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { replyAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Star, Trash2, Copy, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const PLATFORMS = ['all', 'general', 'twitter', 'linkedin', 'facebook', 'instagram'];
const TONES = ['all', 'professional', 'casual', 'witty', 'empathetic', 'formal'];
const PLATFORM_COLORS = { twitter: '#1d9bf0', linkedin: '#0077b5', facebook: '#1877f2', instagram: '#e1306c', general: 'var(--brand)' };

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ platform: 'all', tone: 'all', isFavorited: '' });
  const [expandedId, setExpandedId] = useState(null);

  const queryParams = {
    page,
    limit: 15,
    ...(filters.platform !== 'all' && { platform: filters.platform }),
    ...(filters.tone !== 'all' && { tone: filters.tone }),
    ...(filters.isFavorited !== '' && { isFavorited: filters.isFavorited }),
  };

  const { data, isLoading } = useQuery(
    ['reply-history', queryParams],
    () => replyAPI.getHistory(queryParams),
    { keepPreviousData: true }
  );

  const replies = data?.data?.data?.replies || [];
  const pagination = data?.data?.data?.pagination || {};

  const handleFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const handleToggleFavorite = async (reply) => {
    try {
      await replyAPI.toggleFavorite(reply._id);
      queryClient.invalidateQueries('reply-history');
      queryClient.invalidateQueries('reply-stats');
      toast.success(reply.isFavorited ? 'Removed from favorites' : 'Saved to favorites');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await replyAPI.deleteReply(id);
      queryClient.invalidateQueries('reply-history');
      queryClient.invalidateQueries('reply-stats');
      toast.success('Reply deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Reply History</h1>
            <p style={{ color: 'var(--text-muted)' }}>{pagination.total || 0} replies generated</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
              <Filter size={14} /> Filters:
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PLATFORMS.map((p) => (
                <button key={p} onClick={() => handleFilter('platform', p)}
                  className={`btn btn-sm ${filters.platform === p ? 'btn-primary' : 'btn-outline'}`}
                  style={{ textTransform: 'capitalize', padding: '4px 12px' }}>
                  {p}
                </button>
              ))}
            </div>

            <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map((t) => (
                <button key={t} onClick={() => handleFilter('tone', t)}
                  className={`btn btn-sm ${filters.tone === t ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ textTransform: 'capitalize', padding: '4px 12px' }}>
                  {t}
                </button>
              ))}
            </div>

            <button onClick={() => handleFilter('isFavorited', filters.isFavorited === 'true' ? '' : 'true')}
              className={`btn btn-sm ${filters.isFavorited === 'true' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ marginLeft: 'auto' }}>
              <Star size={13} fill={filters.isFavorited === 'true' ? '#fff' : 'none'} /> Favorites
            </button>
          </div>
        </div>

        {/* Reply list */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : replies.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Search size={40} style={{ marginBottom: 16, opacity: 0.2, display: 'block', margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No replies found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Try adjusting your filters or generate some replies first.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replies.map((reply) => {
              const isExpanded = expandedId === reply._id;
              return (
                <div key={reply._id} className="card" style={{ padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.2s', borderColor: isExpanded ? 'var(--primary)' : 'var(--border)' }}
                  onClick={() => setExpandedId(isExpanded ? null : reply._id)}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${PLATFORM_COLORS[reply.platform] || 'var(--brand)'}22`, color: PLATFORM_COLORS[reply.platform] || 'var(--brand)' }}>
                        {reply.platform}
                      </span>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{reply.tone}</span>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{reply.aiModel}</span>
                      {reply.language !== 'en' && <span className="badge badge-gray" style={{ fontSize: 11 }}>{reply.language}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Original post */}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
                    ↳ {isExpanded ? reply.originalText : (reply.originalText.length > 100 ? reply.originalText.slice(0, 100) + '…' : reply.originalText)}
                  </p>

                  {/* Generated reply */}
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)' }}>
                    {isExpanded ? reply.generatedReply : (reply.generatedReply.length > 160 ? reply.generatedReply.slice(0, 160) + '…' : reply.generatedReply)}
                  </p>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleCopy(reply.generatedReply)} className="btn btn-ghost btn-sm">
                      <Copy size={13} /> Copy
                    </button>
                    <button onClick={() => handleToggleFavorite(reply)} className="btn btn-ghost btn-sm"
                      style={{ color: reply.isFavorited ? 'var(--warning)' : undefined }}>
                      <Star size={13} fill={reply.isFavorited ? 'var(--warning)' : 'none'} color={reply.isFavorited ? 'var(--warning)' : 'currentColor'} />
                      {reply.isFavorited ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={() => handleDelete(reply._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--error)', marginLeft: 'auto' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">
              <ChevronLeft size={15} /> Prev
            </button>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-outline btn-sm">
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    
  );
}
