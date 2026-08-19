import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../services/api';

/**
 * Public, unauthenticated page rendered at /r/:slug for biolink-type links.
 * This did not exist before — the backend already returned everything
 * needed (GET /api/biolinks/r/:slug -> { type, link, blocks }) but nothing
 * in the frontend ever rendered it, so published biolink pages had no
 * visible output despite being fully configurable in the editor.
 */
export default function PublicBiolinkPage() {
  const { slug } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/biolinks/r/${slug}`);
        const body = res?.data?.data ?? res?.data;
        if (cancelled) return;
        if (body?.type === 'redirect' && body?.url) {
          window.location.href = body.url;
          return;
        }
        setData(body);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || 'This page could not be found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div className="spinner spinner-lg" /></div>;
  if (error || !data) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Page not found</div>
        <div style={{ color: '#888' }}>{error || "This link doesn't exist or has been disabled."}</div>
      </div>
    </div>
  );

  const { link, blocks = [] } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0d', color: '#fff', padding: '48px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {blocks.map(block => <PublicBlock key={block._id} block={block} />)}
        {!blocks.length && (
          <div style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
            {link?.settings?.name || 'This page'} has no content yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PublicBlock({ block }) {
  const s = block.settings || {};
  switch (block.type) {
    case 'header':
      return (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{s.title}</div>
          {s.subtitle && <div style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>{s.subtitle}</div>}
        </div>
      );
    case 'link':
      return (
        <a href={s.url} target="_blank" rel="noreferrer"
           style={{ display: 'block', textAlign: 'center', padding: '14px 20px', borderRadius: 14, background: '#1a1a1e', color: '#fff', fontWeight: 600, textDecoration: 'none', border: '1px solid #2a2a2e' }}>
          {s.label}
        </a>
      );
    case 'text':
      return <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>{s.content}</div>;
    case 'image':
      return s.url ? <img src={s.url} alt="" style={{ width: '100%', borderRadius: 14 }} /> : null;
    case 'divider':
      return <div style={{ borderTop: '1px solid #2a2a2e', margin: '8px 0' }} />;
    case 'socials':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {['instagram', 'twitter', 'facebook', 'tiktok'].filter(k => s[k]).map(k => (
            <a key={k} href={s[k]} target="_blank" rel="noreferrer" style={{ color: '#fff', textTransform: 'capitalize', fontSize: 13 }}>{k}</a>
          ))}
        </div>
      );
    case 'email_collector':
      return (
        <form style={{ display: 'flex', gap: 8 }} onSubmit={async (e) => {
          e.preventDefault();
          const email = e.target.email.value;
          try {
            await api.post('/biolinks/blocks/email-collector', { biolink_block_id: block._id, link_id: block.link_id, email });
            e.target.reset();
            alert('Thanks — you\'re subscribed!');
          } catch { alert('Could not submit — please try again.'); }
        }}>
          <input name="email" type="email" required placeholder={s.placeholder || 'Enter your email'}
                 style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #2a2a2e', background: '#1a1a1e', color: '#fff' }} />
          <button type="submit" style={{ padding: '12px 18px', borderRadius: 10, background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 600 }}>Join</button>
        </form>
      );
    default:
      return null;
  }
}
