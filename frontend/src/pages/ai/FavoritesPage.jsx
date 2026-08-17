import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { favoritesAPI as favoritesApi } from '../../services/api';
import ImageCard from '../../components/ai/ImageCard';
import ImageDetailModal from '../../components/ai/ImageDetailModal';
import ColumnSlider, { useColumnSlider } from '../../components/ai/ColumnSlider';

/**
 * FavoritesPage  (mirrors king-favs.php + aifavs template)
 * Shows all images the logged-in user has favorited.
 * Supports the same column-slider and modal detail as the main gallery.
 */
export default function FavoritesPage() {
  const [images,   setImages]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [cols, setCols, gridStyle] = useColumnSlider(4);

  useEffect(() => {
    favoritesApi.list()
      .then(r => setImages(r.data))
      .catch(() => toast.error('Failed to load favorites'))
      .finally(() => setLoading(false));
  }, []);

  const removeFav = async (imageId) => {
    try {
      await favoritesApi.toggle(imageId);
      setImages(prev => prev.filter(i => i._id !== imageId));
      toast.success('Removed from favorites');
    } catch {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) return <div className="loader-spinner" style={{ marginTop: '3rem' }} />;

  return (
    <div className="page container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
 My Favorites
          {images.length > 0 && (
            <span className="badge badge-purple" style={{ marginLeft: '0.75rem', fontSize: '0.75rem' }}>
              {images.length}
            </span>
          )}
        </h1>
        <div style={{ width: 220 }}>
          <ColumnSlider value={cols} onChange={setCols} />
        </div>
      </div>

      {images.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '3rem' }}></span>
          <p>No favorites yet. Explore the gallery and save what you love!</p>
        </div>
      ) : (
        <div id="container" style={gridStyle}>
          {images.map(img => (
            <ImageCard
              key={img._id}
              image={img}
              onClick={setSelected}
              onFavorite={removeFav}
              isFavorited={true}
            />
          ))}
        </div>
      )}

      {selected && (
        <ImageDetailModal
          image={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => setImages(prev => prev.filter(i => i._id !== id))}
        />
      )}
    </div>
  );
}
