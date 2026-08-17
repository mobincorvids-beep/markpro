import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { penAPI } from '../../services/api';
import { Plus, X, MessageSquare, Send } from 'lucide-react';

export default function PenChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  const loadSessions = () => penAPI.getChatSessions().then(r => setSessions(r.data.data || [])).catch(() => {});
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openSession = async (id) => {
    const r = await penAPI.getChatSession(id);
    setActiveId(id);
    setMessages(r.data.data.messages || []);
  };

  const newChat = () => { setActiveId(null); setMessages([]); };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(p => [...p, userMsg]);
    setInput(''); setSending(true);

    try {
      const { data } = await penAPI.chat({ session_id: activeId, message: input });
      if (data.status === '1') {
        setMessages(p => [...p, { role: 'assistant', content: data.data.reply }]);
        if (!activeId) { setActiveId(data.data.session_id); loadSessions(); }
      } else {
        toast.error(data.message);
        setMessages(p => p.slice(0, -1));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send.');
      setMessages(p => p.slice(0, -1));
    } finally { setSending(false); }
  };

  const deleteSession = async (id) => {
    await penAPI.deleteChatSession(id);
    if (activeId === id) newChat();
    loadSessions();
  };

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Sessions sidebar */}
      <div className="card" style={{ width: 240, flexShrink: 0, padding: 14, display: 'flex', flexDirection: 'column' }}>
        <button className="btn btn-ai w-full mb-3" onClick={newChat}><Plus size={14} /> New Chat</button>
        <div style={{ flex: 1, overflowY: 'auto' }} className="flex-col gap-1">
          {sessions.map(s => (
            <div key={s._id} onClick={() => openSession(s._id)} className="flex items-center justify-between gap-2"
              style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: activeId === s._id ? 'var(--brand-light)' : 'transparent' }}>
              <span className="text-sm truncate" style={{ flex: 1, color: 'var(--text)' }}>{s.title}</span>
              <button onClick={e => { e.stopPropagation(); deleteSession(s._id); }} className="btn btn-ghost btn-icon" style={{ padding: 2, flexShrink: 0 }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="card flex-col" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon" style={{ background: 'rgba(249,115,22,.1)' }}><MessageSquare size={28} color="var(--ai)" /></div>
              <div className="empty-title">Start a conversation</div>
              <div className="empty-sub">Ask me anything - I'm here to help you write, brainstorm, or answer questions.</div>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className="flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'var(--ai)' : 'var(--bg-hover)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex" style={{ justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--bg-hover)', fontSize: 13, color: 'var(--text-3)' }}>typing…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-3" style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <input className="form-input" style={{ borderRadius: 24 }} placeholder="Type your message…" value={input} onChange={e => setInput(e.target.value)} />
          <button type="submit" className="btn btn-ai" disabled={sending || !input.trim()}><Send size={14} /></button>
        </form>
      </div>
    </div>
  );
}
