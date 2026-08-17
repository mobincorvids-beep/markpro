import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '', username: user?.username || '',
    designation: user?.designation || '', phone: user?.phone || '',
    gender: user?.gender || '', dob: user?.dob || '',
    city: user?.city || '', country: user?.country || '', timezone: user?.timezone || 'UTC',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
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
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPw(false); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="page-title mb-4">Profile Settings</h1>

      <div className="card card-body mb-4">
        <div className="card-title mb-4">Personal Information</div>
        <form onSubmit={saveProfile}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Full Name</label><input value={form.name} onChange={e => f('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Username</label><input value={form.username} onChange={e => f('username', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input value={user?.email || ''} disabled style={{ opacity: .5 }} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Designation</label><input value={form.designation} onChange={e => f('designation', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select value={form.gender} onChange={e => f('gender', e.target.value)}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" value={form.dob} onChange={e => f('dob', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">City</label><input value={form.city} onChange={e => f('city', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Country</label><input value={form.country} onChange={e => f('country', e.target.value)} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="inline-spin" />} Save Profile
          </button>
        </form>
      </div>

      <div className="card card-body mb-4">
        <div className="card-title mb-4">Change Password</div>
        <form onSubmit={savePassword}>
          <div className="form-group"><label className="form-label">Current Password</label><input type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">New Password</label><input type="password" required minLength={6} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Confirm Password</label><input type="password" required value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw && <span className="inline-spin" />} Update Password
          </button>
        </form>
      </div>

      <div className="card card-body">
        <div className="card-title mb-3">Account Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          {[['Role', user?.role], ['Referral Code', user?.referralCode], ['Credits', user?.credits?.toLocaleString()]].map(([k, v]) => (
            <div key={k} className="flex justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <span className="text-muted">{k}</span>
              <span style={{ fontWeight: 600 }}>{v || '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
