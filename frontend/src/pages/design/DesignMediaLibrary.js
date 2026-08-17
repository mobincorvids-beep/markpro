import { useState, useEffect, useRef } from 'react';
import { designAPI } from '../../services/api';

export default function DesignMediaLibrary() {
  const [media, setMedia]         = useState([]);
  const [unsplash, setUnsplash]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('uploads');
  const [search, setSearch]       = useState('');
  const [searchQ, setSearchQ]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    designAPI.getMedia().then(r => setMedia(r.data.media || [])).finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append('file', file);
      try {
        const r = await designAPI.uploadMedia(fd);
        setMedia(m => [r.data.media, ...m]);
      } catch (err) { alert(err?.response?.data?.message || 'Upload failed'); }
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this media?')) return;
    await designAPI.deleteMedia(id);
    setMedia(m => m.filter(x => x._id !== id));
  };

  const handleRemoveBg = async (mediaItem) => {
    setBgRemoving(mediaItem._id);
    try {
      const r = await designAPI.removeBg({ imageUrl: mediaItem.url });
      setMedia(m => [r.data.media, ...m]);
      alert('Background removed! New image added to library.');
    } catch (e) { alert(e?.response?.data?.message || 'Remove.bg failed'); }
    setBgRemoving(null);
  };

  const searchUnsplash = async () => {
    if (!searchQ.trim()) return;
    try {
      const r = await designAPI.searchUnsplash({ query: searchQ, per_page: 20 });
      setUnsplash(r.data.photos || []);
    } catch (e) { alert(e?.response?.data?.message || 'Unsplash error'); }
  };

  const downloadUnsplashToLibrary = async (photo) => {
    try {
      const r = await designAPI.uploadMedia({ imageUrl: photo.regular });
      setMedia(m => [r.data.media, ...m]);
      setTab('uploads');
      alert('Added to your media library!');
    } catch {}
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>Media Library</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,image/svg+xml" multiple style={{ display:'none' }} onChange={handleUpload} />
        </div>
      </div>

      <div className="tab-bar mb-2">
        {['uploads','unsplash'].map(t => (
          <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t === 'uploads' ? `My Uploads (${media.length})` : 'Unsplash'}
          </button>
        ))}
        {tab === 'uploads' && (
          <input className="input ml-auto" style={{ width:200 }} placeholder="Filter uploads…"
            value={search} onChange={e => setSearch(e.target.value)} />
        )}
        {tab === 'unsplash' && (
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <input className="input" style={{ width:220 }} placeholder="Search Unsplash…"
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUnsplash()} />
            <button className="btn btn-primary" onClick={searchUnsplash}>Search</button>
          </div>
        )}
      </div>

      {tab === 'uploads' && (
        media.filter(m => !search || m.filename?.includes(search)).length === 0
          ? <div className="empty-state"><div className="empty-icon"></div><p>No media yet. Upload images to get started.</p></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
              {media.filter(m => !search || m.filename?.includes(search)).map(m => (
                <div key={m._id} className="card" style={{ padding:8, position:'relative' }}>
                  <img src={m.url} alt={m.filename} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:6, marginBottom:6 }} />
                  <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>
                    {m.filename}
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="btn btn-sm" style={{ flex:1, fontSize:10 }}
                      onClick={() => handleRemoveBg(m)} disabled={bgRemoving === m._id}>
                      {bgRemoving === m._id ? '…' : 'BG'}
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ fontSize:10 }} onClick={() => handleDelete(m._id)}></button>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === 'unsplash' && (
        unsplash.length === 0
          ? <div className="empty-state"><div className="empty-icon"></div><p>Search for free stock photos from Unsplash.</p></div>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
              {unsplash.map(photo => (
                <div key={photo.id} className="card" style={{ padding:8 }}>
                  <img src={photo.thumb} alt={photo.alt} style={{ width:'100%', height:130, objectFit:'cover', borderRadius:6, marginBottom:6 }} />
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>by {photo.author}</div>
                  <button className="btn btn-sm btn-primary w-full" onClick={() => downloadUnsplashToLibrary(photo)}>Add to Library</button>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
