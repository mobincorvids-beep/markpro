import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiCopy } from 'react-icons/fi';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name:user?.name||'', timezone:user?.timezone||'UTC' });
  const [pw, setPw] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async e => {
    e.preventDefault(); setSaving(true);
    try { await api.put('/auth/profile', form); await refreshUser(); toast.success('Profile updated'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };
  const savePassword = async e => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match');
    setSavingPw(true);
    try { await api.put('/auth/password', { currentPassword:pw.currentPassword, newPassword:pw.newPassword }); toast.success('Password updated'); setPw({currentPassword:'',newPassword:'',confirm:''}); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPw(false); }
  };

  const referralLink = `${window.location.origin}/register?ref=${user?.affiliateCode}`;
  const copyLink = () => { navigator.clipboard.writeText(referralLink); toast.success('Copied!'); };

  return (
    <div style={{ maxWidth:620 }}>
      <h1 className="page-title mb-4">Profile Settings</h1>

      <div className="card card-body mb-4">
        <div className="card-title mb-4">Personal Information</div>
        <form onSubmit={saveProfile}>
          <div className="form-group"><label className="form-label">Full Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Email</label><input value={user?.email||''} disabled style={{opacity:.5}} /></div>
          <div className="form-group"><label className="form-label">Timezone</label><input value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})} /></div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving && <span className="inline-spin"/>} Save</button>
        </form>
      </div>

      <div className="card card-body mb-4">
        <div className="card-title mb-4">Change Password</div>
        <form onSubmit={savePassword}>
          <div className="form-group"><label className="form-label">Current Password</label><input type="password" required value={pw.currentPassword} onChange={e=>setPw({...pw,currentPassword:e.target.value})} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">New Password</label><input type="password" required minLength={6} value={pw.newPassword} onChange={e=>setPw({...pw,newPassword:e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Confirm</label><input type="password" required value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw && <span className="inline-spin"/>} Update Password</button>
        </form>
      </div>

      <div className="card card-body">
        <div className="card-title mb-3">Affiliate Program</div>
        <p className="text-muted text-sm mb-3">Share your referral link and earn commission on referred subscriptions.</p>
        <div className="flex gap-2">
          <input readOnly value={referralLink} style={{ fontFamily:'monospace', fontSize:12 }} />
          <button className="btn btn-secondary" onClick={copyLink}><FiCopy size={13}/></button>
        </div>
        <div className="flex justify-between mt-3" style={{ fontSize:13 }}>
          <span className="text-muted">Total Earnings</span>
          <span style={{ fontWeight:700 }}>${user?.affiliateEarnings?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    </div>
  );
}
