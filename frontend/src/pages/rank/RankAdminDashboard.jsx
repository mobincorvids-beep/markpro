import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, Settings2, Receipt, ShieldCheck, LogOut, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

/* ── Admin Layout ─────────────────────────────────────── */
function AdminLayout({ children, title }) {
  const { user, logout } = useAuth();
  const nav = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/plans', label: 'Plans', icon: Settings2 },
    { to: '/admin/payments', label: 'Payments', icon: Receipt },
  ];
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 215, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '18px 8px', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
        <div style={{ padding: '0 10px 14px', borderBottom: '1px solid var(--border)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--warning)" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Admin Panel</span>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: isActive ? '#fff' : 'var(--text-muted)', background: isActive ? 'var(--primary)' : 'transparent' })}>
              <Icon size={14} />{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 6 }}>
          <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', flex: 1 }}>
            <TrendingUp size={12} /> Dashboard
          </NavLink>
          <button onClick={logout} className="btn btn-ghost btn-sm btn-icon" title="Logout"><LogOut size={12} /></button>
        </div>
      </aside>
      <div style={{ flex: 1, marginLeft: 215 }}>
        <header style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'rgba(9,9,13,.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 30 }}>
          <ShieldCheck size={15} color="var(--warning)" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</span>
        </header>
        <main style={{ padding: '28px', maxWidth: 1160, margin: '0 auto' }}>{children}</main>
      </div>
    </div>
  );
}

/* ── ADMIN DASHBOARD ──────────────────────────────────── */
export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: adminAPI.getDashboard });
  const s = data?.data?.data;

  const cards = [
    { label: 'Total Users', value: s?.totalUsers || 0, color: 'var(--primary)' },
    { label: 'Active Subs', value: s?.activeSubs || 0, color: 'var(--success)' },
    { label: 'Total Reports', value: s?.totalReports || 0, color: 'var(--secondary)' },
    { label: 'Tool Runs', value: s?.totalToolRuns || 0, color: 'var(--warning)' },
    { label: 'New (30d)', value: s?.newUsers || 0, color: 'var(--info)' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 28 }}>
          {cards.map(({ label, value, color }) => (
            <div key={label} className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>Daily Signups (30 days)</h3>
            {s?.dailySignups?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={s.dailySignups} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#7878a0' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#7878a0' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-muted" style={{ fontSize: 13 }}>No data yet.</p>}
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>Top Tools</h3>
            {(s?.topTools || []).length === 0
              ? <p className="text-muted" style={{ fontSize: 13 }}>No runs yet.</p>
              : s.topTools.map((t, i) => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i + 1}. {t._id.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 600 }}>{t.count.toLocaleString()}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── ADMIN USERS ──────────────────────────────────────── */
export function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminAPI.listUsers({ search, page, limit: 20 }),
    keepPreviousData: true,
  });
  const users = data?.data?.data?.users || [];
  const pagination = data?.data?.data?.pagination || {};

  const toggle = async u => {
    try {
      await adminAPI.updateUser(u._id, { isActive: !u.isActive });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed'); }
  };

  return (
    <AdminLayout title="Users">
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Users ({pagination.total || 0})</h1>
          <input className="form-input" placeholder="Search name or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 24, height: 24 }} /></div>
            : (
              <table className="table">
                <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Reports</th><th>Joined</th><th></th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ opacity: u.isActive ? 1 : .5 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{u.name?.[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{u.plan?.name || 'Free'}</span></td>
                      <td><span className={`badge ${u.subscriptionStatus === 'active' ? 'badge-success' : 'badge-gray'}`} style={{ fontSize: 10 }}>{u.subscriptionStatus || 'inactive'}</span></td>
                      <td style={{ fontSize: 13 }}>{u.usage?.reports || 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '-'}</td>
                      <td>
                        <button onClick={() => toggle(u)} className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: u.isActive ? 'var(--error)' : 'var(--success)' }}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 4px' }}>{page}/{pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-outline btn-sm">Next</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ── ADMIN PLANS ──────────────────────────────────────── */
export function AdminPlans() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({ queryKey: ['admin-plans'], queryFn: adminAPI.listPlans });
  const plans = data?.data?.data || [];

  const openEdit = p => { setEditing(p._id); setForm({ ...p, price: { ...p.price }, limits: { ...p.limits }, features: { ...p.features } }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updatePlan(editing, form);
      qc.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditing(null);
      toast.success('Plan updated');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <AdminLayout title="Plans">
      <div className="fade-in">
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Plans</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {plans.map(plan => (
            <div key={plan._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>{plan.name}</h3>
                  <span style={{ fontSize: 22, fontWeight: 800 }}>${plan.price?.monthly}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>/mo</span>
                </div>
                <span className={`badge ${plan.isActive ? 'badge-success' : 'badge-gray'}`}>{plan.isActive ? 'Active' : 'Hidden'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <div>Projects: {plan.limits?.projects === -1 ? '∞' : plan.limits?.projects}</div>
                <div>Reports/mo: {plan.limits?.reportsPerMonth === -1 ? '∞' : plan.limits?.reportsPerMonth}</div>
                <div>Tool runs/day: {plan.limits?.toolRunsPerDay === -1 ? '∞' : plan.limits?.toolRunsPerDay}</div>
              </div>
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => openEdit(plan)}>Edit</button>
            </div>
          ))}
        </div>

        {editing && form && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
            <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontWeight: 700, marginBottom: 20, fontSize: 16 }}>Edit: {form.name}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Monthly Price ($)</label>
                    <input type="number" className="form-input" value={form.price?.monthly} onChange={e => setForm(p => ({ ...p, price: { ...p.price, monthly: +e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yearly Price ($)</label>
                    <input type="number" className="form-input" value={form.price?.yearly} onChange={e => setForm(p => ({ ...p, price: { ...p.price, yearly: +e.target.value } }))} />
                  </div>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>LIMITS (-1 = unlimited)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(form.limits || {}).map(([key, val]) => (
                    <div key={key} className="form-group">
                      <label className="form-label" style={{ fontSize: 11 }}>{key}</label>
                      <input type="number" className="form-input" value={val} onChange={e => setForm(p => ({ ...p, limits: { ...p.limits, [key]: +e.target.value } }))} />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>FEATURES</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(form.features || {}).map(([key, val]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!val} onChange={e => setForm(p => ({ ...p, features: { ...p.features, [key]: e.target.checked } }))} />
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setEditing(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? <><div className="spinner" /> Saving…</> : 'Save Plan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ── ADMIN PAYMENTS ───────────────────────────────────── */
export function AdminPayments() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', page],
    queryFn: () => adminAPI.listPayments({ page, limit: 30 }),
    keepPreviousData: true,
  });
  const payments = data?.data?.data?.payments || [];
  const pagination = data?.data?.data?.pagination || {};

  return (
    <AdminLayout title="Payments">
      <div className="fade-in">
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Payments ({pagination.total || 0})</h1>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark" style={{ width: 24, height: 24 }} /></div>
            : (
              <table className="table">
                <thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Interval</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.user?.name || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.user?.email}</div>
                      </td>
                      <td><span className="badge badge-primary" style={{ fontSize: 10 }}>{p.plan?.name || '-'}</span></td>
                      <td style={{ fontWeight: 600 }}>${p.amount} {p.currency}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.billingInterval}</td>
                      <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-error' : 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline btn-sm">Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 4px' }}>{page}/{pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn btn-outline btn-sm">Next</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
