import { useState, useEffect, useRef } from 'react';
import { telemanAPI } from '../../services/api';

// Twilio Voice SDK loaded via CDN: <script src="https://sdk.twilio.com/js/voice/releases/2.11.1/twilio.min.js"></script>
const getTwilioDevice = () => window.Twilio?.Device;

export default function TelemanDialer() {
  const [device, setDevice]     = useState(null);
  const [connection, setConnection] = useState(null);
  const [status, setStatus]     = useState('idle'); // idle, ready, connecting, in-call
  const [number, setNumber]     = useState('');
  const [duration, setDuration] = useState(0);
  const [contacts, setContacts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [muted, setMuted]       = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    telemanAPI.getContacts({ limit: 50 }).then(r => setContacts(r.data.contacts || []));
    telemanAPI.getProviders().then(r => setProviders(r.data.providers || []));
  }, []);

  const initDevice = async () => {
    const TwilioDevice = getTwilioDevice();
    if (!TwilioDevice) return alert('Twilio Voice SDK not loaded. Add the script tag to index.html.');
    try {
      const { data } = await telemanAPI.getVoiceToken();
      const dev = new TwilioDevice(data.token, { codecPreferences: ['opus','pcmu'] });
      dev.on('ready',    () => setStatus('ready'));
      dev.on('error',    (e) => { console.error(e); alert(`Twilio error: ${e.message}`); });
      dev.on('incoming', (conn) => { setConnection(conn); setStatus('connecting'); });
      dev.on('disconnect', () => { setStatus('ready'); setConnection(null); clearInterval(timerRef.current); setDuration(0); });
      setDevice(dev);
      setStatus('ready');
    } catch (e) { alert(e?.response?.data?.message || 'Failed to initialize dialer'); }
  };

  const call = () => {
    if (!device || !number) return;
    setStatus('connecting');
    const conn = device.connect({ params: { To: number } });
    conn.on('accept', () => {
      setStatus('in-call');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    });
    conn.on('disconnect', () => {
      setStatus('ready'); setConnection(null); clearInterval(timerRef.current); setDuration(0);
    });
    setConnection(conn);
  };

  const hangup = () => { connection?.disconnect(); device?.disconnectAll(); };
  const toggleMute = () => { connection?.mute(!muted); setMuted(m => !m); };

  const formatDuration = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="page">
      <div className="topbar"><h1>Browser Dialer</h1></div>

      {providers.length === 0 && (
        <div className="card mb-2" style={{ background:'#fef3c7', borderColor:'#f59e0b' }}>
          <p style={{ fontSize:13 }}>No Twilio provider configured. <a href="/teleman/providers">Add your Twilio credentials</a> first.</p>
        </div>
      )}

      <div className="grid-2">
        {/* Dialer */}
        <div className="card" style={{ textAlign:'center', padding:32 }}>
          <div style={{ fontSize:32, fontWeight:300, marginBottom:8 }}>
            {status === 'in-call' ? formatDuration(duration) : status === 'connecting' ? 'Connecting…' : 'Ready'}
          </div>
          <div style={{ marginBottom:20 }}>
            <span className={`badge badge-${status==='in-call'?'success':status==='ready'?'secondary':'warning'}`}>{status}</span>
          </div>

          <input className="input" style={{ textAlign:'center', fontSize:20, marginBottom:16, maxWidth:240, margin:'0 auto 16px' }}
            placeholder="+1 555 123 4567" value={number} onChange={e => setNumber(e.target.value)} disabled={status==='in-call'} />

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, maxWidth:240, margin:'0 auto 20px' }}>
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => (
              <button key={k} className="btn" style={{ fontSize:18, padding:'14px 0' }}
                onClick={() => setNumber(n => n + k)} disabled={status === 'in-call' && !connection}>{k}</button>
            ))}
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            {!device ? (
              <button className="btn btn-primary" onClick={initDevice}>Initialize Dialer</button>
            ) : status === 'in-call' ? (
              <>
                <button className="btn" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
                <button className="btn btn-danger" onClick={hangup}>Hang Up</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={call} disabled={!number || status === 'connecting'}>Call</button>
            )}
          </div>
        </div>

        {/* Contact quick-dial */}
        <div className="card">
          <div className="card-title mb-1">Quick Dial</div>
          {contacts.length === 0 ? <p className="text-muted text-sm">No contacts yet.</p> :
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {contacts.map(c => (
                <div key={c._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{c.firstName} {c.lastName}</div>
                    <div className="text-muted text-sm">{c.phone}</div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => setNumber(c.phone)}>Select</button>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}
