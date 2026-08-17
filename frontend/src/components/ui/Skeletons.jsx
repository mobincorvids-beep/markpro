/**
 * Loading placeholders built on react-loading-skeleton, themed with the
 * app's CSS variables so they work in both light and dark mode.
 */
import React from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function Themed({ children }) {
  return (
    <SkeletonTheme baseColor="var(--skeleton-base)" highlightColor="var(--skeleton-hi)">
      {children}
    </SkeletonTheme>
  );
}

export function CardSkeleton({ height = 260 }) {
  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <Skeleton width="45%" height={14} />
      <Skeleton width="65%" height={10} style={{ marginTop: 6 }} />
      <Skeleton height={height} style={{ marginTop: 14, borderRadius: 12 }} />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <Skeleton circle width={38} height={38} />
      <Skeleton width="60%" height={11} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={20} style={{ marginTop: 6 }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Themed>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => <StatSkeleton key={i} />)}
      </div>
      <div className="chart-grid">
        {[0, 1, 2].map(i => <CardSkeleton key={i} height={220} />)}
      </div>
    </Themed>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <Themed>
      <div className="glass-card" style={{ padding: 18 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height={16} style={{ marginBottom: 10 }} />
        ))}
      </div>
    </Themed>
  );
}

export default Skeleton;
