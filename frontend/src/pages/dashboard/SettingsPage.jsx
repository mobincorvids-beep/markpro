import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { User, Lock, Key, Trash2, AlertTriangle, Copy, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'api', label: 'API Key', icon: Key },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const save = async (action, msg) => {
    setSaving(true);
    try { await action(); toast.success(msg); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveProfile = () => save(async () => {
    await userAPI.updateProfile(profile);
    updateUser(profile);
  }, 'Profile updated');

  const changePassword = () => {
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    save(() => userAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }), 'Password changed');
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const regenApiKey = async () => {
    if (!window.confirm('Regenerate API key? Your current key will stop working immediately.')) return;
    try {
      const { data } = await userAPI.regenerateApiKey();
      setApiKey(data.data.apiKey);
      updateUser({ apiKey: data.data.apiKey });
      toast.success('API key regenerated');
    } catch { toast.error('Failed to regenerate key'); }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    toast.success('Copied!');
  };

  const deleteAccount = async () => {
    if (window.prompt('Type DELETE to confirm:') !== 'DELETE') return;
    try {
      await userAPI.deleteAccount();
      await logout();
      navigate('/');
    } catch { toast.error('Failed to delete account'); }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="fade-in">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Account Settings</h1>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Tab sidebar */}
          <div style={{ width: 190, flexShrink: 0 }}>
            <div className="card" style={{ padding: 6 }}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`btn ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 8, marginBottom: 2, fontSize: 13,
                    color: id === 'danger' && activeTab !== id ? 'var(--error)' : undefined }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1 }}>
            {activeTab === 'profile' && (
              <div className="card">
                <h2 style={{ fontWeight: 600, marginBottom: 20, fontSize: 16 }}>Profile Information</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" value={user?.email} disabled style={{ opacity: .5 }} />
                    <span className="form-hint">Email cannot be changed</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Avatar URL</label>
                    <input className="form-input" placeholder="https://…" value={profile.avatar || ''} onChange={e => setProfile(p => ({ ...p, avatar: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
                      {saving ? <><div className="spinner" /> Saving…</> : <><Check size={13} /> Save Profile</>}
                    </button>
                    <span className={`badge ${user?.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>
                      {user?.isEmailVerified ? 'Email verified' : 'Email unverified'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <h2 style={{ fontWeight: 600, marginBottom: 20, fontSize: 16 }}>Change Password</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-input" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-input" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-input" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} />
                    {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <span className="form-error">Passwords do not match</span>
                    )}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={changePassword} disabled={saving}>
                    {saving ? <><div className="spinner" /> Changing…</> : 'Change Password'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="card">
                <h2 style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>API Key</h2>
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
                  Use this key to authenticate API requests for tracking pixel data and managing campaigns programmatically.
                </p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input className="form-input" value={apiKey} readOnly style={{ fontFamily: 'monospace', fontSize: 13 }} />
                  <button className="btn btn-outline btn-sm" onClick={copyApiKey}>
                    {apiKeyCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <button className="btn btn-outline btn-sm" onClick={regenApiKey}>
                  <RefreshCw size={13} /> Regenerate Key
                </button>
                <p className="form-hint" style={{ marginTop: 10 }}>
 Regenerating will immediately invalidate your current key.
                </p>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="card" style={{ borderColor: 'var(--error)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
                  <AlertTriangle size={20} color="var(--error)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h2 style={{ fontWeight: 600, fontSize: 16, color: 'var(--error)', marginBottom: 4 }}>Danger Zone</h2>
                    <p className="text-muted" style={{ fontSize: 13 }}>These actions are irreversible.</p>
                  </div>
                </div>
                <div style={{ padding: 16, border: '1px solid rgba(239,68,68,.25)', borderRadius: 8 }}>
                  <h3 style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>Delete Account</h3>
                  <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
                    Permanently delete your account, all campaigns, notifications, and collected leads. Cannot be undone.
                  </p>
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
