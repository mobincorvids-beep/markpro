import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { User, Lock, Trash2, AlertTriangle, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const save = async (action, msg) => {
    setSaving(true);
    try { await action(); toast.success(msg); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveProfile = () => save(async () => { await userAPI.updateProfile(profile); updateUser(profile); }, 'Profile updated');

  const changePassword = () => {
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    save(() => userAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }), 'Password changed');
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const deleteAccount = async () => {
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') return;
    try { await userAPI.deleteAccount(); await logout(); navigate('/'); }
    catch { toast.error('Failed to delete account'); }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="fade-in">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Account Settings</h1>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Sidebar */}
          <div style={{ width: 180, flexShrink: 0 }}>
            <div className="card" style={{ padding: 6 }}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`btn ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8, marginBottom: 2, fontSize: 13, color: id === 'danger' && activeTab !== id ? 'var(--error)' : undefined }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            {activeTab === 'profile' && (
              <div className="card">
                <h2 style={{ fontWeight: 600, marginBottom: 20, fontSize: 16 }}>Profile</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={user?.email} disabled style={{ opacity: .5 }} />
                    <span className="form-hint">Email cannot be changed</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Avatar URL</label>
                    <input className="form-input" placeholder="https://…" value={profile.avatar || ''} onChange={e => setProfile(p => ({ ...p, avatar: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
                      {saving ? <><div className="spinner" /> Saving…</> : <><Check size={13} /> Save</>}
                    </button>
                    <span className={`badge ${user?.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>
                      {user?.isEmailVerified ? 'Email verified' : 'Email not verified'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <h2 style={{ fontWeight: 600, marginBottom: 20, fontSize: 16 }}>Change Password</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 380 }}>
                  {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm Password']].map(([key, label]) => (
                    <div key={key} className="form-group">
                      <label className="form-label">{label}</label>
                      <input type="password" className="form-input" value={passwords[key]} onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))} />
                    </div>
                  ))}
                  {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                    <span className="form-error">Passwords do not match</span>
                  )}
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={changePassword} disabled={saving}>
                    {saving ? <><div className="spinner" /> Saving…</> : 'Change Password'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="card" style={{ borderColor: 'var(--error)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
                  <AlertTriangle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h2 style={{ fontWeight: 600, fontSize: 16, color: 'var(--error)', marginBottom: 4 }}>Danger Zone</h2>
                    <p className="text-muted" style={{ fontSize: 13 }}>These actions are permanent and irreversible.</p>
                  </div>
                </div>
                <div style={{ padding: 16, border: '1px solid rgba(239,68,68,.25)', borderRadius: 8 }}>
                  <h3 style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Delete Account</h3>
                  <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>Permanently delete your account, all projects, and all reports.</p>
                  <button className="btn btn-danger btn-sm" onClick={deleteAccount}><Trash2 size={13} /> Delete My Account</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
