// MailerNewCampaign.js - 4-step campaign creation wizard
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mailerAPI } from '../../services/api';

const STEPS = ['Type & Name', 'Audience', 'Content', 'Review & Send'];

export default function MailerNewCampaign() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(0);
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    name: '', type: 'email', emailProvider: 'smtp', smsProvider: 'twilio',
    subject: '', fromName: '', fromEmail: '', htmlBody: '', textBody: '',
    smsBody: '', groups: [], allContacts: false, scheduledAt: '',
    trackOpens: true, trackClicks: true, unsubscribeLink: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([mailerAPI.getGroups(), mailerAPI.getTemplates()])
      .then(([g, t]) => { setGroups(g.data.groups || []); setTemplates(t.data.templates || []); });
  }, []);

  const F = ({ label, name, type = 'text', ...rest }) => (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <input className={`input${errors[name] ? ' input-error' : ''}`} type={type}
        value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))} {...rest} />
      {errors[name] && <div className="input-error-msg">{errors[name]}</div>}
    </div>
  );

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Campaign name is required';
    if (step === 2 && form.type === 'email' && !form.subject) e.subject = 'Subject is required';
    if (step === 2 && form.type === 'email' && !form.htmlBody && !form.textBody) e.htmlBody = 'Message body is required';
    if (step === 2 && form.type === 'sms' && !form.smsBody) e.smsBody = 'SMS body is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 3)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSave = async (sendNow = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const r = await mailerAPI.createCampaign({ ...form, scheduledAt: form.scheduledAt || null });
      if (sendNow) {
        await mailerAPI.sendCampaign(r.data.campaign._id);
        alert('Campaign sending started!');
      }
      navigate('/mailer/campaigns');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  return (
    <div className="page">
      <div className="topbar"><h1>New Campaign</h1></div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
              background: i <= step ? 'var(--primary)' : 'var(--border)', color: i <= step ? '#fff' : 'var(--text-muted)', zIndex: 1 }}>
              {i < step ? '' : i + 1}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 500 : 400 }}>{s}</div>
            {i < STEPS.length - 1 && <div style={{ position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, background: i < step ? 'var(--primary)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Step 0: Type & Name */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Campaign Type & Name</h3>
            <F label="Campaign Name *" name="name" placeholder="e.g. May Newsletter" />
            <div style={{ marginBottom: 12 }}>
              <label className="label">Campaign Type</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['email','Email'],['sms','SMS']].map(([v,l]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `2px solid ${form.type===v?'var(--primary)':'var(--border)'}`, borderRadius: 8, flex: 1 }}>
                    <input type="radio" value={v} checked={form.type===v} onChange={() => setForm(f => ({...f, type:v}))} style={{ margin: 0 }}/>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{l}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.type === 'email' && (
              <div style={{ marginBottom: 12 }}>
                <label className="label">Email Provider</label>
                <select className="input" value={form.emailProvider} onChange={e => setForm(f => ({...f, emailProvider:e.target.value}))}>
                  {[['smtp','SMTP'],['sendgrid','SendGrid'],['mailgun','Mailgun']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            {form.type === 'sms' && (
              <div style={{ marginBottom: 12 }}>
                <label className="label">SMS Provider</label>
                <select className="input" value={form.smsProvider} onChange={e => setForm(f => ({...f, smsProvider:e.target.value}))}>
                  {[['twilio','Twilio'],['vonage','Vonage']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Audience */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Select Audience</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.allContacts} onChange={e => setForm(f => ({...f, allContacts: e.target.checked}))} />
              <span style={{ fontWeight: 500 }}>Send to all active contacts</span>
            </label>
            {!form.allContacts && (
              <div>
                <label className="label">Select Groups</label>
                <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  {groups.length === 0 ? <p className="text-muted text-sm">No groups yet. <a href="/mailer/groups">Create groups</a> first.</p> :
                    groups.map(g => (
                      <label key={g._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.groups.includes(g._id)}
                          onChange={e => setForm(f => ({...f, groups: e.target.checked ? [...f.groups, g._id] : f.groups.filter(x=>x!==g._id)}))} />
                        <span>{g.name}</span>
                        <span className="badge badge-secondary ml-auto">{g.contactCount}</span>
                      </label>
                    ))
                  }
                </div>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <label className="label">Schedule (optional)</label>
              <input type="datetime-local" className="input" value={form.scheduledAt}
                onChange={e => setForm(f => ({...f, scheduledAt: e.target.value}))} />
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>Leave blank to save as draft and send manually.</p>
            </div>
          </div>
        )}

        {/* Step 2: Content */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Campaign Content</h3>
            {form.type === 'email' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <F label="From Name" name="fromName" placeholder="Your Name" />
                  <F label="From Email" name="fromEmail" type="email" placeholder="you@domain.com" />
                </div>
                <F label="Subject Line *" name="subject" placeholder="Your email subject" />
                <div style={{ marginBottom: 12 }}>
                  <label className="label">HTML Body *</label>
                  <textarea className="input" rows={8} value={form.htmlBody} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                    placeholder={'<h1>Hello {{firstName}}</h1>\n<p>Your message here…</p>'}
                    onChange={e => setForm(f => ({...f, htmlBody: e.target.value}))} />
                  {errors.htmlBody && <div className="input-error-msg">{errors.htmlBody}</div>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="label">Plain Text (fallback)</label>
                  <textarea className="input" rows={3} value={form.textBody}
                    placeholder={'Hello {{firstName}},\n\nYour message…'}
                    onChange={e => setForm(f => ({...f, textBody: e.target.value}))} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  {[['trackOpens','Track Opens'],['trackClicks','Track Clicks'],['unsubscribeLink','Unsubscribe Link']].map(([k,l]) => (
                    <label key={k} style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13 }}>
                      <input type="checkbox" checked={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.checked}))} />
                      {l}
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <label className="label">SMS Message * <span className="text-muted text-sm">(use {'{{firstName}}'}, {'{{email}}'}, {'{{phone}}'} for personalization)</span></label>
                <textarea className="input" rows={5} value={form.smsBody}
                  placeholder={'Hello {{firstName}},\n\nYour message here…\n\nReply STOP to unsubscribe.'}
                  onChange={e => setForm(f => ({...f, smsBody: e.target.value}))} />
                {errors.smsBody && <div className="input-error-msg">{errors.smsBody}</div>}
                <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                  {form.smsBody.length} characters
                  {form.smsBody.length > 160 && ` - will be split into ${Math.ceil(form.smsBody.length/153)} SMS segments`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Review & Send</h3>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              {[
                ['Campaign Name', form.name],
                ['Type', form.type.toUpperCase()],
                ['Audience', form.allContacts ? 'All contacts' : `${form.groups.length} group(s)`],
                form.type === 'email' ? ['Subject', form.subject] : ['Message Length', `${form.smsBody.length} chars`],
                ['Schedule', form.scheduledAt ? new Date(form.scheduledAt).toLocaleString() : 'Send immediately'],
              ].filter(Boolean).map(([l,v]) => (
                <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)' }}>
                  <span className="text-muted text-sm">{l}</span>
                  <span style={{ fontWeight:500,fontSize:13 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Processing…' : 'Save & Send Now'}
              </button>
              <button className="btn" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div style={{ display:'flex',justifyContent:'space-between',marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)' }}>
          <button className="btn" onClick={prev} disabled={step === 0}>← Previous</button>
          {step < 3 && <button className="btn btn-primary" onClick={next}>Next →</button>}
        </div>
      </div>
    </div>
  );
}
