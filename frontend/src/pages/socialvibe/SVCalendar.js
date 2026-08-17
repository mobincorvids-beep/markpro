import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { socialvibeAPI } from '../../services/api';

const STATUS_COLOR = { draft:'#9ca3af', scheduled:'#3b82f6', published:'#10b981', failed:'#ef4444', publishing:'#f59e0b' };

export default function SVCalendar() {
  const [posts, setPosts] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const to   = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();
    socialvibeAPI.getPosts({ from, to, limit: 200 })
      .then(r => setPosts(r.data.posts || []))
      .finally(() => setLoading(false));
  }, [month]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const postsForDay = (day) => posts.filter(p => {
    const d = new Date(p.scheduledAt || p.createdAt);
    return d.getDate() === day && d.getMonth() === month.getMonth();
  });

  const isToday = (day) => {
    const t = new Date();
    return day === t.getDate() && month.getMonth() === t.getMonth() && month.getFullYear() === t.getFullYear();
  };

  return (
    <div className="page">
      <div className="topbar">
        <h1>Content Calendar</h1>
        <div className="topbar-actions">
          <Link to="/socialvibe/compose"><button className="btn btn-primary">+ New Post</button></Link>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-sm" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>← Prev</button>
        <h3 style={{ minWidth: 160, textAlign: 'center' }}>{month.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
        <button className="btn btn-sm" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>Next →</button>
        <button className="btn btn-sm" onClick={() => setMonth(new Date())}>Today</button>
      </div>

      {loading ? <div className="loader"><div className="spinner"/></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
          {days.map((day, i) => (
            <div key={i} style={{
              minHeight: 90, border: '1px solid var(--border)', borderRadius: 6, padding: 6,
              background: day && isToday(day) ? 'var(--bg-accent, var(--brand-light))' : 'var(--surface)',
              opacity: day ? 1 : 0.3, cursor: day ? 'pointer' : 'default',
            }} onClick={() => day && navigate(`/socialvibe/compose?date=${month.getFullYear()}-${month.getMonth()+1}-${day}`)}>
              {day && <>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>{day}</div>
                {postsForDay(day).slice(0, 3).map(p => (
                  <div key={p._id} style={{
                    fontSize: 9, padding: '2px 4px', marginBottom: 2, borderRadius: 3, color: '#fff',
                    background: STATUS_COLOR[p.status], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={p.content}>
                    {p.content?.slice(0, 25)}
                  </div>
                ))}
                {postsForDay(day).length > 3 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{postsForDay(day).length - 3} more</div>}
              </>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11 }}>
        {Object.entries(STATUS_COLOR).map(([s,c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
