import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stackpostsAPI } from '../../services/api';

export default function StackPostsDashboard() {
  const [teams, setTeams]       = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [stats, setStats]       = useState({});
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [showNewTeam, setShowNewTeam] = useState(false);

  useEffect(() => {
    stackpostsAPI.getTeams().then(r => {
      const t = r.data.teams || [];
      setTeams(t);
      if (t.length) setActiveTeam(t[0]._id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeTeam) return;
    setLoading(true);
    Promise.all([
      stackpostsAPI.getAnalytics(activeTeam),
      stackpostsAPI.getPosts(activeTeam, { limit: 8 }),
    ]).then(([s, p]) => { setStats(s.data.stats || {}); setPosts(p.data.posts || []); })
      .finally(() => setLoading(false));
  }, [activeTeam]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const r = await stackpostsAPI.createTeam({ name: newTeamName });
      setTeams(t => [...t, r.data.team]);
      setActiveTeam(r.data.team._id);
      setShowNewTeam(false);
      setNewTeamName('');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading && !teams.length) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h1>StackPosts</h1>
        <div className="topbar-actions">
          <select className="input" style={{ width: 180 }} value={activeTeam || ''} onChange={e => setActiveTeam(e.target.value)}>
            {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <button className="btn" onClick={() => setShowNewTeam(v => !v)}>+ New Team</button>
          {activeTeam && <Link to={`/stackposts/${activeTeam}/compose`}><button className="btn btn-primary">+ New Post</button></Link>}
        </div>
      </div>

      {showNewTeam && (
        <div className="card mb-2" style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Team name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handleCreateTeam}>Create</button>
        </div>
      )}

      {!activeTeam ? (
        <div className="empty-state"><div className="empty-icon"></div><p>Create your first team to get started.</p></div>
      ) : loading ? <div className="loader"><div className="spinner"/></div> : (
        <>
          <div className="grid-4 mb-2">
            {[['Connected Accounts', stats.connectedAccounts || 0, 'var(--brand)'],
              ['Scheduled', stats.scheduled || 0, '#f59e0b'],
              ['Published', stats.published || 0, '#10b981'],
              ['Failed', stats.failed || 0, '#ef4444']].map(([l,v,c]) => (
              <div key={l} className="card stat-card"><div className="label">{l}</div><div className="value" style={{ color:c }}>{v}</div></div>
            ))}
          </div>

          <div className="grid-3">
            {[
              ['Calendar', `/stackposts/${activeTeam}/calendar`, 'View scheduled posts'],
              ['AI Studio', `/stackposts/${activeTeam}/ai`, 'Generate content with AI'],
              ['RSS Feeds', `/stackposts/${activeTeam}/feeds`, 'Auto-post from RSS'],
              ['Accounts', `/stackposts/${activeTeam}/accounts`, 'Connect social accounts'],
              ['Team', `/stackposts/${activeTeam}/team`, 'Manage members'],
              ['Blog', '/stackposts/blog', 'Public blog CMS'],
              ['Affiliate', '/stackposts/affiliate', 'Referral earnings'],
              ['Support', '/stackposts/support', 'Get help'],
              ['Analytics', `/stackposts/${activeTeam}/analytics`, 'Performance stats'],
            ].map(([l, to, desc]) => (
              <Link key={to} to={to}><div className="card card-hover"><div style={{ fontWeight:500, marginBottom:4 }}>{l}</div><div className="text-muted text-sm">{desc}</div></div></Link>
            ))}
          </div>

          <div className="card mt-2">
            <div className="card-title mb-1">Recent Posts</div>
            {posts.length === 0 ? <p className="text-muted text-sm">No posts yet.</p> :
              <table className="table">
                <thead><tr><th>Content</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>{posts.map(p => (
                  <tr key={p._id}>
                    <td style={{ maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.content}</td>
                    <td><span className="badge badge-secondary">{p.method}</span></td>
                    <td><span className={`badge badge-${p.status===1?'success':p.status===2?'danger':'secondary'}`}>{['Scheduled','Published','Failed','Draft','Publishing'][p.status]}</span></td>
                    <td style={{ fontSize:11 }}>{new Date(p.timePost).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </div>
        </>
      )}
    </div>
  );
}
