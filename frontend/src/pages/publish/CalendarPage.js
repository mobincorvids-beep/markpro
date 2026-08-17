import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import PlatformChip from '../../components/publish/PlatformChip';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { load(); }, [current]);
  const load = async () => {
    const { data } = await api.get('/publish/posts/calendar', { params: { month: current.getMonth(), year: current.getFullYear() } });
    setPosts(data.posts);
  };

  const year = current.getFullYear(), month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDay-1; i >= 0; i--) cells.push({ day: daysInPrevMonth-i, otherMonth:true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, otherMonth:false, date: new Date(year,month,d) });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDay - daysInMonth + 1, otherMonth:true });

  const postsForDay = (date) => {
    if (!date) return [];
    return posts.filter(p => {
      const pd = new Date(p.scheduledAt || p.publishedAt || p.createdAt);
      return pd.getDate()===date.getDate() && pd.getMonth()===date.getMonth() && pd.getFullYear()===date.getFullYear();
    });
  };

  const today = new Date();
  const isToday = (date) => date && date.toDateString() === today.toDateString();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Content Calendar</h1>
        <button className="btn btn-primary" onClick={()=>navigate('/compose')}><FiPlus size={14}/> New Post</button>
      </div>

      <div className="card card-body mb-4" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button className="btn-icon" onClick={()=>setCurrent(new Date(year,month-1,1))}><FiChevronLeft/></button>
        <h2 style={{fontWeight:800,fontSize:17}}>{MONTHS[month]} {year}</h2>
        <button className="btn-icon" onClick={()=>setCurrent(new Date(year,month+1,1))}><FiChevronRight/></button>
      </div>

      <div className="calendar-grid mb-2">
        {DAYS.map(d=><div key={d} className="calendar-header">{d}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((c,i)=>{
          const dayPosts = c.date ? postsForDay(c.date) : [];
          return (
            <div key={i} className={`calendar-day ${c.otherMonth?'other-month':''} ${isToday(c.date)?'today':''}`}
              onClick={()=> c.date && setSelectedDay(c.date)}>
              <div className="calendar-day-number">{c.day}</div>
              {dayPosts.slice(0,3).map(p=>(
                <div key={p._id} className="calendar-post-dot" style={{background:'var(--accent-light)',color:'var(--accent2)'}}>
                  {p.content?.slice(0,18) || 'Post'}
                </div>
              ))}
              {dayPosts.length>3 && <div className="text-sm text-muted">+{dayPosts.length-3} more</div>}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget && setSelectedDay(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <div style={{background:'var(--surface)',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'80vh',overflowY:'auto',padding:24}}>
            <h3 style={{fontWeight:700,marginBottom:16}}>{selectedDay.toDateString()}</h3>
            {postsForDay(selectedDay).length===0 ? (
              <p className="text-muted">No posts scheduled for this day</p>
            ) : postsForDay(selectedDay).map(p=>(
              <div key={p._id} className="post-card mb-3">
                <div className="post-content">{p.content}</div>
                <div className="flex gap-2 mt-2 flex-wrap">{p.platforms?.map(pl=><PlatformChip key={pl} platform={pl} size="xs"/>)}</div>
              </div>
            ))}
            <button className="btn btn-secondary btn-block mt-3" onClick={()=>setSelectedDay(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
