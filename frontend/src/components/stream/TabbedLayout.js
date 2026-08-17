import React, { useMemo, useState } from 'react';
import PostCard from './PostCard';
import { NETWORKS } from '../../utils/networks';

/** Groups feed posts by source network and renders one tab per network. */
export default function TabbedLayout({ posts = [] }) {
  const networks = useMemo(
    () => [...new Set(posts.map(p => p.network).filter(Boolean))],
    [posts],
  );
  const [active, setActive] = useState('all');
  const visible = active === 'all' ? posts : posts.filter(p => p.network === active);

  return (
    <div className="tabbed-feed">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button type="button" className={`model-tab ${active === 'all' ? 'active' : ''}`}
                onClick={() => setActive('all')}>All ({posts.length})</button>
        {networks.map(n => (
          <button key={n} type="button" className={`model-tab ${active === n ? 'active' : ''}`}
                  onClick={() => setActive(n)}>
            {NETWORKS[n]?.label || n}
          </button>
        ))}
      </div>

      <div className="tabbed-grid" style={{
        display: 'grid', gap: 16,
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      }}>
        {visible.map(post => <PostCard key={post._id} post={post} />)}
      </div>
    </div>
  );
}
