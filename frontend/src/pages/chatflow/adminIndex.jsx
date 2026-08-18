import React, { useState } from 'react';
import { Page, Async, useResource, StatsDashboard, listOf, objOf, date, errText } from '../../components/admin/adminKit';
import { chatflowAdminAPI } from '../../services/api';

export function ChatflowAdminDashboard() {
  return (
    <StatsDashboard
      title="ChatFlow — overview"
      subtitle="Chatbot / messaging platform health at a glance"
      fetcher={async () => objOf(await chatflowAdminAPI.getStats())}
      cards={[
        { label: 'Total tenants',  key: 'totalTenants' },
        { label: 'Subscribers',    key: 'totalSubscribers' },
        { label: 'Broadcasts sent',key: 'totalBroadcasts' },
        { label: 'Orders',         key: 'totalOrders' },
      ]}
    />
  );
}

export function ChatflowAdminTenants() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useResource(
    async () => listOf(await chatflowAdminAPI.getTenants({ search: q || undefined }), 'tenants'),
    [q],
  );
  const tenants = data || [];

  const suspend = async (t) => {
    try { await chatflowAdminAPI.suspendTenant(t._id, { suspended: !t.suspended }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this tenant.')); }
  };

  return (
    <Page title="ChatFlow — Tenants" subtitle={`${tenants.length} shown`}
          actions={
            <input className="input" placeholder="Search tenant…" defaultValue={q}
                   onKeyDown={e => { if (e.key === 'Enter') setQ(e.target.value.trim()); }}
                   style={{ minWidth: 240 }} />
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!tenants.length} emptyLabel="No tenants match this search.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tenant</th><th>Owner</th><th>Created</th><th>Status</th><th /></tr></thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t._id}>
                  <td style={{ fontWeight: 700 }}>{t.name || t.pageName || '-'}</td>
                  <td>{t.user?.email || '-'}</td>
                  <td>{date(t.createdAt)}</td>
                  <td>
                    <span className={`badge ${t.suspended ? 'badge-danger' : 'badge-success'}`}>
                      {t.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => suspend(t)}>
                      {t.suspended ? 'Reactivate' : 'Suspend'}
                    </button>
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

export default ChatflowAdminDashboard;
