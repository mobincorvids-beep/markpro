import React, { useState } from 'react';
import { Page, Async, useResource, StatsDashboard, listOf, objOf, errText } from '../../components/admin/adminKit';
import { toolsaiAdminAPI, toolsaiAPI } from '../../services/api';

export function ToolsaiAdminDashboard() {
  return (
    <StatsDashboard
      title="ToolsAI — overview"
      subtitle="AI tools platform health at a glance"
      fetcher={async () => objOf(await toolsaiAdminAPI.getStats())}
      cards={[
        { label: 'Total users',     key: 'totalUsers' },
        { label: 'Conversations',   key: 'totalConversations' },
        { label: 'Templates',       key: 'totalTemplates' },
        { label: 'Generations (30d)', key: 'recentGenerations' },
      ]}
    />
  );
}

export function ToolsaiAdminContent() {
  const [title, setTitle] = useState('');
  const { data, loading, error, reload } = useResource(async () => listOf(await toolsaiAPI.getTemplates({ limit: 100 }), 'templates'));
  const templates = data || [];

  const create = async () => {
    if (!title.trim()) return;
    try { await toolsaiAdminAPI.createTemplate({ title: title.trim() }); setTitle(''); reload(); }
    catch (e) { alert(errText(e, 'Could not create this template.')); }
  };

  return (
    <Page title="ToolsAI — Templates" subtitle={`${templates.length} templates`}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="New template title…" value={title}
                     onChange={e => setTitle(e.target.value)} style={{ minWidth: 220 }} />
              <button className="btn btn-primary btn-sm" onClick={create}>Add</button>
            </div>
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!templates.length} emptyLabel="No templates yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Category</th></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.title || t.name}</td>
                  <td>{t.category || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

export default ToolsaiAdminDashboard;
