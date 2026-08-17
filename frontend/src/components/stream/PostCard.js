import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  FaHeart, FaComment, FaRetweet, FaExternalLinkAlt,
  FaTwitter, FaFacebook, FaInstagram, FaYoutube,
  FaReddit, FaTiktok, FaRss, FaPinterest, FaLinkedin,
} from 'react-icons/fa';
import { NETWORKS } from '../../utils/networks';

const ICONS = {
  twitter: FaTwitter, facebook: FaFacebook, instagram: FaInstagram,
  youtube: FaYoutube, reddit: FaReddit, tiktok: FaTiktok,
  rss: FaRss, pinterest: FaPinterest, linkedin: FaLinkedin,
};

export default function PostCard({ post }) {
  const net = NETWORKS[post.network] || {};
  const Icon = ICONS[post.network] || FaRss;
  const color = post.account?.color || net.color || '#888';

  return (
    <div className="post-card">
      {/* Media */}
      {post.mediaType === 'image' && post.mediaUrls?.[0] && (
        <div className="post-card-media">
          <img src={post.mediaUrls[0]} alt="" loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      {post.mediaType === 'video' && post.thumbnailUrl && (
        <div className="post-card-media" style={{ position: 'relative' }}>
          <img src={post.thumbnailUrl} alt="" loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.3)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(255,255,255,.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: '#333',
            }}>▶</div>
          </div>
        </div>
      )}

      <div className="post-card-body">
        {/* Header */}
        <div className="post-card-header">
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: color + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color,
            flexShrink: 0,
          }}>
            <Icon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="post-card-author" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.authorName || post.authorUsername}
            </div>
            <div className="post-card-date">
              {post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : ''}
            </div>
          </div>
          <div className="post-card-network-badge" style={{ background: color }}>
            <Icon />
          </div>
        </div>

        {/* Text */}
        {post.text && (
          <p className="post-card-text">{post.text}</p>
        )}

        {/* YouTube title fallback */}
        {!post.text && post.network === 'youtube' && (
          <p className="post-card-text" style={{ fontWeight: 600 }}>{post.authorName}</p>
        )}

        {/* Footer */}
        <div className="post-card-footer">
          {post.likes > 0 && (
            <span className="post-card-stat"><FaHeart style={{ color: '#ef4444' }} /> {fmtNum(post.likes)}</span>
          )}
          {post.comments > 0 && (
            <span className="post-card-stat"><FaComment style={{ color: '#3b82f6' }} /> {fmtNum(post.comments)}</span>
          )}
          {post.shares > 0 && (
            <span className="post-card-stat"><FaRetweet style={{ color: '#22c55e' }} /> {fmtNum(post.shares)}</span>
          )}
          {post.link && (
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 'auto', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <FaExternalLinkAlt size={11} /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
