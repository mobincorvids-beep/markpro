import { useState, useEffect } from 'react';
import { chatflowAPI } from '../../services/api';

export function ChatFlowInbox() {
  const [subscribers, setSubscribers] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { chatflowAPI.getSubscribers({ limit:50 }).then(r => setSubscribers(r.data.subscribers || [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (active) chatflowAPI.getConversation(active._id).then(r => setMessages(r.data.messages || [])); }, [active]);

  const send = async () => {
    if (!text.trim() || !active) return;
    try {
      await chatflowAPI.sendMessage(active._id, { text });
      setMessages(m => [...m, { direction:'outbound', text, createdAt:new Date() }]);
      setText('');
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>Inbox</h1></div>
      <div style={{ display:'flex', gap:0, height:'calc(100vh - 160px)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
        <div style={{ width:260, borderRight:'1px solid var(--border)', overflow:'auto' }}>
          {subscribers.length === 0 ? <p className="text-muted text-sm" style={{ padding:16 }}>No subscribers yet.</p> :
            subscribers.map(s => (
              <div key={s._id} onClick={() => setActive(s)}
                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: active?._id===s._id ? 'var(--bg)' : 'transparent' }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{s.name}</div>
                <div className="text-muted text-sm">{new Date(s.lastInteractionAt).toLocaleDateString()}</div>
              </div>
            ))
          }
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
          {!active ? <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><p className="text-muted">Select a conversation</p></div> : (
            <>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontWeight:500 }}>{active.name}</div>
              <div style={{ flex:1, overflow:'auto', padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                {messages.map((m,i) => (
                  <div key={i} style={{ alignSelf: m.direction==='inbound' ? 'flex-start' : 'flex-end', maxWidth:'70%' }}>
                    <div style={{ padding:'8px 12px', borderRadius:12, fontSize:13, background: m.direction==='inbound' ? 'var(--bg)' : 'var(--primary)', color: m.direction==='inbound' ? 'inherit' : '#fff' }}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, padding:14, borderTop:'1px solid var(--border)' }}>
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

export function ChatFlowRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', triggerType:'keyword', keywords:'', replyMessages:'' });

  useEffect(() => { chatflowAPI.getRules().then(r => setRules(r.data.rules || [])).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    try {
      const r = await chatflowAPI.createRule({
        name: form.name, triggerType: form.triggerType,
        keywords: form.keywords.split(',').map(k=>k.trim()).filter(Boolean),
        replyMessages: form.replyMessages.split('\n').filter(Boolean),
      });
      setRules(x => [...x, r.data.rule]);
      setShowAdd(false);
    } catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await chatflowAPI.deleteRule(id); setRules(r=>r.filter(x=>x._id!==id)); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Automation Rules</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ New Rule</button></div></div>
      {showAdd && (
        <div className="card mb-2">
          <div style={{ marginBottom:10 }}><label className="label">Rule Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div style={{ marginBottom:10 }}><label className="label">Trigger Type</label>
            <select className="input" value={form.triggerType} onChange={e=>setForm(f=>({...f,triggerType:e.target.value}))}>
              <option value="keyword">Keyword Match</option><option value="welcome">Welcome Message</option><option value="default_reply">Default Reply</option>
            </select>
          </div>
          {form.triggerType==='keyword' && <div style={{ marginBottom:10 }}><label className="label">Keywords (comma separated)</label><input className="input" value={form.keywords} onChange={e=>setForm(f=>({...f,keywords:e.target.value}))} placeholder="hello, hi, hey"/></div>}
          <div style={{ marginBottom:10 }}><label className="label">Reply Message(s) - one per line</label><textarea className="input" rows={3} value={form.replyMessages} onChange={e=>setForm(f=>({...f,replyMessages:e.target.value}))}/></div>
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleSave}>Save</button><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {rules.length === 0 ? <div className="empty-state"><p>No rules yet.</p></div> :
        <table className="table"><thead><tr><th>Name</th><th>Trigger</th><th>Triggered</th><th></th></tr></thead>
          <tbody>{rules.map(r => (<tr key={r._id}><td>{r.name}</td><td><span className="badge badge-secondary">{r.triggerType}</span></td><td>{r.triggerCount||0}×</td><td><button className="btn btn-sm btn-danger" onClick={()=>handleDelete(r._id)}>Delete</button></td></tr>))}</tbody>
        </table>
      }
    </div>
  );
}

export function ChatFlowProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', price:'', stock:'' });

  useEffect(() => { chatflowAPI.getProducts().then(r => setProducts(r.data.products || [])).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    try { const r = await chatflowAPI.createProduct({ ...form, price:+form.price, stock:+form.stock||0 }); setProducts(p=>[...p,r.data.product]); setShowAdd(false); }
    catch (e) { alert(e?.response?.data?.message || 'Error'); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Delete?')) return; await chatflowAPI.deleteProduct(id); setProducts(p=>p.filter(x=>x._id!==id)); };

  if (loading) return <div className="loader"><div className="spinner"/></div>;
  return (
    <div className="page">
      <div className="topbar"><h1>Products</h1><div className="topbar-actions"><button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Product</button></div></div>
      {showAdd && (
        <div className="card mb-2">
          <div className="grid-2 gap-2 mb-1">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><label className="label">Price ($)</label><input className="input" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/></div>
            <div><label className="label">Stock</label><input className="input" type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/></div>
          </div>
          <div style={{ display:'flex', gap:8 }}><button className="btn btn-primary" onClick={handleSave}>Save</button><button className="btn" onClick={()=>setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {products.length === 0 ? <div className="empty-state"><p>No products yet.</p></div> :
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
          {products.map(p => (
            <div key={p._id} className="card">
              <div style={{ fontWeight:500 }}>{p.name}</div>
              <div style={{ fontSize:18, color:'var(--primary)', margin:'6px 0' }}>${p.price}</div>
              <div className="text-muted text-sm mb-2">Stock: {p.stock}</div>
              <button className="btn btn-sm btn-danger" onClick={()=>handleDelete(p._id)}>Delete</button>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

export default ChatFlowInbox;
