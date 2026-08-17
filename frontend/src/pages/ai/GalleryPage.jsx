import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { imagesAPI as imagesApi, favoritesAPI as favoritesApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ImageCard from '../../components/ai/ImageCard';
import ImageDetailModal from '../../components/ai/ImageDetailModal';
import ColumnSlider, { useColumnSlider } from '../../components/ai/ColumnSlider';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

const AI_MODELS = ['', 'sd', 'realxl', 'odalle', 'pix', 'dreams', 'playg', 'de', 'de3'];

/**
 * GalleryPage
 * Mirrors the home/gallery template from king-theme.php + main.js:
 *  - Masonry columns (CSS-based, slider-controlled - myRange from main.js)
 *  - Infinite scroll (IAS replacement using IntersectionObserver)
 *  - Lazy image loading (data-king-img-src observer replacement)
 *  - Image detail modal with prompt copy, favorite, delete, visibility
 *  - Model filter tabs
 *  - NSFW blur on cards
 */
export default function GalleryPage() {
  const { user } = useAuth();
  const [images,    setImages]    = useState([]);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [favored,   setFavored]   = useState({});
  const [modelFilter, setModelFilter] = useState('');
  const [cols, setCols, gridStyle] = useColumnSlider(4);

  const fetchPage = useCallback(async (p, model) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = { page: p, limit: 24 };
      if (model) params.model = model;
      const { data } = await imagesApi.list(params);
      setImages(prev => p === 1 ? data.images : [...prev, ...data.images]);
      setHasMore(p < data.pages);
      setPage(p);
    } catch {
      toast.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Initial load + model filter resets
  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, modelFilter);
  }, [modelFilter]);

  // Infinite scroll sentinel
  const loadMore = useCallback(() => {
    if (!loading && hasMore) fetchPage(page + 1, modelFilter);
  }, [loading, hasMore, page, modelFilter, fetchPage]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  const toggleFav = async (imageId) => {
    if (!user) { toast.info('Login to favorite images'); return; }
    try {
      const { data } = await favoritesApi.toggle(imageId);
      setFavored(prev => ({ ...prev, [imageId]: data.favorited }));
    } catch {
      toast.error('Failed to toggle favorite');
    }
  };

  const handleDelete = (deletedId) => {
    setImages(prev => prev.filter(i => i._id !== deletedId));
  };

  const handleVisibilityChange = (id, isPrivate) => {
    if (isPrivate) {
      setImages(prev => prev.filter(i => i._id !== id));
    }
  };

  return (
    <div className="page container">

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Gallery</h1>

        {/* Column slider - mirrors #myRange from main.js */}
        <div style={{ width: 220 }}>
          <ColumnSlider value={cols} onChange={setCols} />
        </div>
      </div>

      {/* ── Model filter tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {AI_MODELS.map(m => (
          <button
            key={m || 'all'}
            className={`model-tab ${modelFilter === m ? 'active' : ''}`}
            onClick={() => setModelFilter(m)}
          >
            {m || 'All Models'}
          </button>
        ))}
      </div>

      {/* ── Masonry grid ── */}
      {images.length === 0 && !loading ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}></span>
          <p>No images yet. Be the first to generate one!</p>
        </div>
      ) : (
        <div id="container" style={gridStyle}>
          {images.map(img => (
            <ImageCard
              key={img._id}
              image={img}
              onClick={setSelected}
              onFavorite={toggleFav}
              isFavorited={!!favored[img._id]}
            />
          ))}
        </div>
      )}

      {/* ── Infinite scroll sentinel + spinner ── */}
      {loading && <div className="loader-spinner" />}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {!hasMore && images.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text2)', fontSize: '0.85rem' }}>
          End of gallery
        </div>
      )}

      {/* ── Detail modal ── */}
      {selected && (
        <ImageDetailModal
          image={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onVisibilityChange={handleVisibilityChange}
        />
      )}
    </div>
  );
}
