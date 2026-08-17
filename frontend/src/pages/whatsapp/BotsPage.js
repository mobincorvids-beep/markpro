import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { botsApi, templatesApi } from '../../services/api';

const BLANK_MSG = { name:'', relType:'all', replyText:'', trigger:[], isBotActive:true };
const BLANK_TPL = { name:'', relType:'all', templateId:'', trigger:[], isBotActive:true, bodyParams:[], headerParams:[] };

export default function BotsPage() {
  const [msgBots,   setMsgBots]   = useState([]);
  const [tplBots,   setTplBots]   = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tab,       setTab]       = useState('message'); // 'message' | 'template'
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(BLANK_MSG);
  const [triggerInput, setTriggerInput] = useState('');

  useEffect(() => {
    botsApi.all().then(r => { setMsgBots(r.data.messageBots); setTplBots(r.data.templateBots); });
    templatesApi.list().then(r => setTemplates(r.data.filter(t => t.status === 'APPROVED')));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(tab === 'message' ? BLANK_MSG : BLANK_TPL);
    setTriggerInput('');
    setShowForm(true);
  };

  const openEdit = (bot) => {
    setEditing(bot._id);
    setForm({ ...bot });
    setTriggerInput(Array.isArray(bot.trigger) ? bot.trigger.map(t => typeof t === 'object' ? t.value : t).join(', ') : '');
    setShowForm(true);
  };

  const parseTriggers = (str) =>
    str.split(',').map(t => t.trim()).filter(Boolean);

  const save = async () => {
    const payload = { ...form, trigger: parseTriggers(triggerInput) };
    try {
      if (tab === 'message') {
        if (editing) {
          const { data } = await botsApi.updateMsgBot(editing, payload);
          setMsgBots(p => p.map(b => b._id === editing ? data : b));
        } else {
          const { data } = await botsApi.createMsgBot(payload);
          setMsgBots(p => [data, ...p]);
        }
      } else {
        if (editing) {
          const { data } = await botsApi.updateTplBot(editing, payload);
          setTplBots(p => p.map(b => b._id === editing ? data : b));
        } else {
          const { data } = await botsApi.createTplBot(payload);
          setTplBots(p => [data, ...p]);
        }
      }
      toast.success(editing ? 'Updated' : 'Created');
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this bot?')) return;
    try {
      if (tab === 'message') { await botsApi.deleteMsgBot(id); setMsgBots(p => p.filter(b => b._id !== id)); }
      else { await botsApi.deleteTplBot(id); setTplBots(p => p.filter(b => b._id !== id)); }
      toast.success('Deleted');
    } catch (err) { toast.error('Failed'); }
  };

  const toggle = async (id) => {
    try {
      if (tab === 'message') {
        const { data } = await botsApi.toggleMsgBot(id);
        setMsgBots(p => p.map(b => b._id === id ? { ...b, isBotActive: data.isBotActive } : b));
      } else {
        const { data } = await botsApi.toggleTplBot(id);
        setTplBots(p => p.map(b => b._id === id ? { ...b, isBotActive: data.isBotActive } : b));
      }
    } catch (err) { toast.error('Failed'); }
  };

  const bots = tab === 'message' ? msgBots : tplBots;

  return (
    <>
      <div className="page-header">
        <h1>Bots</h1>
        <div className="flex gap-2">
          <div className="flex" style={{ background: 'var(--bg3)', borderRadius: 7, padding: 3, gap: 3 }}>
            {['message','template'].map(t => (
              <button key={t} className={`btn btn-xs ${tab===t?'btn-primary':'btn-ghost'}`} onClick={() => { setTab(t); setShowForm(false); }}>
                {t === 'message' ? 'Message Bots' : 'Template Bots'}
              </button>
            ))}
          </div>
          <button className="btn btn-green btn-sm" onClick={openCreate}>＋ New Bot</button>
        </div>
      </div>
      <div className="page-body">
        {/* Create / Edit form */}
        {showForm && (
          <div className="card card-body mb-2" style={{ maxWidth: 600 }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>{editing ? 'Edit' : 'New'} {tab === 'message' ? 'Message' : 'Template'} Bot</div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Bot Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Apply to</label>
                <select className="form-control" value={form.relType} onChange={e => setForm({...form, relType: e.target.value})}>
                  {['all','lead','customer'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Trigger Keywords <span className="text-muted">(comma-separated, empty = match all)</span></label>
              <input className="form-control" value={triggerInput} onChange={e => setTriggerInput(e.target.value)} placeholder="hello, hi, start" />
            </div>

            {tab === 'message' ? (
              <div className="form-group">
                <label className="form-label">Reply Text</label>
                <textarea className="form-control" rows={4} value={form.replyText} onChange={e => setForm({...form, replyText: e.target.value})} />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">WhatsApp Template</label>
                  <select className="form-control" value={form.templateId} onChange={e => setForm({...form, templateId: e.target.value})}>
                    <option value="">Select approved template…</option>
                    {templates.map(t => <option key={t._id} value={t.templateId}>{t.templateName} ({t.language})</option>)}
                  </select>
                </div>
                {templates.find(t => t.templateId === form.templateId)?.bodyParamsCount > 0 && (
                  <div className="form-group">
                    <label className="form-label">Body Params</label>
                    {Array.from({ length: templates.find(t => t.templateId === form.templateId)?.bodyParamsCount || 0 }, (_, i) => (
                      <input key={i} className="form-control mb-1" placeholder={`{{${i+1}}} value`}
                        value={form.bodyParams?.[i] || ''} onChange={e => { const bp = [...(form.bodyParams||[])]; bp[i] = e.target.value; setForm({...form, bodyParams: bp}); }} />
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <button className="btn btn-green btn-sm" onClick={save}>Save Bot</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Bots table */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Triggers</th><th>Applies to</th><th>Sent</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {bots.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--text2)'}}>No bots yet</td></tr>}
                {bots.map(bot => (
                  <tr key={bot._id}>
                    <td style={{ fontWeight: 600 }}>{bot.name}</td>
                    <td style={{ maxWidth: 200 }}>
                      {Array.isArray(bot.trigger) && bot.trigger.length > 0
                        ? bot.trigger.slice(0, 3).map((t, i) => (
                            <span key={i} className="badge badge-gray" style={{ marginRight: 3 }}>
                              {typeof t === 'object' ? t.value : t}
                            </span>
                          ))
                        : <span className="badge badge-blue">All messages</span>
                      }
                    </td>
                    <td><span className="badge badge-purple">{bot.relType}</span></td>
                    <td>{bot.sendingCount?.toLocaleString() || 0}</td>
                    <td>
                      <button
                        className={`btn btn-xs ${bot.isBotActive ? 'btn-green' : 'btn-outline'}`}
                        onClick={() => toggle(bot._id)}
                      >
                        {bot.isBotActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-outline btn-xs" onClick={() => openEdit(bot)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => del(bot._id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
