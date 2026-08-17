import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiTrash2 } from 'react-icons/fi';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);
  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? { source: filter } : {};
      const { data } = await api.get('/publish/ai/gallery', { params });
      setImages(data.images);
    } catch { toast.error('Failed to load gallery'); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback(async accepted => {
    for (const file of accepted) {
      const fd = new FormData();
      fd.append('image', file);
      try { await api.post('/publish/ai/upload-image', fd, { headers:{'Content-Type':'multipart/form-data'} }); }
      catch { toast.error(`Failed to upload ${file.name}`); }
    }
    toast.success('Images uploaded');
    load();
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*':[] } });

  const deleteImage = async id => {
    if (!window.confirm('Delete this image?')) return;
    await api.delete(`/publish/ai/gallery/${id}`);
    setImages(i=>i.filter(x=>x._id!==id));
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Image Gallery</h1></div>

      <div {...getRootProps()} className={`dropzone mb-4 ${isDragActive?'active':''}`}>
        <input {...getInputProps()} />
        <FiUploadCloud size={32} style={{color:'var(--accent)',marginBottom:10}}/>
        <p style={{fontWeight:600}}>Drop images here or click to upload</p>
      </div>

      <div className="flex gap-2 mb-4">
        {[['','All'],['upload','Uploaded'],['ai_generated','AI Generated']].map(([v,l])=>(
          <button key={v} className={`btn btn-sm ${filter===v?'btn-indigo':'btn-secondary'}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading ? <div className="spinner"/> : images.length===0 ? (
        <div className="empty-state"><div className="empty-icon"></div><p>No images yet</p></div>
      ) : (
        <div className="img-grid">
          {images.map(img=>(
            <div key={img._id} style={{position:'relative'}}>
              <img src={img.url} alt="" className="img-thumb"/>
              <button className="btn-icon" style={{position:'absolute',top:6,right:6,width:28,height:28,background:'rgba(255,255,255,.9)'}}
                onClick={()=>deleteImage(img._id)}><FiTrash2 size={12}/></button>
              {img.source==='ai_generated' && <span className="badge badge-purple" style={{position:'absolute',bottom:6,left:6}}>AI</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
