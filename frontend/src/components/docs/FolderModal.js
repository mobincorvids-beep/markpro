import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';

const COLORS = ['var(--brand-hover)','#2563eb','#059669','#d97706','#dc2626','#9333ea','#0891b2','#db2777'];

export default function FolderModal({ folder, parentId, onClose, onSaved }) {
  const [name, setName] = useState(folder?.name || '');
  const [color, setColor] = useState(folder?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (folder) {
        const { data } = await api.put(`/docs/folders/${folder._id}`, { name, color });
        onSaved(data.folder);
      } else {
        const { data } = await api.post('/docs/folders', { name, color, parent: parentId || null });
        onSaved(data.folder);
      }
      toast.success(folder ? 'Folder renamed' : 'Folder created');
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:380 }}>
        <div className="modal-header">
          <h3 className="modal-title">{folder ? 'Rename Folder' : 'New Folder'}</h3>
          <button className="btn-icon" onClick={onClose}><FiX/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Untitled Folder" required />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button type="button" key={c} onClick={()=>setColor(c)}
                    style={{ width:28, height:28, borderRadius:'50%', background:c, border: color===c ? '3px solid var(--text)' : '2px solid transparent', cursor:'pointer' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="inline-spin"/>} {folder ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
