import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { imagesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/** Full-size viewer with prompt copy, visibility toggle and delete. */
export default function ImageDetailModal({ image, onClose, onDelete, onVisibilityChange }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const owner = user && (image.user?._id || image.user) === user._id;

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(image.prompt || ''); toast.success('Prompt copied'); }
    catch { toast.error('Clipboard unavailable'); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this image permanently?')) return;
    setBusy(true);
    try { await imagesAPI.remove(image._id); onDelete?.(image._id); onClose?.(); toast.success('Image deleted'); }
    catch { toast.error('Could not delete this image'); }
    finally { setBusy(false); }
  };

  const toggleVisibility = async () => {
    setBusy(true);
    const next = !image.isPrivate;
    try {
      await imagesAPI.setVisibility(image._id, next);
      onVisibilityChange?.(image._id, next);
      toast.success(next ? 'Image is now private' : 'Image is now public');
    } catch { toast.error('Could not update visibility'); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}
         style={{ position: 'fixed', inset: 0, background: 'rgba(15,10,30,.72)', zIndex: 60,
                  display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
           style={{ background: 'var(--surface-1)', borderRadius: 18, maxWidth: 900,
                    width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <img src={image.mainUrl || image.thumbUrl} alt={image.prompt || 'Generated image'}
             style={{ width: '100%', display: 'block', borderRadius: '18px 18px 0 0' }} />

        <div style={{ padding: 18 }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>{image.prompt}</p>
          {image.negPrompt && (
            <p style={{ marginTop: 6, color: 'var(--text-3)', fontSize: 12 }}>
              Negative: {image.negPrompt}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <span className="badge badge-brand">{image.aiModel}</span>
            <span className="badge badge-default">{image.size}</span>
            {image.style && image.style !== 'none' && <span className="badge badge-default">{image.style}</span>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-secondary btn-sm" onClick={copyPrompt}>Copy prompt</button>
            <a className="btn btn-secondary btn-sm" href={image.mainUrl || image.thumbUrl}
               target="_blank" rel="noreferrer" download>Download</a>
            {owner && (
              <>
                <button className="btn btn-secondary btn-sm" disabled={busy} onClick={toggleVisibility}>
                  {image.isPrivate ? 'Make public' : 'Make private'}
                </button>
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>Delete</button>
              </>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
