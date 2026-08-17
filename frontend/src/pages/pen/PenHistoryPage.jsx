import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { FileText, ImageIcon, Mic, Code2, Trash2, Eye } from 'lucide-react';

const TYPE_ICON  = { text: FileText, image: ImageIcon, audio: Mic, code: Code2 };
const TYPE_BADGE = { text: 'badge-brand', image: 'badge-smm', audio: 'badge-social', code: 'badge-cyber' };

export default function PenHistoryPage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    penAPI.getHistory().then(r => setItems(r.data.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await penAPI.deleteHistory(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Generation History</div>
        <div className="page-sub">All your past AI generations in one place</div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'rgba(249,115,22,.1)' }}><FileText size={28} color="var(--ai)" /></div>
          <div className="empty-title">No history yet</div>
          <div className="empty-sub">Generated content will show up here</div>
          <Link to="/pen/templates" className="btn btn-ai mt-4">Browse Templates</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Name</th><th>Tokens</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {items.map(c => {
                const Icon = TYPE_ICON[c.content_type] || FileText;
                return (
                  <tr key={c._id}>
                    <td><span className={`badge ${TYPE_BADGE[c.content_type] || 'badge-default'}`}><Icon size={11} /> {c.content_type}</span></td>
                    <td>{c.ai_template_id?.template_name || c.document_name || 'Custom generation'}</td>
                    <td className="td-muted">{c.tokens_used || '-'}</td>
                    <td className="td-muted">{new Date(c.searched_at || c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/pen/history/${c._id}`} className="btn btn-ghost btn-icon"><Eye size={14} /></Link>
                        <button className="btn btn-ghost btn-icon" onClick={() => remove(c._id)}><Trash2 size={14} color="var(--danger)" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
