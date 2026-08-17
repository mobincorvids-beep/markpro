import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FolderCard, DocumentCard } from '../../components/docs/FileCard';
import UploadModal from '../../components/docs/UploadModal';
import FolderModal from '../../components/docs/FolderModal';
import ShareModal from '../../components/docs/ShareModal';
import DocumentDetailModal from '../../components/docs/DocumentDetailModal';
import DashboardStats from '../../components/docs/DashboardStats';
import {
  FiUpload, FiFolderPlus, FiGrid, FiList, FiChevronRight, FiHome,
  FiTrash2, FiDownload, FiStar, FiX, FiCheckSquare,
} from 'react-icons/fi';

export default function Drive({ mode = 'drive', searchQuery }) {
  const { folderId } = useParams();
  const navigate = useNavigate();

  const [folders, setFolders]   = useState([]);
  const [documents, setDocuments] = useState([]);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('grid');
  const [selected, setSelected] = useState(new Set());

  const [showUpload, setShowUpload] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(null); // null | {} | folder obj
  const [shareItem, setShareItem] = useState(null);
  const [detailDoc, setDetailDoc] = useState(null);

  const currentFolder = folderId || null;
  const trashView   = mode === 'trash';
  const starredView = mode === 'starred';
  const sharedView  = mode === 'shared';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const folderParams = trashView ? { trashed:'true' } : starredView ? { starred:'true' } : { parent: currentFolder || 'null' };
      const docParams    = trashView ? { trashed:'true' } : starredView ? { starred:'true' } : sharedView ? {} : { folder: currentFolder || 'null' };
      if (searchQuery) { docParams.search = searchQuery; delete docParams.folder; }

      const [foldersRes, docsRes] = await Promise.all([
        (!sharedView && !searchQuery) ? api.get('/docs/folders', { params: folderParams }) : Promise.resolve({ data:{folders:[]} }),
        api.get('/docs/documents', { params: docParams }),
      ]);
      setFolders(foldersRes.data.folders);

      let docs = docsRes.data.documents;
      if (sharedView) docs = docs.filter(d => d.sharedWith?.some(s => s.user)); // only actually-shared
      setDocuments(docs);

      if (currentFolder && !trashView && !starredView && !sharedView) {
        const bc = await api.get(`/docs/folders/${currentFolder}/breadcrumb`);
        setBreadcrumb(bc.data.breadcrumb);
      } else {
        setBreadcrumb([]);
      }
    } catch (e) {
      toast.error('Failed to load files');
    } finally { setLoading(false); }
  }, [currentFolder, mode, searchQuery]);

  useEffect(() => { load(); setSelected(new Set()); }, [load]);

  const toggleSelect = (id, e) => {
    e?.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Folder actions ──────────────────────────
  const handleFolderClick = folder => navigate(`/folder/${folder._id}`);
  const handleFolderMenu = async (action, folder) => {
    switch (action) {
      case 'open':   handleFolderClick(folder); break;
      case 'rename': setShowFolderModal(folder); break;
      case 'star':
        await api.put(`/docs/folders/${folder._id}`, { isStarred: !folder.isStarred });
        load(); break;
      case 'share':  setShareItem({ ...folder, _type:'folder' }); break;
      case 'delete':
        await api.delete(`/docs/folders/${folder._id}`);
        toast.success('Folder moved to trash');
        load(); break;
      default: break;
    }
  };

  // ── Document actions ────────────────────────
  const handleDocClick = doc => setDetailDoc(doc._id);
  const handleDocMenu = async (action, doc) => {
    switch (action) {
      case 'open':     setDetailDoc(doc._id); break;
      case 'download':
        try {
          const res = await api.get(`/docs/documents/${doc._id}/download`, { responseType:'blob' });
          const url = window.URL.createObjectURL(res.data);
          const a = document.createElement('a'); a.href=url; a.download=doc.originalName; a.click();
          window.URL.revokeObjectURL(url);
        } catch { toast.error('Download failed'); }
        break;
      case 'rename': {
        const newName = window.prompt('Rename document', doc.name);
        if (newName && newName !== doc.name) {
          await api.put(`/docs/documents/${doc._id}`, { name: newName });
          load();
        }
        break;
      }
      case 'star':
        await api.put(`/docs/documents/${doc._id}/star`);
        load(); break;
      case 'share': setShareItem({ ...doc, _type:'document' }); break;
      case 'delete':
        await api.delete(`/docs/documents/${doc._id}`);
        toast.success('Moved to trash');
        load(); break;
      case 'restore':
        await api.post(`/docs/documents/${doc._id}/restore`);
        toast.success('Restored');
        load(); break;
      case 'permanent-delete':
        if (window.confirm('Permanently delete this document? This cannot be undone.')) {
          await api.delete(`/docs/documents/${doc._id}/permanent`);
          toast.success('Deleted permanently');
          load();
        }
        break;
      default: break;
    }
  };

  // ── Bulk actions ─────────────────────────────
  const bulkAction = async (action) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => api.delete(`/docs/documents/${id}`)));
        toast.success(`${ids.length} item(s) moved to trash`);
      } else if (action === 'restore') {
        await Promise.all(ids.map(id => api.post(`/docs/documents/${id}/restore`)));
        toast.success(`${ids.length} item(s) restored`);
      } else if (action === 'star') {
        await Promise.all(ids.map(id => api.put(`/docs/documents/${id}/star`)));
      } else if (action === 'permanent-delete') {
        if (!window.confirm(`Permanently delete ${ids.length} item(s)?`)) return;
        await Promise.all(ids.map(id => api.delete(`/docs/documents/${id}/permanent`)));
        toast.success('Deleted permanently');
      }
      setSelected(new Set());
      load();
    } catch { toast.error('Bulk action failed'); }
  };

  const pageTitle = trashView ? 'Trash' : starredView ? 'Starred' : sharedView ? 'Shared with me' : searchQuery ? `Search: "${searchQuery}"` : 'My Drive';
  const isEmpty = folders.length === 0 && documents.length === 0;

  return (
    <div>
      {mode === 'drive' && !currentFolder && !searchQuery && <DashboardStats />}

      {/* Breadcrumb */}
      {!trashView && !starredView && !sharedView && !searchQuery && (
        <div className="breadcrumb">
          <Link to="/"><FiHome size={13}/></Link>
          {breadcrumb.map((b,i) => (
            <React.Fragment key={b._id}>
              <FiChevronRight size={12} />
              {i === breadcrumb.length-1 ? <span className="breadcrumb-current">{b.name}</span> : <Link to={`/folder/${b._id}`}>{b.name}</Link>}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">{pageTitle}</h1>
        <div className="flex gap-2">
          {!trashView && !sharedView && (
            <>
              <button className="btn btn-secondary" onClick={()=>setShowFolderModal({})}><FiFolderPlus size={14}/> New Folder</button>
              <button className="btn btn-primary" onClick={()=>setShowUpload(true)}><FiUpload size={14}/> Upload</button>
            </>
          )}
          <button className="btn-icon" onClick={()=>setView(v=>v==='grid'?'list':'grid')}>
            {view==='grid' ? <FiList/> : <FiGrid/>}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3" style={{ background:'var(--accent-light)', padding:'10px 16px', borderRadius:8, marginBottom:16 }}>
          <FiCheckSquare style={{ color:'var(--accent)' }} />
          <span style={{ fontWeight:600, fontSize:13 }}>{selected.size} selected</span>
          <div style={{ flex:1 }} />
          {trashView ? (
            <>
              <button className="btn btn-sm btn-secondary" onClick={()=>bulkAction('restore')}>Restore</button>
              <button className="btn btn-sm btn-danger" onClick={()=>bulkAction('permanent-delete')}><FiTrash2 size={12}/> Delete Forever</button>
            </>
          ) : (
            <>
              <button className="btn btn-sm btn-secondary" onClick={()=>bulkAction('star')}><FiStar size={12}/> Star</button>
              <button className="btn btn-sm btn-danger" onClick={()=>bulkAction('delete')}><FiTrash2 size={12}/> Trash</button>
            </>
          )}
          <button className="btn-icon" onClick={()=>setSelected(new Set())}><FiX size={14}/></button>
        </div>
      )}

      {loading ? <div className="spinner" /> : isEmpty ? (
        <div className="empty-state">
          <div className="empty-state-icon">{trashView?'':starredView?'':sharedView?'':''}</div>
          <div className="empty-state-title">
            {trashView ? 'Trash is empty' : starredView ? 'No starred items' : sharedView ? 'Nothing shared with you yet' : searchQuery ? 'No results found' : 'This folder is empty'}
          </div>
          {!trashView && !starredView && !sharedView && !searchQuery && (
            <p className="text-muted">Upload files or create a folder to get started</p>
          )}
        </div>
      ) : (
        <div className={view === 'grid' ? 'file-grid' : 'file-list'}>
          {folders.map(f => (
            <FolderCard key={f._id} folder={f} view={view} selected={false}
              onClick={()=>handleFolderClick(f)} onMenu={handleFolderMenu} />
          ))}
          {documents.map(d => (
            <div key={d._id} style={{ position:'relative' }} onClick={e => { if (e.target.closest('.dropdown')) return; if (e.ctrlKey || e.metaKey) toggleSelect(d._id, e); }}>
              <DocumentCard doc={d} view={view} selected={selected.has(d._id)} trashView={trashView}
                onClick={()=>handleDocClick(d)} onMenu={handleDocMenu} />
              {view === 'grid' && (
                <input type="checkbox" className="file-checkbox" checked={selected.has(d._id)}
                  onChange={e=>toggleSelect(d._id, e)} onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:8, right:8, width:16, height:16 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showUpload && <UploadModal folderId={currentFolder} onClose={()=>setShowUpload(false)} onUploaded={load} />}
      {showFolderModal !== null && (
        <FolderModal
          folder={showFolderModal._id ? showFolderModal : null}
          parentId={currentFolder}
          onClose={()=>setShowFolderModal(null)}
          onSaved={load}
        />
      )}
      {shareItem && (
        <ShareModal item={shareItem} type={shareItem._type}
          onClose={()=>setShareItem(null)} onUpdated={load} />
      )}
      {detailDoc && (
        <DocumentDetailModal docId={detailDoc}
          onClose={()=>setDetailDoc(null)}
          onUpdated={load}
          onDeleted={load}
          onShare={(doc)=>{ setShareItem({...doc,_type:'document'}); }}
        />
      )}
    </div>
  );
}
