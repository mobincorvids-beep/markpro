import { useState } from 'react';
import { toast } from 'react-toastify';
import { ordersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function MassOrderPage() {
  const { user, setUser } = useAuth();
  const [text,      setText]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error('Please enter at least one order');
    setLoading(true); setResult(null);
    try {
      const { data } = await ordersApi.mass({ lines });
      setResult(data);
      if (data.placed > 0) {
        toast.success(`${data.placed} order(s) placed!`);
        setUser(prev => ({ ...prev, balance: prev.balance - data.totalCharge }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Mass order failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="topbar"><h1>Mass Order</h1></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Order Format</div>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            Each line: <code>serviceId|quantity|link</code>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Orders (one per line)</label>
              <textarea
                className="form-control"
                rows={12}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="64abc123|1000|https://instagram.com/p/abc&#10;64xyz456|500|https://twitter.com/user"
              />
              <div className="form-hint">{text.split('\n').filter(l=>l.trim()).length} lines</div>
            </div>
            <div className="service-info-box mb-1">
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span className="text-muted">Balance</span>
                <strong>${Number(user?.balance||0).toFixed(4)}</strong>
              </div>
            </div>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Processing…' : 'Place Mass Order'}
            </button>
          </form>
        </div>

        {result && (
          <div className="card">
            <div className="card-title">Result</div>
            <div className="flex gap-1 mb-2" style={{ flexWrap: 'wrap' }}>
              <div className="card" style={{ flex:1, textAlign:'center' }}>
                <div className="label text-muted text-sm">Placed</div>
                <div style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--success)' }}>{result.placed}</div>
              </div>
              <div className="card" style={{ flex:1, textAlign:'center' }}>
                <div className="label text-muted text-sm">Errors</div>
                <div style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--danger)' }}>{result.errors?.length || 0}</div>
              </div>
              <div className="card" style={{ flex:1, textAlign:'center' }}>
                <div className="label text-muted text-sm">Charged</div>
                <div style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--accent2)' }}>${result.totalCharge?.toFixed(4)}</div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div>
                <div className="card-title" style={{ marginTop:'0.5rem' }}>Errors</div>
                {result.errors.map((e, i) => (
                  <div key={i} className="alert alert-danger" style={{ marginBottom:'0.4rem', fontSize:'0.78rem' }}>
                    <strong>{e.line}</strong><br/>{e.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
