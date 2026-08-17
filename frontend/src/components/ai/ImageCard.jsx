import React, { useState } from 'react';

/** Single gallery tile: lazy image, NSFW blur, favorite toggle. */
export default function ImageCard({ image, onClick, onFavorite, isFavorited }) {
  const [revealed, setRevealed] = useState(false);
  const blurred = image.isNsfw && !revealed;

  return (
    <div className="image-card" style={{
      position: 'relative', borderRadius: 14, overflow: 'hidden',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <button
        type="button"
        onClick={() => (blurred ? setRevealed(true) : onClick?.(image))}
        style={{ display: 'block', width: '100%', border: 0, padding: 0, background: 'none', cursor: 'pointer' }}
      >
        <img
          src={image.thumbUrl || image.mainUrl}
          alt={image.prompt?.slice(0, 120) || 'Generated image'}
          loading="lazy"
          style={{
            display: 'block', width: '100%', height: 'auto',
            filter: blurred ? 'blur(22px)' : 'none', transition: 'filter .2s',
          }}
        />
      </button>

      {blurred && (
        <span style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', pointerEvents: 'none',
        }}>NSFW - tap to reveal</span>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '8px 10px',
      }}>
        <span style={{
          fontSize: 12, color: 'var(--text-3)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{image.prompt}</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          aria-pressed={!!isFavorited}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => onFavorite?.(image._id)}
        >{isFavorited ? '' : ''}</button>
      </div>
    </div>
  );
}
