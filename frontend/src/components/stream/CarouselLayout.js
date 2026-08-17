import React, { useState, useRef } from 'react';
import PostCard from './PostCard';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function CarouselLayout({ posts }) {
  const [offset, setOffset] = useState(0);
  const CARD_W = 340; // card width + gap

  const max = Math.max(0, posts.length - 3);

  const prev = () => setOffset((o) => Math.max(0, o - 1));
  const next = () => setOffset((o) => Math.min(max, o + 1));

  return (
    <div className="carousel-wrapper" style={{ padding: '0 28px' }}>
      <button className="carousel-btn prev" onClick={prev} disabled={offset === 0}
        style={{ opacity: offset === 0 ? 0.4 : 1 }}>
        <FiChevronLeft />
      </button>

      <div style={{ overflow: 'hidden' }}>
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${offset * CARD_W}px)` }}
        >
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      </div>

      <button className="carousel-btn next" onClick={next} disabled={offset >= max}
        style={{ opacity: offset >= max ? 0.4 : 1 }}>
        <FiChevronRight />
      </button>
    </div>
  );
}
