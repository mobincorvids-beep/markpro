import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import { servicesApi, ordersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function NewOrderPage() {
  const { user, setUser } = useAuth();
  const [searchParams]    = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [result,     setResult]     = useState(null);

  // Form fields
  const [link,      setLink]      = useState('');
  const [quantity,  setQuantity]  = useState('');
  const [comments,  setComments]  = useState('');
  const [hashtag,   setHashtag]   = useState('');
  const [hashtags,  setHashtags]  = useState('');
  const [usernames, setUsernames] = useState('');
  const [username,  setUsername]  = useState('');
  const [media,     setMedia]     = useState('');
  const [isDripFeed,setIsDripFeed]= useState(false);
  const [runs,      setRuns]      = useState('');
  const [interval,  setInterval]  = useState('');
  const [subPosts,  setSubPosts]  = useState('');
  const [subMin,    setSubMin]    = useState('');
  const [subMax,    setSubMax]    = useState('');
  const [subDelay,  setSubDelay]  = useState('');
  const [subExpiry, setSubExpiry] = useState('');

  useEffect(() => {
    servicesApi.grouped().then(r => {
      const d = r?.data;
      const list = Array.isArray(d) ? d
        : Array.isArray(d?.categories) ? d.categories
        : Array.isArray(d?.data) ? d.data
        : Array.isArray(d?.services)
          ? [{ name: 'All Services', services: d.services }]
          : d && typeof d === 'object'
            ? Object.entries(d)
                .filter(([, v]) => Array.isArray(v))
                .map(([name, services]) => ({ name, services }))
            : [];
      setCategories(list);
      // Pre-select service from URL ?service=id
      const sid = searchParams.get('service');
      if (sid) {
        for (const cat of list) {
          const s = cat.services?.find(s => s._id === sid);
          if (s) { setSelectedService(s); break; }
        }
      }
    }).catch(() => setCategories([])).finally(() => setLoading(false));
  }, [searchParams]);

  const allServices = useMemo(() =>
    (Array.isArray(categories) ? categories : []).flatMap(c => (c.services || []).map(s => ({ ...s, categoryName: c.name }))),
    [categories]
  );

  const filtered = useMemo(() => {
    if (!search) return allServices;
    const q = search.toLowerCase();
    return allServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      String(s._id).includes(q) ||
      s.categoryName?.toLowerCase().includes(q)
    );
  }, [search, allServices]);

  const charge = useMemo(() => {
    if (!selectedService) return 0;
    const type = selectedService.type;
    if (type === 'package' || type === 'custom_comments_package') return selectedService.price;
    const qty = isDripFeed
      ? (parseInt(runs) || 0) * (parseInt(quantity) || 0)
      : parseInt(quantity) || 0;
    return ((selectedService.price * qty) / 1000).toFixed(4);
  }, [selectedService, quantity, runs, isDripFeed]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const payload = {
        serviceId: selectedService._id,
        link, quantity, comments, hashtag, hashtags, usernames,
        username, media, isDripFeed, runs, interval,
        subPosts, subMin, subMax, subDelay, subExpiry,
      };
      const { data } = await ordersApi.place(payload);
      setResult({ type: 'success', data });
      setUser(prev => ({ ...prev, balance: data.newBalance }));
      toast.success('Order placed successfully!');
      // reset
      setLink(''); setQuantity(''); setComments(''); setHashtag('');
      setHashtags(''); setUsernames(''); setUsername(''); setMedia('');
      setIsDripFeed(false); setRuns(''); setInterval('');
      setSubPosts(''); setSubMin(''); setSubMax(''); setSubDelay(''); setSubExpiry('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Order failed';
      setResult({ type: 'error', msg });
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  const st = selectedService?.type;
  const isDalle = st === 'subscriptions';
  const isPackage = ['package','custom_comments_package'].includes(st);
  const isCustomComments = ['custom_comments'].includes(st);
  const isMentionsList = st === 'mentions_custom_list';
  const showDripfeed = selectedService?.dripfeed && !isDalle;

  if (loading) return <div className="loader"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="topbar"><h1>＋ New Order</h1></div>
      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* Service picker */}
        <div className="card">
          <div className="card-title">Choose Service</div>
          <input
            className="form-control mb-1"
            placeholder="Search by name, ID or category…"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedService(null); }}
          />
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(search ? filtered : allServices).map(s => (
              <div
                key={s._id}
                className={`service-select-card ${selectedService?._id === s._id ? 'active' : ''}`}
                onClick={() => { setSelectedService(s); setQuantity(String(s.min)); setIsDripFeed(false); }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.name}</div>
                <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                  <span className="text-muted text-sm">ID: {s._id.slice(-6)}</span>
                  <span className="text-muted text-sm">·</span>
                  <span className="text-sm" style={{ color: 'var(--accent2)' }}>${s.price}/1000</span>
                  <span className="text-muted text-sm">·</span>
                  <span className="text-muted text-sm">{s.categoryName}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-muted text-sm">No services found</div>}
          </div>
        </div>

        {/* Order form */}
        <div>
          {selectedService && (
            <div className="service-info-box mb-1">
              <div className="row"><span className="text-muted">Service</span><strong>{selectedService.name}</strong></div>
              <div className="row"><span className="text-muted">Price</span><span>${selectedService.price}/1000</span></div>
              <div className="row"><span className="text-muted">Min</span><span>{selectedService.min}</span></div>
              <div className="row"><span className="text-muted">Max</span><span>{selectedService.max.toLocaleString()}</span></div>
              {selectedService.avgTime > 0 && (
                <div className="row"><span className="text-muted">Avg Time</span><span>{selectedService.avgTime} min</span></div>
              )}
              {selectedService.description && (
                <div style={{ marginTop: '0.4rem', color: 'var(--text2)', fontSize: '0.78rem' }}>{selectedService.description}</div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-title">Order Details</div>
            {!selectedService ? (
              <p className="text-muted text-sm">← Select a service to continue</p>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Link field - always shown except pure subscription? */}
                {st !== 'subscriptions' && (
                  <div className="form-group">
                    <label className="form-label">Link / URL</label>
                    <input className="form-control" type="text" required value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
                  </div>
                )}

                {/* Subscription fields */}
                {st === 'subscriptions' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Link</label>
                      <input className="form-control" required value={link} onChange={e => setLink(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input className="form-control" required value={username} onChange={e => setUsername(e.target.value)} />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">New posts</label>
                        <input className="form-control" type="number" min={1} required value={subPosts} onChange={e => setSubPosts(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Delay (min)</label>
                        <input className="form-control" type="number" min={0} value={subDelay} onChange={e => setSubDelay(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Min qty</label>
                        <input className="form-control" type="number" required value={subMin} onChange={e => setSubMin(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Max qty</label>
                        <input className="form-control" type="number" required value={subMax} onChange={e => setSubMax(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expiry date (optional)</label>
                      <input className="form-control" type="date" value={subExpiry} onChange={e => setSubExpiry(e.target.value)} />
                    </div>
                  </>
                )}

                {/* Quantity - standard types */}
                {!isPackage && st !== 'subscriptions' && !isMentionsList && !isCustomComments && (
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input className="form-control" type="number"
                      min={selectedService.min} max={selectedService.max} required
                      value={quantity} onChange={e => setQuantity(e.target.value)} />
                    <div className="form-hint">Min: {selectedService.min} / Max: {selectedService.max.toLocaleString()}</div>
                  </div>
                )}

                {/* Custom comments */}
                {(isCustomComments || st === 'custom_comments_package') && (
                  <div className="form-group">
                    <label className="form-label">Comments (one per line)</label>
                    <textarea className="form-control" rows={6} required value={comments} onChange={e => setComments(e.target.value)} placeholder="Comment 1&#10;Comment 2&#10;Comment 3" />
                    <div className="form-hint">{comments.split('\n').filter(l=>l.trim()).length} comments</div>
                  </div>
                )}

                {/* Mentions */}
                {isMentionsList && (
                  <div className="form-group">
                    <label className="form-label">Usernames (one per line)</label>
                    <textarea className="form-control" rows={5} required value={usernames} onChange={e => setUsernames(e.target.value)} />
                  </div>
                )}
                {st === 'mentions_with_hashtags' && (
                  <div className="form-group">
                    <label className="form-label">Hashtags</label>
                    <input className="form-control" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#tag1 #tag2" />
                  </div>
                )}
                {st === 'mentions_hashtag' && (
                  <div className="form-group">
                    <label className="form-label">Hashtag</label>
                    <input className="form-control" value={hashtag} onChange={e => setHashtag(e.target.value)} placeholder="#yourhashtag" />
                  </div>
                )}
                {st === 'mentions_media_likers' && (
                  <div className="form-group">
                    <label className="form-label">Media URL</label>
                    <input className="form-control" value={media} onChange={e => setMedia(e.target.value)} />
                  </div>
                )}

                {/* Drip-feed */}
                {showDripfeed && (
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isDripFeed} onChange={e => setIsDripFeed(e.target.checked)} />
                      <span className="form-label" style={{ margin: 0 }}>Enable Drip-Feed</span>
                    </label>
                    {isDripFeed && (
                      <div className="grid-2 mt-1">
                        <div>
                          <label className="form-label">Runs</label>
                          <input className="form-control" type="number" min={1} required value={runs} onChange={e => setRuns(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Interval (min)</label>
                          <input className="form-control" type="number" min={1} required value={interval} onChange={e => setInterval(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Charge summary */}
                <div className="service-info-box">
                  <div className="row">
                    <span className="text-muted">Your balance</span>
                    <strong>${Number(user?.balance||0).toFixed(4)}</strong>
                  </div>
                  <div className="row">
                    <span className="text-muted">Order charge</span>
                    <strong style={{ color: 'var(--accent2)' }}>${charge}</strong>
                  </div>
                  <div className="row">
                    <span className="text-muted">After order</span>
                    <strong style={{ color: parseFloat(user?.balance||0) - parseFloat(charge) < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ${(parseFloat(user?.balance||0) - parseFloat(charge)).toFixed(4)}
                    </strong>
                  </div>
                </div>

                {result?.type === 'error' && <div className="alert alert-danger">{result.msg}</div>}
                {result?.type === 'success' && <div className="alert alert-success">Order #{result.data.order?.id?.slice(-6)} placed!</div>}

                <button className="btn btn-primary btn-block" disabled={submitting}>
                  {submitting ? 'Placing order…' : 'Place Order'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
