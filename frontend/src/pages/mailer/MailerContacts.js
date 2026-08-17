import { useState, useEffect, useRef } from 'react';
import { mailerAPI } from '../../services/api';

const INIT = { firstName: '', lastName: '', email: '', phone: '', groups: [] };

export default function MailerContacts() {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [groupId, setGroupId]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState(INIT);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, gRes] = await Promise.all([
        mailerAPI.getContacts({ page, limit: 50, search, groupId }),
        mailerAPI.getGroups(),
      ]);
      setContacts(cRes.data.contacts || []);
      setTotal(cRes.data.total || 0);
      setGroups(gRes.data.groups || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search, groupId]); // eslint-disable-line

  const handleSave = async () => {
    try {
      const r = await mailerAPI.createContact(form);
      setContacts(c => [r.data.contact, ...c]);
      setShowAdd(false);
      setForm(INIT);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    if (groupId) fd.append('groupId', groupId);
    try {
      const r = await mailerAPI.importContacts(fd);
      alert(r.data.message);
      load();
    } catch (e) { alert(e?.response?.data?.message || 'Import failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await mailerAPI.deleteContact(id);
    setContacts(c => c.filter(x => x._id !== id));
    setTotal(t => t - 1);
  };

  const F = ({ label, name, type = 'text' }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} />
    </div>
  );

  return (
    <div className="page">
      <div className="topbar">
        <h1>Contacts <span className="badge badge-secondary ml-1">{total}</span></h1>
        <div className="topbar-actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Contact</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Search by name, email, phone…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="input" style={{ width: 180 }} value={groupId}
          onChange={e => { setGroupId(e.target.value); setPage(1); }}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.contactCount})</option>)}
        </select>
      </div>

      {showAdd && (
        <div className="card mb-2">
          <h3 className="mb-1">New Contact</h3>
          <div className="grid-2 gap-2 mb-1">
            <F label="First Name *" name="firstName" />
            <F label="Last Name" name="lastName" />
            <F label="Email" name="email" type="email" />
            <F label="Phone" name="phone" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn" onClick={() => { setShowAdd(false); setForm(INIT); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading
        ? <div className="loader"><div className="spinner" /></div>
        : contacts.length === 0
          ? <div className="empty-state"><div className="empty-icon"></div><p>No contacts found.</p></div>
          : <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 500 }}>{c.firstName} {c.lastName}</td>
                      <td>{c.email || '-'}</td>
                      <td>{c.phone || '-'}</td>
                      <td><span className={`badge badge-${c.status === 'active' ? 'success' : c.status === 'unsubscribed' ? 'warning' : 'danger'}`}>{c.status}</span></td>
                      <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      }

      {total > 50 && (
        <div className="pagination">
          <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={{ fontSize: 12, padding: '0 8px' }}>Page {page} of {Math.ceil(total / 50)}</span>
          <button className="btn btn-sm" onClick={() => setPage(p => p + 1)} disabled={contacts.length < 50}>Next →</button>
        </div>
      )}
    </div>
  );
}
