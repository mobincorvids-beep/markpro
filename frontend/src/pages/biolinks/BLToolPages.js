import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { biolinksAPI } from '../../services/api';

const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

export default function BLToolPages() {
  const [codes, setCodes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName]       = useState('');
  const [data, setData]       = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await biolinksAPI.getQrCodes();
      const body = res?.data?.data ?? res?.data ?? [];
      setCodes(Array.isArray(body) ? body : []);
    } catch (e) { setError(errText(e, 'Could not load your QR codes.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim() || !data.trim()) return;
    setSaving(true);
    try {
      await biolinksAPI.createQrCode({ name: name.trim(), type: 'url', data: data.trim() });
      setName(''); setData(''); setShowForm(false);
      load();
    } catch (e) { alert(errText(e, 'Could not create this QR code.')); }
    finally { setSaving(false); }
  };

  const remove = async (qr) => {
    if (!window.confirm(`Delete "${qr.name}"?`)) return;
    try { await biolinksAPI.deleteQrCode(qr._id); load(); }
    catch (e) { alert(errText(e, 'Could not delete this QR code.')); }
  };

  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">Tools — QR Codes</div></div>
        <button className="btn btn-bio btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> New QR code
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            <label className="field">
              <span className="field-label">Name</span>
              <input className="input" placeholder="e.g. Business card" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">URL to encode</span>
              <input className="input" placeholder="https://example.com" value={data} onChange={e => setData(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-bio btn-sm" disabled={saving} onClick={create}>{saving ? 'Generating…' : 'Generate QR code'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : error ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">Couldn't load this</div>
            <div className="empty-sub">{error}</div>
            <button className="btn btn-secondary btn-sm mt-4" onClick={load}>Try again</button>
          </div>
        </div></div>
      ) : !codes.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">No QR codes yet</div>
            <div className="empty-sub">Generate one above to get started.</div>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          {codes.map(qr => (
            <div className="card" key={qr._id}>
              <div className="card-body" style={{ textAlign: 'center' }}>
                {qr.settings?.qr_data_url && (
                  <img src={qr.settings.qr_data_url} alt={qr.name} style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />
                )}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{qr.name}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {qr.settings?.qr_data_url && (
                    <a className="btn btn-secondary btn-xs" href={qr.settings.qr_data_url} download={`${qr.name}.png`}>
                      <Download size={13} />
                    </a>
                  )}
                  <button className="btn btn-secondary btn-xs" onClick={() => remove(qr)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
