import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../../services/api';
import toast from 'react-hot-toast';
import PlatformChip from '../../components/publish/PlatformChip';
import { getCharLimit } from '../../utils/platforms';
import { FiImage, FiZap, FiCalendar, FiSend, FiX, FiUploadCloud } from 'react-icons/fi';

export default function Compose() {
  const navigate = useNavigate();
  const [accounts, setAccounts]   = useState([]);
  const [selected, setSelected]   = useState([]);
  const [content, setContent]     = useState('');
  const [files, setFiles]         = useState([]);
  const [link, setLink]           = useState('');
  const [scheduledAt, setSchedule] = useState('');
  const [saving, setSaving]       = useState(false);
  const [showAiPanel, setShowAi]  = useState(false);
  const [aiPrompt, setAiPrompt]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { api.get('/publish/social/accounts').then(r => setAccounts(r.data.accounts)).catch(()=>{}); }, []);

  const onDrop = useCallback(accepted => setFiles(f => [...f, ...accepted].slice(0,4)), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*':[], 'video/*':[] } });

  const toggleAccount = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

  const selectedPlatforms = [...new Set(accounts.filter(a=>selected.includes(a._id)).map(a=>a.platform))];
  const charLimit = getCharLimit(selectedPlatforms);
  const overLimit = content.length > charLimit;

  const generateAI = async () => {
    if (!aiPrompt.trim()) return toast.error('Enter a topic or prompt');
    setAiLoading(true);
    try {
      const { data } = await api.post('/publish/ai/generate-text', {
        customPrompt: aiPrompt, platform: selectedPlatforms[0] || 'general',
        includeHashtags: true, includeEmoji: true,
      });
      setContent(data.text);
      setShowAi(false);
      toast.success('Content generated!');
    } catch (e) { toast.error(e.response?.data?.message || 'Generation failed'); }
    finally { setAiLoading(false); }
  };

  const submit = async (status) => {
    if (!content.trim()) return toast.error('Post content is required');
    if (!selected.length) return toast.error('Select at least one account');
    if (status === 'scheduled' && !scheduledAt) return toast.error('Select a schedule date/time');

    setSaving(true);
    const fd = new FormData();
    fd.append('content', content);
    fd.append('accountIds', JSON.stringify(selected));
    fd.append('link', link);
    fd.append('status', status);
    if (status === 'scheduled') fd.append('scheduledAt', scheduledAt);
    files.forEach(f => fd.append('media', f));

    try {
      const { data } = await api.post('/publish/posts', fd, { headers: { 'Content-Type':'multipart/form-data' } });
      if (status === 'published') {
        await api.post(`/publish/posts/${data.post._id}/publish`);
        toast.success('Post published!');
      } else if (status === 'scheduled') {
        toast.success('Post scheduled!');
      } else {
        toast.success('Draft saved');
      }
      navigate('/posts');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save post'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Create Post</h1></div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20}}>
        {/* Main compose area */}
        <div>
          <div className="card card-body mb-4">
            <div className="form-label mb-2">Select Accounts</div>
            {accounts.length === 0 ? (
              <p className="text-muted text-sm">No social accounts connected. <a href="/social">Connect one →</a></p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {accounts.map(a => (
                  <button key={a._id} onClick={()=>toggleAccount(a._id)}
                    className={`btn btn-sm ${selected.includes(a._id)?'btn-indigo':'btn-secondary'}`}>
                    <PlatformChip platform={a.platform} size="xs"/> {a.accountName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card card-body mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="form-label" style={{marginBottom:0}}>Post Content</div>
              <button className="btn btn-sm btn-secondary" onClick={()=>setShowAi(s=>!s)}><FiZap size={12}/> AI Assist</button>
            </div>

            {showAiPanel && (
              <div style={{background:'var(--accent-light)',borderRadius:10,padding:14,marginBottom:14}}>
                <div className="flex gap-2">
                  <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="e.g. Promote our new summer sale with excitement" />
                  <button className="btn btn-primary" onClick={generateAI} disabled={aiLoading}>
                    {aiLoading ? <span className="inline-spin"/> : <FiZap size={13}/>}
                  </button>
                </div>
              </div>
            )}

            <textarea className="compose-area" value={content} onChange={e=>setContent(e.target.value)}
              placeholder="What do you want to share?" />
            <div className={`char-count ${overLimit?'warn':''}`}>{content.length} / {charLimit} characters</div>

            {/* Media dropzone */}
            <div {...getRootProps()} className={`dropzone mt-3 ${isDragActive?'active':''}`} style={{padding:'20px'}}>
              <input {...getInputProps()} />
              <FiUploadCloud size={24} style={{color:'var(--accent)',marginBottom:6}}/>
              <p className="text-sm" style={{fontWeight:600}}>Drop images/videos here, or click to browse</p>
            </div>
            {files.length>0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {files.map((f,i)=>(
                  <div key={i} style={{position:'relative'}}>
                    {f.type.startsWith('image') ? (
                      <img src={URL.createObjectURL(f)} alt="" style={{width:80,height:80,borderRadius:8,objectFit:'cover'}}/>
                    ) : (
                      <div style={{width:80,height:80,borderRadius:8,background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center'}}></div>
                    )}
                    <button className="btn-icon" style={{position:'absolute',top:-6,right:-6,width:22,height:22}} onClick={()=>setFiles(fs=>fs.filter((_,idx)=>idx!==i))}><FiX size={11}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="form-group mt-3">
              <label className="form-label">Link (optional)</label>
              <input value={link} onChange={e=>setLink(e.target.value)} placeholder="https://example.com" />
            </div>
          </div>
        </div>

        {/* Sidebar: schedule + actions */}
        <div>
          <div className="card card-body mb-4">
            <div className="form-label mb-2"><FiCalendar size={12} style={{display:'inline',marginRight:4}}/> Schedule</div>
            <input type="datetime-local" value={scheduledAt} onChange={e=>setSchedule(e.target.value)} />
            <p className="text-muted text-sm mt-2">Leave empty to save as draft or publish now</p>
          </div>

          <div className="card card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
            <button className="btn btn-primary btn-block" onClick={()=>submit('published')} disabled={saving || overLimit}>
              {saving ? <span className="inline-spin"/> : <FiSend size={13}/>} Publish Now
            </button>
            <button className="btn btn-indigo btn-block" onClick={()=>submit('scheduled')} disabled={saving || overLimit || !scheduledAt}>
              <FiCalendar size={13}/> Schedule Post
            </button>
            <button className="btn btn-secondary btn-block" onClick={()=>submit('draft')} disabled={saving}>
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
