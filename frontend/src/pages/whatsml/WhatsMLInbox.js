import { useState, useEffect, useRef } from 'react';
import { whatsmlAPI } from '../../services/api';

export function WhatsMLInbox() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => { whatsmlAPI.getConversations({ limit:30 }).then(r => setConversations(r.data.conversations||[])).finally(()=>setLoading(false)); }, []);
  useEffect(() => { if (active) whatsmlAPI.getMessages(active._id).then(r => setMessages(r.data.messages||[])); }, [active]);

  const send = async () => {
    if (!text.trim() || !active) return;
    try { await whatsmlAPI.sendMessage(active._id, { body:text }); setMessages(m=>[...m,{direction:'outbound',body:text,createdAt:new Date()}]); setText(''); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const suggest = async () => {
    if (!active) return;
    setSuggesting(true);
    try { const r = await whatsmlAPI.suggestReply(active._id); setText(r.data.suggestion); } catch {} 
    setSuggesting(false);
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Unified Inbox</h1></div>
      <div style={{ display:'flex', height:'calc(100vh - 160px)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
        <div style={{ width:260, borderRight:'1px solid var(--border)', overflow:'auto' }}>
          {conversations.length===0 ? <p className="text-muted text-sm" style={{ padding:16 }}>No conversations yet.</p> :
            conversations.map(c => (
              <div key={c._id} onClick={()=>setActive(c)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: active?._id===c._id?'var(--bg)':'transparent' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:500, fontSize:13 }}>{c.customer?.name || c.customer?.phone}</span>
                  <span className={`badge badge-${c.channel==='cloud_api'?'success':'secondary'}`} style={{ fontSize:9 }}>{c.channel==='cloud_api'?'Cloud':'Web'}</span>
                </div>
                <div className="text-muted text-sm" style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{c.lastMessage}</div>
              </div>
            ))
          }
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
          {!active ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><p className="text-muted">Select a conversation</p></div> : (
            <>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:500 }}>{active.customer?.name || active.customer?.phone}</div>
              <div style={{ flex:1, overflow:'auto', padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                {messages.map((m,i)=>(
                  <div key={i} style={{ alignSelf: m.direction==='inbound'?'flex-start':'flex-end', maxWidth:'70%' }}>
                    <div style={{ padding:'8px 12px', borderRadius:12, fontSize:13, background: m.direction==='inbound'?'var(--bg)':'#25D366', color: m.direction==='inbound'?'inherit':'#fff' }}>{m.body}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, padding:14, borderTop:'1px solid var(--border)' }}>
                <button className="btn btn-sm" onClick={suggest} disabled={suggesting}>{suggesting?'…':'AI'}</button>
                <input className="input" style={{ flex:1 }} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type a message…"/>
                <button className="btn btn-primary" onClick={send}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsMLScanner() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [numbers, setNumbers] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { whatsmlAPI.getScanJobs().then(r => setJobs(r.data.jobs||[])).finally(()=>setLoading(false)); }, []);

  const handleScan = async () => {
    const list = numbers.split('\n').map(n=>n.trim()).filter(Boolean);
    if (!list.length) return;
    try { const r = await whatsmlAPI.createScanJob({ name:`Scan ${new Date().toLocaleString()}`, numbers:list }); setJobs(j=>[r.data.job,...j]); setNumbers(''); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Number Checker</h1></div>
      <div className="card mb-2">
        <label className="label">Paste phone numbers (one per line)</label>
        <textarea className="input" rows={6} value={numbers} onChange={e=>setNumbers(e.target.value)} placeholder={'+15551234567\n+15559876543'} style={{ marginBottom:10 }}/>
        <button className="btn btn-primary" onClick={handleScan}>Check Numbers</button>
      </div>
      {jobs.length===0 ? <div className="empty-state"><p>No scan jobs yet.</p></div> :
        <table className="table"><thead><tr><th>Name</th><th>Total</th><th>Valid</th><th>Invalid</th><th>Status</th></tr></thead>
          <tbody>{jobs.map(j=>(
            <tr key={j._id}><td>{j.name}</td><td>{j.numbersTotal}</td><td style={{color:'#10b981'}}>{j.numbersValid}</td><td style={{color:'#ef4444'}}>{j.numbersInvalid}</td>
              <td><span className={`badge badge-${j.status==='completed'?'success':'warning'}`}>{j.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      }
    </div>
  );
}

export default WhatsMLInbox;
