import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Download, Search, Mail, Phone, User, Globe, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () => userAPI.listLeads({ page, limit: 30 }),
    keepPreviousData: true,
  });

  const leads = data?.data?.data?.leads || [];
  const pagination = data?.data?.data?.pagination || {};

  const exportCsv = () => {
    const rows = [['Email', 'Name', 'Phone', 'Campaign', 'Notification', 'Country', 'Date']];
    leads.forEach(l => rows.push([l.email || '', l.name || '', l.phone || '', l.campaign?.name || '', l.notification?.name || '', l.country || '', l.createdAt ? format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm') : '']));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const filtered = search
    ? leads.filter(l => [l.email, l.name, l.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    : leads;

  return (
    <DashboardLayout title="Leads">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Leads</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>{pagination.total || 0} total leads collected</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={leads.length === 0}>
            <Download size={13} /> Export CSV
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-dark" style={{ width: 28, height: 28 }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 24px', color: 'var(--text-muted)' }}>
              <User size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: .2 }} />
              <p style={{ fontSize: 14 }}>No leads yet. They appear here when visitors submit email collector forms.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Contact</th><th>Campaign</th><th>Notification</th><th>Location</th><th>Date</th></tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead._id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {lead.name && <span style={{ fontWeight: 500, fontSize: 13 }}>{lead.name}</span>}
                        {lead.email && <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{lead.email}</span>}
                        {lead.phone && <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{lead.phone}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.campaign?.name || '-'}</td>
                    <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{lead.notification?.name || '-'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {lead.country && <><Globe size={11} />{lead.country}</>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm"><ChevronLeft size={14} /></button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-outline btn-sm"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
