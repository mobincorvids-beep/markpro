import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatBytes } from '../../utils/fileUtils';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name:user?.name||'', department:user?.department||'', jobTitle:user?.jobTitle||'', phone:user?.phone||'' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async e => {
    e.preventDefault(); setSaving(true);
    try { await api.put('/auth/profile', form); await refreshUser(); toast.success('Profile updated'); }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const savePassword = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    setSavingPw(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password updated');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setSavingPw(false); }
  };

  const usedPct = user ? Math.min(100, (user.storageUsedMB/user.storageQuotaMB)*100) : 0;

  return (
    <div style={{ maxWidth:600 }}>
      <h1 className="page-title mb-4">Profile Settings</h1>

      <div className="card card-body mb-4">
        <h2 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Personal Information</h2>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input value={user?.email||''} disabled style={{ opacity:.6 }} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <input value={form.department} onChange={e=>setForm({...form,department:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input value={form.jobTitle} onChange={e=>setForm({...form,jobTitle:e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="inline-spin"/>} Save Changes
          </button>
        </form>
      </div>

      <div className="card card-body mb-4">
        <h2 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Change Password</h2>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input type="password" required value={pwForm.currentPassword} onChange={e=>setPwForm({...pwForm,currentPassword:e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" required minLength={6} value={pwForm.newPassword} onChange={e=>setPwForm({...pwForm,newPassword:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" required value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw && <span className="inline-spin"/>} Update Password
          </button>
        </form>
      </div>

      <div className="card card-body">
        <h2 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Storage</h2>
        <div className="flex justify-between text-sm mb-2">
          <span>{formatBytes(user?.storageUsedMB*1024*1024)} used</span>
          <span className="text-muted">{formatBytes(user?.storageQuotaMB*1024*1024)} total</span>
        </div>
        <div className="storage-bar" style={{ height:10 }}>
          <div className="storage-fill" style={{ width:`${usedPct}%`, background: usedPct>90?'var(--red)':usedPct>70?'var(--yellow)':'var(--accent)' }} />
        </div>
        <p className="text-muted text-sm mt-3">Contact your administrator to increase your storage quota.</p>
      </div>
    </div>
  );
}
