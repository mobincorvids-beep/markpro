import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { socialvibeAPI } from '../../services/api';

export default function SVDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([socialvibeAPI.getAccounts(), socialvibeAPI.getPosts({ limit: 10 })])
      .then(([a, p]) => { setAccounts(a.data.accounts || []); setPosts(p.data.posts || []); })
      .finally(() => setLoading(false));
  }, []);

  const NETWORK_ICON = { facebook:'', instagram:'', twitter:'', linkedin:'' };
  const STATUS_COLOR = { draft:'secondary', scheduled:'info', published:'success', failed:'danger', publishing:'warning' };

  const stats = {
    accounts: accounts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed: posts.filter(p => p.status === 'failed').length,
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>SocialVibe</h1>
        <div className="topbar-actions">
          <Link to="/socialvibe/compose"><button className="btn btn-primary">+ New Post</button></Link>
          <Link to="/socialvibe/calendar"><button className="btn">Calendar</button></Link>
        </div>
      </div>

      <div className="grid-4 mb-2">
        {[['Connected Accounts',stats.accounts,'var(--brand)'],['Scheduled',stats.scheduled,'#f59e0b'],['Published',stats.published,'#10b981'],['Failed',stats.failed,'#ef4444']].map(([l,v,c])=>(
          <div key={l} className="card stat-card"><div className="label">{l}</div><div className="value" style={{color:c}}>{v}</div></div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-1">Connected Accounts</div>
          {accounts.length===0
            ?<div className="empty-state-sm"><p className="text-muted text-sm">No accounts connected.</p><Link to="/socialvibe/accounts"><button className="btn btn-sm btn-primary">Connect Account</button></Link></div>
            :<div style={{display:'flex',flexDirection:'column',gap:8}}>
              {accounts.map(a=>(
                <div key={a._id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:20}}>{NETWORK_ICON[a.platform]||''}</span>
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{a.accountName}</div>
                    <div className="text-muted text-sm">{a.platform} · {a.followers?.toLocaleString()||0} followers</div>
                  </div>
                  <span className={`badge badge-${a.isActive?'success':'danger'} ml-auto`}>{a.isActive?'Active':'Disconnected'}</span>
                </div>
              ))}
            </div>
          }
        </div>

        <div className="card">
          <div className="card-title mb-1">Recent Posts</div>
          {posts.length===0
            ?<div className="empty-state-sm"><p className="text-muted text-sm">No posts yet.</p><Link to="/socialvibe/compose"><button className="btn btn-sm btn-primary">Create Post</button></Link></div>
            :<div style={{display:'flex',flexDirection:'column',gap:6}}>
              {posts.slice(0,6).map(p=>(
                <div key={p._id} style={{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div style={{fontSize:12,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.content}</div>
                    <span className={`badge badge-${STATUS_COLOR[p.status]||'secondary'} flex-shrink-0`}>{p.status}</span>
                  </div>
                  {p.scheduledAt&&<div className="text-muted text-sm">{new Date(p.scheduledAt).toLocaleString()}</div>}
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      <div className="grid-3 mt-2">
        {[['Compose Post','/socialvibe/compose','Write a new post'],['AI Writer','/socialvibe/ai','Generate with AI'],['Templates','/socialvibe/templates','Save reusable posts'],['Team','/socialvibe/team','Manage access'],['Accounts','/socialvibe/accounts','Connect networks'],['Support','/socialvibe/tickets','Get help']].map(([l,to,desc])=>(
          <Link key={to} to={to}><div className="card card-hover"><div style={{fontWeight:500,marginBottom:4}}>{l}</div><div className="text-muted text-sm">{desc}</div></div></Link>
        ))}
      </div>
    </div>
  );
}
