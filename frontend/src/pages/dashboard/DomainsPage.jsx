import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Globe, Trash2, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DomainsPage() {
  const qc = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: userAPI.listDomains,
  });
  const domains = data?.data?.data || [];

  const handleAdd = async e => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      await userAPI.createDomain({ host: newDomain.trim() });
      qc.invalidateQueries({ queryKey: ['domains'] });
      setNewDomain('');
      toast.success('Domain added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add domain');
    } finally { setAdding(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this domain?')) return;
    try {
      await userAPI.deleteDomain(id);
      qc.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Domain removed');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <DashboardLayout title="Domains">
      <div className="fade-in">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Allowed Domains</h1>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Domains registered here are allowed to load your campaign widgets. Wildcards (*.example.com) are supported.
          </p>
        </div>

        {/* Add domain */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Add Domain</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Globe size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" placeholder="example.com or *.example.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding || !newDomain.trim()}>
              {adding ? <><div className="spinner" /> Adding…</> : <><Plus size={14} /> Add Domain</>}
            </button>
          </form>
        </div>

        {/* Domains list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 26, height: 26 }} /></div>
          ) : domains.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '44px 24px', color: 'var(--text-muted)' }}>
              <Globe size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: .2 }} />
              <p style={{ fontSize: 14 }}>No domains added yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Domain</th><th>Status</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {domains.map(d => (
                  <tr key={d._id}>
                    <td style={{ fontWeight: 500, fontSize: 14 }}>{d.host}</td>
                    <td>
                      {d.isVerified
                        ? <span className="badge badge-success"><CheckCircle size={10} /> Verified</span>
                        : <span className="badge badge-warning"><Clock size={10} /> Pending</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.createdAt ? format(new Date(d.createdAt), 'MMM d, yyyy') : '-'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(d._id)} title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
