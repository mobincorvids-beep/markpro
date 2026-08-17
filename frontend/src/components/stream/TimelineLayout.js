import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  FaTwitter, FaFacebook, FaInstagram, FaYoutube,
  FaReddit, FaTiktok, FaRss, FaPinterest, FaLinkedin,
  FaHeart, FaComment, FaExternalLinkAlt,
} from 'react-icons/fa';
import { NETWORKS } from '../../utils/networks';

const ICONS = {
  twitter: FaTwitter, facebook: FaFacebook, instagram: FaInstagram,
  youtube: FaYoutube, reddit: FaReddit, tiktok: FaTiktok,
  rss: FaRss, pinterest: FaPinterest, linkedin: FaLinkedin,
};

export default function TimelineLayout({ posts }) {
  return (
    <div className="timeline-feed">
      {posts.map((post) => {
        const net = NETWORKS[post.network] || {};
        const Icon = ICONS[post.network] || FaRss;
        const color = post.account?.color || net.color || '#888';

        return (
          <div className="timeline-item" key={post._id}>
            <div className="timeline-dot" style={{ background: color }}>
              <Icon />
            </div>
            <div className="timeline-content card card-body" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{post.authorName}</span>
                <span className="text-muted text-sm">
                  {post.publishedAt ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) : ''}
                </span>
              </div>

              {post.thumbnailUrl && (
                <img src={post.thumbnailUrl} alt="" style={{ borderRadius: 8, marginBottom: 10, maxHeight: 200, objectFit: 'cover', width: '100%' }}
                  loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
              )}

              {post.text && <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>{post.text}</p>}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                {post.likes > 0 && <span><FaHeart style={{ color: '#ef4444' }} /> {post.likes}</span>}
                {post.comments > 0 && <span><FaComment style={{ color: '#3b82f6' }} /> {post.comments}</span>}
                {post.link && (
                  <a href={post.link} target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: 'auto', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FaExternalLinkAlt size={11} /> View
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
