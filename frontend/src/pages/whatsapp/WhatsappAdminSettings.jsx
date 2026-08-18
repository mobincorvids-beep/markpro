import React, { useEffect, useState } from 'react';
import { Page, Async, useResource, objOf, errText } from '../../components/admin/adminKit';
import { whatsappAdminAPI } from '../../services/api';

export default function WhatsappAdminSettings() {
  const { data, loading, error, reload } = useResource(async () => objOf(await whatsappAdminAPI.getSettings()) || {});
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try { await whatsappAdminAPI.updateSettings(form); reload(); }
    catch (e) { alert(errText(e, 'Could not save settings.')); }
    finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="WhatsApp Marketing — Settings" subtitle="Platform-wide configuration"
          actions={<button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>}>
      <Async loading={loading} error={error} onRetry={reload}>
        {form && (
          <div className="card" style={{ maxWidth: 520 }}>
            <div className="card-body" style={{ display: 'grid', gap: 14 }}>
              <label className="field">
                <span className="field-label">Default WhatsApp API base URL</span>
                <input className="input" value={form.apiBaseUrl || ''} onChange={set('apiBaseUrl')} />
              </label>
              <label className="field">
                <span className="field-label">Default rate limit (messages/min)</span>
                <input className="input" type="number" value={form.rateLimitPerMin ?? ''} onChange={set('rateLimitPerMin')} />
              </label>
              <label className="field">
                <span className="field-label">Support email</span>
                <input className="input" value={form.supportEmail || ''} onChange={set('supportEmail')} />
              </label>
            </div>
          </div>
        )}
      </Async>
    </Page>
  );
}
