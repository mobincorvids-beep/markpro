import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import PlatformChip from '../../components/publish/PlatformChip';
import { STATUS_COLORS } from '../../utils/platforms';
import { FiEdit2, FiTrash2, FiSend, FiPlus } from 'react-icons/fi';

export default function Posts() {
  const [posts, setPosts]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [filter, setFilter] = useState('');
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter, page]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filter) params.status = filter;
      const { data } = await api.get('/publish/posts', { params });
      setPosts(data.posts); setTotal(data.total);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  const publishNow = async id => {
    try { await api.post(`/publish/posts/${id}/publish`); toast.success('Post published!'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const deletePost = async id => {
    if (!window.confirm('Delete this post?')) return;
    await api.delete(`/publish/posts/${id}`);
    toast.success('Deleted'); load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Posts</h1>
        <Link to="/compose" className="btn btn-primary"><FiPlus size={14}/> New Post</Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[['','All'],['draft','Draft'],['scheduled','Scheduled'],['published','Published'],['failed','Failed']].map(([v,l])=>(
          <button key={v} onClick={()=>{setFilter(v);setPage(1);}} className={`btn btn-sm ${filter===v?'btn-indigo':'btn-secondary'}`}>{l}</button>
        ))}
      </div>

      {loading ? <div className="spinner"/> : posts.length===0 ? (
        <div className="empty-state"><div className="empty-icon"></div><p>No posts found</p></div>
      ) : (
        <>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {posts.map(p=>(
              <div key={p._id} className="post-card">
                <div className="flex justify-between items-start gap-3">
                  <div style={{flex:1,minWidth:0}}>
                    <div className="post-content">{p.content}</div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {p.platforms?.map(pl=><PlatformChip key={pl} platform={pl} size="xs"/>)}
                      <span className={`badge ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      {p.aiGenerated && <span className="badge badge-purple">AI</span>}
                      <span className="text-muted text-sm">
                        {p.status==='scheduled' && p.scheduledAt ? `Scheduled ${formatDistanceToNow(new Date(p.scheduledAt),{addSuffix:true})}`
                        : p.publishedAt ? formatDistanceToNow(new Date(p.publishedAt),{addSuffix:true})
                        : formatDistanceToNow(new Date(p.createdAt),{addSuffix:true})}
                      </span>
                    </div>
                    {p.mediaUrls?.length>0 && (
                      <div className="flex gap-2 mt-3">
                        {p.mediaUrls.slice(0,4).map((u,i)=><img key={i} src={u} alt="" style={{width:50,height:50,borderRadius:6,objectFit:'cover'}}/>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2" style={{flexShrink:0}}>
                    {p.status !== 'published' && (
                      <button className="btn-icon" onClick={()=>publishNow(p._id)} title="Publish now"><FiSend size={13}/></button>
                    )}
                    <button className="btn-icon" onClick={()=>deletePost(p._id)} title="Delete"><FiTrash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-4">
            <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Previous</button>
            <span className="text-muted text-sm">Page {page} of {Math.ceil(total/15)}</span>
            <button className="btn btn-secondary btn-sm" disabled={page*15>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
