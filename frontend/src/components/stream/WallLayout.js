import React from 'react';
import Masonry from 'react-masonry-css';
import PostCard from './PostCard';

const breakpointCols = {
  default: 4,
  1400: 3,
  1100: 2,
  700: 1,
};

export default function WallLayout({ posts }) {
  return (
    <Masonry
      breakpointCols={breakpointCols}
      className="masonry-grid"
      columnClassName="masonry-col"
    >
      {posts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </Masonry>
  );
}
