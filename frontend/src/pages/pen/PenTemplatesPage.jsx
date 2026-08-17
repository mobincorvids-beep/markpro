import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { penAPI } from '../../services/api';
import { FileText, ImageIcon, Mic, Code2, MessageSquare, ArrowRight, Search } from 'lucide-react';

const TYPE_TABS = [
  { id: '',      label: 'All',   icon: Search       },
  { id: 'text',  label: 'Text',  icon: FileText     },
  { id: 'image', label: 'Image', icon: ImageIcon    },
  { id: 'audio', label: 'Audio', icon: Mic          },
  { id: 'code',  label: 'Code',  icon: Code2        },
];
const TYPE_BADGE = { text: 'badge-brand', image: 'badge-smm', audio: 'badge-social', code: 'badge-cyber', chat: 'badge-ai' };

export default function PenTemplatesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [groups, setGroups]       = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [type, setType]           = useState(params.get('type') || '');
  const [groupId, setGroupId]     = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => { penAPI.getGroups().then(r => setGroups(r.data.data || r.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    penAPI.getTemplates({ type, group_id: groupId, search })
      .then(r => setTemplates(r.data.data || r.data || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [type, groupId, search]);

  return (
    <div>
      <div className="page-header-row">
        <div>
          <div className="page-title">AI Templates</div>
          <div className="page-sub">{templates.length} templates available</div>
        </div>
        <div className="search-bar" style={{ width: 240 }}>
          <Search className="search-icon" />
          <input className="form-input" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="tabs mb-4">
        {TYPE_TABS.map(t => (
          <button key={t.id} className={`tab ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
            <t.icon size={14} style={{ marginRight: 5, verticalAlign: -2 }} />{t.label}
          </button>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          <span className={`chip ${!groupId ? 'badge-brand' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setGroupId('')}>All Groups</span>
          {groups.filter(g => !type || g.type === type).map(g => (
            <span key={g._id} className="chip" style={{ cursor: 'pointer', background: groupId === g._id ? 'var(--brand-light)' : undefined, color: groupId === g._id ? 'var(--brand)' : undefined }}
              onClick={() => setGroupId(g._id)}>
              {g.group_icon} {g.group_name}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'rgba(249,115,22,.1)' }}><FileText size={28} color="var(--ai)" /></div>
          <div className="empty-title">No templates found</div>
          <div className="empty-sub">Try a different filter or search term</div>
        </div>
      ) : (
        <div className="tool-grid">
          {templates.map(t => (
            <div key={t._id} className="tool-card" onClick={() => navigate(`/pen/templates/${t._id}`)}>
              <div className="tool-card-header">
                <div className="tool-card-icon" style={{ background: 'rgba(249,115,22,.1)', fontSize: 20 }}>{t.template_icon || ''}</div>
                <span className={`badge ${TYPE_BADGE[t.type] || 'badge-default'}`}>{t.type}</span>
              </div>
              <div className="tool-card-name">{t.template_name}</div>
              <div className="tool-card-desc">{(t.description || 'AI-powered template').slice(0, 80)}</div>
              <div style={{ fontSize: 11, color: 'var(--ai)', fontWeight: 700, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                Use Template <ArrowRight size={11} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
