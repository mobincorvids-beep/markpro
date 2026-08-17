import React, { useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { FiRefreshCw, FiLayout } from 'react-icons/fi';
import FilterBar from '../../components/stream/FilterBar';
import WallLayout from '../../components/stream/WallLayout';
import TimelineLayout from '../../components/stream/TimelineLayout';
import CarouselLayout from '../../components/stream/CarouselLayout';
import RotatingLayout from '../../components/stream/RotatingLayout';
import TabbedLayout from '../../components/stream/TabbedLayout';
import TickerLayout from '../../components/stream/TickerLayout';
import { LAYOUTS } from '../../utils/networks';
import useFeed from '../../utils/useFeed';

export default function Feed() {
  const [layout, setLayout] = useState('wall');
  const {
    posts, loading, refreshing, hasMore,
    allNetworks, activeNetworks, toggleNetwork,
    search, setSearch,
    sort, setSort,
    loadMore, refresh,
  } = useFeed();

  const isEmpty = !loading && posts.length === 0;

  const renderLayout = () => {
    if (loading && posts.length === 0) return <div className="spinner" />;
    if (isEmpty) return (
      <div className="empty-state">
        <div className="empty-state-icon"></div>
        <div className="empty-state-title">No posts found</div>
        <p className="text-muted">Adjust your filters, add social accounts, or hit Sync.</p>
      </div>
    );

    switch (layout) {
      case 'timeline':  return <TimelineLayout posts={posts} />;
      case 'carousel':  return <CarouselLayout posts={posts} />;
      case 'rotating':  return <RotatingLayout posts={posts} />;
      case 'tabbed':    return <TabbedLayout posts={posts} />;
      case 'ticker':    return <TickerLayout posts={posts} />;
      default:          return <WallLayout posts={posts} />;
    }
  };

  const supportsInfinite = layout === 'wall' || layout === 'timeline';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Social Feed</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiLayout style={{ color: 'var(--text-muted)' }} />
            <select value={layout} onChange={e => setLayout(e.target.value)}
              style={{ padding: '7px 12px', fontSize: 13, width: 'auto' }}>
              {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '7px 12px', fontSize: 13, width: 'auto' }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="popular">Most popular</option>
          </select>
          <button className="btn btn-primary" onClick={refresh} disabled={refreshing}>
            <FiRefreshCw style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            {refreshing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {layout !== 'ticker' && layout !== 'tabbed' && (
        <FilterBar
          networks={allNetworks}
          activeNetworks={activeNetworks}
          onToggleNetwork={toggleNetwork}
          search={search}
          onSearch={setSearch}
        />
      )}

      {supportsInfinite ? (
        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<div className="spinner" />}
          endMessage={posts.length > 0
            ? <p className="text-center text-muted" style={{ padding: 20 }}>All caught up!</p>
            : null}
        >
          {renderLayout()}
        </InfiniteScroll>
      ) : renderLayout()}
    </div>
  );
}
