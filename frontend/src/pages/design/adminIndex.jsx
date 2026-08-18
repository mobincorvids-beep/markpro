import React, { useState } from 'react';
import { Page, Async, useResource, StatsDashboard, listOf, objOf, errText } from '../../components/admin/adminKit';
import { designAdminAPI, designAPI } from '../../services/api';

export function DesignAdminDashboard() {
  return (
    <StatsDashboard
      title="Design Studio — overview"
      subtitle="Design platform health at a glance"
      fetcher={async () => objOf(await designAdminAPI.getStats())}
      cards={[
        { label: 'Total projects', key: 'totalProjects' },
        { label: 'Total users',    key: 'totalUsers' },
        { label: 'Platform templates', key: 'totalTemplates' },
        { label: 'Media uploads',  key: 'totalMedia' },
      ]}
    />
  );
}

export function DesignAdminTemplates() {
  const [name, setName] = useState('');
  const { data, loading, error, reload } = useResource(async () => listOf(await designAPI.getTemplates({ limit: 100 }), 'templates'));
  const templates = data || [];

  const remove = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try { await designAdminAPI.deleteTemplate(t._id); reload(); }
    catch (e) { alert(errText(e, 'Could not delete this template.')); }
  };
  const create = async () => {
    if (!name.trim()) return;
    try { await designAdminAPI.createTemplate({ name: name.trim() }); setName(''); reload(); }
    catch (e) { alert(errText(e, 'Could not create this template.')); }
  };

  return (
    <Page title="Design Studio — Templates" subtitle={`${templates.length} platform templates`}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="New template name…" value={name}
                     onChange={e => setName(e.target.value)} style={{ minWidth: 220 }} />
              <button className="btn btn-primary btn-sm" onClick={create}>Add</button>
            </div>
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!templates.length} emptyLabel="No platform templates yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Template</th><th>Category</th><th /></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.category || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

export default DesignAdminDashboard;
