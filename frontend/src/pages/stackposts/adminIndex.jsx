import React, { useState } from 'react';
import { Page, Async, useResource, StatsDashboard, listOf, objOf, money, date, errText } from '../../components/admin/adminKit';
import { stackpostsAdminAPI } from '../../services/api';

export function StackpostsAdminDashboard() {
  return (
    <StatsDashboard
      title="StackPosts — overview"
      subtitle="Social scheduling platform health at a glance"
      fetcher={async () => objOf(await stackpostsAdminAPI.getStats())}
      cards={[
        { label: 'Total teams',   key: 'totalTeams' },
        { label: 'Total posts',   key: 'totalPosts' },
        { label: 'Open tickets',  key: 'openTickets' },
        { label: 'Pending withdrawals', key: 'pendingWithdrawals' },
      ]}
    />
  );
}

export function StackpostsAdminTickets() {
  const { data, loading, error, reload } = useResource(async () => listOf(await stackpostsAdminAPI.getTickets({ limit: 50 }), 'tickets'));
  const tickets = data || [];
  const [replyId, setReplyId] = useState(null);
  const [reply, setReply] = useState('');

  const send = async (t) => {
    if (!reply.trim()) return;
    try { await stackpostsAdminAPI.replyTicket(t._id, { message: reply.trim() }); setReply(''); setReplyId(null); reload(); }
    catch (e) { alert(errText(e, 'Could not send this reply.')); }
  };

  return (
    <Page title="StackPosts — Support Tickets" subtitle={`${tickets.length} shown`}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!tickets.length} emptyLabel="No support tickets.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Subject</th><th>User</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>
              {tickets.map(t => (
                <React.Fragment key={t._id}>
                  <tr>
                    <td style={{ fontWeight: 700 }}>{t.subject || '-'}</td>
                    <td>{t.user?.email || '-'}</td>
                    <td><span className={`badge ${t.status === 'closed' ? 'badge-default' : 'badge-warning'}`}>{t.status || 'open'}</span></td>
                    <td>{date(t.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => setReplyId(replyId === t._id ? null : t._id)}>
                        {replyId === t._id ? 'Cancel' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                  {replyId === t._id && (
                    <tr><td colSpan={5}>
                      <div style={{ display: 'flex', gap: 8, padding: '8px 0' }}>
                        <input className="input" style={{ flex: 1 }} placeholder="Type a reply…"
                               value={reply} onChange={e => setReply(e.target.value)} />
                        <button className="btn btn-primary btn-sm" onClick={() => send(t)}>Send</button>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

export function StackpostsAdminWithdrawals() {
  const { data, loading, error, reload } = useResource(async () => listOf(await stackpostsAdminAPI.getWithdrawals({ limit: 50 }), 'withdrawals'));
  const rows = data || [];

  const setStatus = async (w, status) => {
    try { await stackpostsAdminAPI.updateWithdrawal(w._id, { status }); reload(); }
    catch (e) { alert(errText(e, 'Could not update this withdrawal.')); }
  };

  return (
    <Page title="StackPosts — Affiliate Withdrawals" subtitle={`${rows.length} shown`}
          actions={<button className="btn btn-secondary btn-sm" onClick={reload}>Refresh</button>}>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!rows.length} emptyLabel="No withdrawal requests.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>
              {rows.map(w => (
                <tr key={w._id}>
                  <td>{w.user?.email || '-'}</td>
                  <td>{money(w.amount)}</td>
                  <td>
                    <span className={`badge ${
                      /approved|paid/i.test(w.status) ? 'badge-success'
                        : /reject|declin/i.test(w.status) ? 'badge-danger' : 'badge-warning'}`}>{w.status || 'pending'}</span>
                  </td>
                  <td>{date(w.createdAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => setStatus(w, 'approved')}>Approve</button>{' '}
                    <button className="btn btn-secondary btn-xs" onClick={() => setStatus(w, 'rejected')}>Reject</button>
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

export function StackpostsAdminContent() {
  const [title, setTitle] = useState('');
  const { data, loading, error, reload } = useResource(async () => listOf(await stackpostsAdminAPI.getAiTemplates(), 'templates'));
  const templates = data || [];

  const create = async () => {
    if (!title.trim()) return;
    try { await stackpostsAdminAPI.createAiTemplate({ title: title.trim() }); setTitle(''); reload(); }
    catch (e) { alert(errText(e, 'Could not create this AI template.')); }
  };

  return (
    <Page title="StackPosts — AI Templates" subtitle={`${templates.length} templates`}
          actions={
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="New template title…" value={title}
                     onChange={e => setTitle(e.target.value)} style={{ minWidth: 220 }} />
              <button className="btn btn-primary btn-sm" onClick={create}>Add</button>
            </div>
          }>
      <Async loading={loading} error={error} onRetry={reload}
             empty={!templates.length} emptyLabel="No AI templates yet.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t._id}><td style={{ fontWeight: 700 }}>{t.title || t.name}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Page>
  );
}

export default StackpostsAdminDashboard;
