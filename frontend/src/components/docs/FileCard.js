import React, { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getFileIcon, getFileColor, formatBytes } from '../../utils/fileUtils';
import {
  FiStar, FiMoreVertical, FiFolder, FiDownload, FiShare2, FiTrash2,
  FiEdit2, FiInfo, FiRotateCcw, FiX,
} from 'react-icons/fi';

export function FolderCard({ folder, view, selected, onClick, onMenu }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (view === 'list') {
    return (
      <div className={`file-row ${selected?'selected':''}`} onDoubleClick={onClick}>
        <div className="file-row-icon" style={{ color: folder.color || 'var(--accent)' }}><FiFolder /></div>
        <div className="file-row-name">{folder.name}{folder.isStarred && <FiStar size={12} style={{ marginLeft:6, color:'#f59e0b', display:'inline' }} />}</div>
        <div className="file-row-meta">Folder</div>
        <div className="file-row-meta">{formatDistanceToNow(new Date(folder.updatedAt), {addSuffix:true})}</div>
        <div className="dropdown" ref={menuRef}>
          <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); setShowMenu(s=>!s);}}><FiMoreVertical size={14}/></button>
          {showMenu && <FolderMenu folder={folder} onAction={(a)=>{setShowMenu(false); onMenu(a, folder);}} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`file-card ${selected?'selected':''}`} onDoubleClick={onClick}>
      {folder.isStarred && <FiStar className="file-star" />}
      <div className="file-icon" style={{ color: folder.color || 'var(--accent)' }}><FiFolder /></div>
      <div className="file-name">{folder.name}</div>
      <div className="file-meta">Folder</div>
      <div className="dropdown" ref={menuRef} style={{ position:'absolute', top:8, left:8 }}>
        <button className="btn-icon" style={{ width:26, height:26, background:'transparent', border:'none' }} onClick={(e)=>{e.stopPropagation(); setShowMenu(s=>!s);}}><FiMoreVertical size={13}/></button>
        {showMenu && <FolderMenu folder={folder} onAction={(a)=>{setShowMenu(false); onMenu(a, folder);}} />}
      </div>
    </div>
  );
}

function FolderMenu({ folder, onAction }) {
  return (
    <div className="dropdown-menu" style={{ left:0 }}>
      <button className="dropdown-item" onClick={()=>onAction('open')}><FiFolder size={14}/> Open</button>
      <button className="dropdown-item" onClick={()=>onAction('rename')}><FiEdit2 size={14}/> Rename</button>
      <button className="dropdown-item" onClick={()=>onAction('star')}><FiStar size={14}/> {folder.isStarred?'Unstar':'Star'}</button>
      <button className="dropdown-item" onClick={()=>onAction('share')}><FiShare2 size={14}/> Share</button>
      <hr className="dropdown-divider" />
      <button className="dropdown-item danger" onClick={()=>onAction('delete')}><FiTrash2 size={14}/> Move to Trash</button>
    </div>
  );
}

export function DocumentCard({ doc, view, selected, onClick, onMenu, trashView }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const icon  = getFileIcon(doc.extension);
  const color = getFileColor(doc.extension);

  if (view === 'list') {
    return (
      <div className={`file-row ${selected?'selected':''}`} onDoubleClick={onClick}>
        <div className="file-row-icon" style={{ color }}>{icon}</div>
        <div className="file-row-name">
          {doc.name}
          {doc.isStarred && <FiStar size={12} style={{ marginLeft:6, color:'#f59e0b', display:'inline' }} />}
          {doc.sharedWith?.length > 0 && <FiShare2 size={11} style={{ marginLeft:6, color:'var(--text-muted)', display:'inline' }} />}
        </div>
        <div className="file-row-meta">{formatBytes(doc.size)}</div>
        <div className="file-row-meta">{formatDistanceToNow(new Date(doc.updatedAt), {addSuffix:true})}</div>
        <div className="dropdown" ref={menuRef}>
          <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); setShowMenu(s=>!s);}}><FiMoreVertical size={14}/></button>
          {showMenu && <DocMenu doc={doc} trashView={trashView} onAction={(a)=>{setShowMenu(false); onMenu(a, doc);}} />}
        </div>
      </div>
    );
  }

  return (
    <div className={`file-card ${selected?'selected':''}`} onDoubleClick={onClick}>
      {doc.isStarred && <FiStar className="file-star" />}
      <div className="file-icon">{icon}</div>
      <div className="file-name">{doc.name}</div>
      <div className="file-meta">{formatBytes(doc.size)}</div>
      <div className="dropdown" ref={menuRef} style={{ position:'absolute', top:8, left:8 }}>
        <button className="btn-icon" style={{ width:26, height:26, background:'transparent', border:'none' }} onClick={(e)=>{e.stopPropagation(); setShowMenu(s=>!s);}}><FiMoreVertical size={13}/></button>
        {showMenu && <DocMenu doc={doc} trashView={trashView} onAction={(a)=>{setShowMenu(false); onMenu(a, doc);}} />}
      </div>
    </div>
  );
}

function DocMenu({ doc, trashView, onAction }) {
  if (trashView) {
    return (
      <div className="dropdown-menu" style={{ left:0 }}>
        <button className="dropdown-item" onClick={()=>onAction('restore')}><FiRotateCcw size={14}/> Restore</button>
        <button className="dropdown-item danger" onClick={()=>onAction('permanent-delete')}><FiX size={14}/> Delete Forever</button>
      </div>
    );
  }
  return (
    <div className="dropdown-menu" style={{ left:0 }}>
      <button className="dropdown-item" onClick={()=>onAction('open')}><FiInfo size={14}/> View Details</button>
      <button className="dropdown-item" onClick={()=>onAction('download')}><FiDownload size={14}/> Download</button>
      <button className="dropdown-item" onClick={()=>onAction('rename')}><FiEdit2 size={14}/> Rename</button>
      <button className="dropdown-item" onClick={()=>onAction('star')}><FiStar size={14}/> {doc.isStarred?'Unstar':'Star'}</button>
      <button className="dropdown-item" onClick={()=>onAction('share')}><FiShare2 size={14}/> Share</button>
      <hr className="dropdown-divider" />
      <button className="dropdown-item danger" onClick={()=>onAction('delete')}><FiTrash2 size={14}/> Move to Trash</button>
    </div>
  );
}
