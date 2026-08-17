import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { chatApi, templatesApi, cannedApi, aiPromptsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

let socket = null;

function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString();
}

export default function ChatPage() {
  const { chatId: urlChatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Lists
  const [chats,     setChats]     = useState([]);
  const [messages,  setMessages]  = useState([]);
  const [templates, setTemplates] = useState([]);
  const [cannedList,setCannedList]= useState([]);
  const [aiPrompts, setAiPrompts] = useState([]);

  // UI state
  const [activeChatId, setActiveChatId] = useState(urlChatId || null);
  const [activeChat,   setActiveChat]   = useState(null);
  const [text,         setText]         = useState('');
  const [sending,      setSending]      = useState(false);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [searchChats,  setSearchChats]  = useState('');
  const [showCanned,   setShowCanned]   = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showAiPanel,  setShowAiPanel]  = useState(false);
  const [aiSuggestion, setAiSuggestion]= useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [fileRef] = useState(() => ({ current: null }));

  const messagesEndRef = useRef(null);
  const textRef        = useRef(null);

  // ── Socket.IO setup ───────────────────────────────────────
  useEffect(() => {
    socket = io((process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, ''));

    socket.on('new_message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setChats(prev => prev.map(c =>
        c._id === msg.chatId ? { ...c, lastMessage: msg.message, lastMsgTime: msg.timeSent } : c
      ));
    });

    socket.on('message_status', ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m.messageId === messageId ? { ...m, status } : m));
    });

    socket.on('chat_updated', ({ chatId, lastMessage, unreadCount }) => {
      setChats(prev => prev.map(c => c._id === chatId ? { ...c, lastMessage, unreadCount } : c));
    });

    return () => { socket?.disconnect(); socket = null; };
  }, []);

  // ── Load chat list ────────────────────────────────────────
  useEffect(() => {
    chatApi.list({ limit: 50 }).then(r => {
      setChats(r.data.chats);
      if (urlChatId) openChat(urlChatId, r.data.chats);
    });
    templatesApi.list().then(r => setTemplates(r.data.filter(t => t.status === 'APPROVED')));
    cannedApi.list().then(r => setCannedList(r.data));
    aiPromptsApi.list().then(r => setAiPrompts(r.data));
  }, []); // eslint-disable-line

  // ── Scroll to bottom ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Open a chat ───────────────────────────────────────────
  const openChat = useCallback(async (chatId, chatList = chats) => {
    if (activeChatId) socket?.emit('leave_chat', activeChatId);

    setActiveChatId(chatId);
    const found = chatList.find(c => c._id === chatId);
    setActiveChat(found || null);
    setMessages([]);
    setLoadingMsgs(true);

    try {
      const { data } = await chatApi.messages(chatId);
      setMessages(data);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMsgs(false);
    }

    socket?.emit('join_chat', chatId);
    setChats(prev => prev.map(c => c._id === chatId ? { ...c, unreadCount: 0 } : c));
    navigate(`/chat/${chatId}`, { replace: true });
  }, [activeChatId, chats, navigate]);

  // ── Send text ─────────────────────────────────────────────
  const sendText = async () => {
    if (!text.trim() || !activeChatId || sending) return;
    setSending(true);
    const draft = text; setText('');
    try {
      await chatApi.send(activeChatId, { message: draft });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed');
      setText(draft);
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  // ── Send file ─────────────────────────────────────────────
  const sendFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    const fd = new FormData(); fd.append('file', file);
    const ext = file.name.split('.').pop().toLowerCase();
    fd.append('type', ['mp4','mov','avi'].includes(ext) ? 'video' : ['mp3','ogg','wav'].includes(ext) ? 'audio' : ['pdf','doc','docx','xls'].includes(ext) ? 'document' : 'image');
    try {
      await chatApi.sendMedia(activeChatId, fd);
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    e.target.value = '';
  };

  // ── Send template ─────────────────────────────────────────
  const sendTemplate = async (template) => {
    if (!activeChatId) return;
    try {
      await chatApi.sendTemplate(activeChatId, {
        templateName: template.templateName,
        language:     template.language,
        components:   [],
      });
      setShowTemplate(false);
      toast.success('Template sent');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ── AI reply ──────────────────────────────────────────────
  const getAiSuggestion = async () => {
    if (!activeChatId) return;
    setAiLoading(true); setAiSuggestion('');
    try {
      const { data } = await chatApi.aiReply(activeChatId, { promptId: selectedPromptId || undefined });
      setAiSuggestion(data.suggestion);
    } catch (err) { toast.error('AI failed: ' + (err.response?.data?.error || err.message)); }
    finally { setAiLoading(false); }
  };

  const useAiSuggestion = () => { setText(aiSuggestion); setShowAiPanel(false); textRef.current?.focus(); };

  // ── Toggle AI chat mode ───────────────────────────────────
  const toggleAi = async () => {
    if (!activeChatId) return;
    const { data } = await chatApi.toggleAi(activeChatId);
    setActiveChat(prev => ({ ...prev, isAiChat: data.isAiChat }));
    toast.success(data.isAiChat ? 'AI auto-reply ON' : 'AI auto-reply OFF');
  };

  // ── Stop bot ──────────────────────────────────────────────
  const stopBot = async () => {
    if (!activeChatId) return;
    await chatApi.stopBot(activeChatId);
    setActiveChat(prev => ({ ...prev, isBotStopped: true }));
    toast.success('Bot stopped for this chat');
  };

  // ── Filtered chats ────────────────────────────────────────
  const filteredChats = chats.filter(c =>
    !searchChats ||
    c.name?.toLowerCase().includes(searchChats.toLowerCase()) ||
    c.receiverId?.includes(searchChats)
  );

  // ── Message status icon ───────────────────────────────────
  const statusIcon = (status) => ({ sent: '', delivered: '', read: '', failed: '' }[status] || '');

  return (
    <div className="app-shell" style={{ height: '100vh' }}>
      {/* ── Chat list panel ── */}
      <div className="chat-list-panel" style={{ height: '100%' }}>
        <div className="chat-list-header">
          <input
            className="form-control"
            placeholder="Search chats…"
            value={searchChats}
            onChange={e => setSearchChats(e.target.value)}
            style={{ borderRadius: 20 }}
          />
        </div>
        <div className="chat-list-body">
          {filteredChats.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div style={{ fontSize: '2rem' }}></div>
              <p className="text-sm" style={{ marginTop: '0.5rem' }}>No chats yet</p>
            </div>
          )}
          {filteredChats.map(chat => (
            <div
              key={chat._id}
              className={`chat-item ${activeChatId === chat._id ? 'active' : ''}`}
              onClick={() => openChat(chat._id)}
            >
              {/* Avatar */}
              <div className="flex gap-2 items-center">
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--wa-dark)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flex: '0 0 38px',
                }}>
                  {chat.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex justify-between items-center">
                    <span className="chat-name">{chat.name || chat.receiverId}</span>
                    <span className="text-xs text-muted">{chat.lastMsgTime ? timeAgo(chat.lastMsgTime) : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="chat-preview">{chat.lastMessage}</span>
                    {chat.unreadCount > 0 && (
                      <span style={{
                        background: 'var(--wa-green)', color: '#000',
                        borderRadius: '50%', minWidth: 18, height: 18,
                        fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      }}>{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat main panel ── */}
      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {!activeChatId ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <div style={{ fontSize: '3rem' }}></div>
            <p style={{ marginTop: '1rem', color: 'var(--text2)' }}>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* ── Chat topbar ── */}
            <div className="chat-topbar">
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--wa-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                {activeChat?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeChat?.name || activeChat?.receiverId}</div>
                <div className="text-xs text-muted">{activeChat?.receiverId}</div>
              </div>
              {/* Actions */}
              <div className="flex gap-1">
                <button
                  className={`btn btn-xs ${activeChat?.isAiChat ? 'btn-green' : 'btn-outline'}`}
                  onClick={toggleAi} title="Toggle AI auto-reply"
                >AI {activeChat?.isAiChat ? 'ON' : 'OFF'}</button>
                {!activeChat?.isBotStopped && (
                  <button className="btn btn-xs btn-outline" onClick={stopBot} title="Stop bot for this chat">Stop Bot</button>
                )}
                <button className="btn btn-xs btn-outline" onClick={() => setShowTemplate(p => !p)} title="Send template">Template</button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="chat-messages">
              {loadingMsgs && <div className="loader"><div className="spinner"/></div>}
              {!loadingMsgs && messages.map((msg, i) => (
                <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                  <div className={`msg-bubble msg-${msg.direction}`}>
                    {msg.url && (
                      <div style={{ marginBottom: '0.35rem' }}>
                        {msg.messageType === 'image'
                          ? <img src={msg.url} alt="media" style={{ maxWidth: '100%', borderRadius: 6, maxHeight: 200 }} />
                          : <a href={msg.url} target="_blank" rel="noreferrer" className="text-sm">{msg.messageType}</a>
                        }
                      </div>
                    )}
                    {msg.message && <span>{msg.message}</span>}
                  </div>
                  <div className="msg-time">
                    {new Date(msg.timeSent || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.direction === 'out' && <span style={{ marginLeft: 4, color: msg.status === 'read' ? 'var(--wa-green)' : 'var(--text2)' }}>{statusIcon(msg.status)}</span>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Template picker overlay ── */}
            {showTemplate && (
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'var(--bg3)', maxHeight: 200, overflowY: 'auto' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm" style={{ fontWeight: 600 }}>Send Template</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowTemplate(false)}>×</button>
                </div>
                {templates.length === 0 && <p className="text-muted text-xs">No approved templates. Sync from Meta in Settings.</p>}
                {templates.map(t => (
                  <div key={t._id} style={{ padding: '0.4rem 0.6rem', background: 'var(--bg2)', borderRadius: 6, marginBottom: '0.3rem', cursor: 'pointer', fontSize: '0.82rem' }}
                    onClick={() => sendTemplate(t)}>
                    <strong>{t.templateName}</strong> <span className="text-muted">({t.language})</span>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{t.bodyData?.slice(0, 80)}…</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Canned replies dropdown ── */}
            {showCanned && (
              <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg3)', maxHeight: 180, overflowY: 'auto' }}>
                {cannedList.filter(c => !text || c.title.toLowerCase().includes(text.slice(1).toLowerCase())).map(c => (
                  <div key={c._id} style={{ padding: '0.35rem 0.6rem', cursor: 'pointer', borderRadius: 5, fontSize: '0.82rem' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setText(c.description); setShowCanned(false); textRef.current?.focus(); }}>
                    <strong>{c.title}</strong>
                    <div className="text-xs text-muted">{c.description.slice(0, 70)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── AI reply panel ── */}
            {showAiPanel && (
              <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', background: 'rgba(37,211,102,.05)' }}>
                <div className="flex gap-2 items-center mb-1">
                  <select className="form-control" style={{ flex: 1 }} value={selectedPromptId} onChange={e => setSelectedPromptId(e.target.value)}>
                    <option value="">Default prompt</option>
                    {aiPrompts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <button className="btn btn-green btn-sm" onClick={getAiSuggestion} disabled={aiLoading}>
                    {aiLoading ? '…' : 'Generate'}
                  </button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setShowAiPanel(false)}>×</button>
                </div>
                {aiSuggestion && (
                  <div style={{ background: 'var(--bg3)', padding: '0.6rem', borderRadius: 6, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {aiSuggestion}
                    <div className="flex gap-1 mt-1">
                      <button className="btn btn-green btn-xs" onClick={useAiSuggestion}>Use this reply</button>
                      <button className="btn btn-outline btn-xs" onClick={getAiSuggestion}>Regenerate</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Input bar ── */}
            <div className="chat-input-bar">
              {/* File attach */}
              <input type="file" style={{ display: 'none' }} ref={r => fileRef.current = r} onChange={sendFile}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" />
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} title="Attach file"></button>

              {/* Canned reply trigger */}
              <button
                className={`btn btn-sm ${showCanned ? 'btn-green' : 'btn-ghost'}`}
                onClick={() => { setShowCanned(p => !p); setShowAiPanel(false); }}
                title="Canned replies"
              ></button>

              {/* AI trigger */}
              <button
                className={`btn btn-sm ${showAiPanel ? 'btn-green' : 'btn-ghost'}`}
                onClick={() => { setShowAiPanel(p => !p); setShowCanned(false); }}
                title="AI reply"
              ></button>

              <textarea
                ref={textRef}
                rows={1}
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  setShowCanned(e.target.value.startsWith('/'));
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (/ for canned)"
                style={{ flex: 1 }}
              />

              <button
                className="btn btn-green btn-sm"
                onClick={sendText}
                disabled={sending || !text.trim()}
                style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, justifyContent: 'center' }}
              >

              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
