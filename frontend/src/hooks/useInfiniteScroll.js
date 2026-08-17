import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a ref to attach to a sentinel element; `onLoadMore` fires whenever
 * that sentinel scrolls into view and `hasMore` is still true.
 */
export function useInfiniteScroll(onLoadMore, hasMore) {
  const ref = useRef(null);
  const cb  = useRef(onLoadMore);
  cb.current = onLoadMore;

  const observe = useCallback(() => {
    const node = ref.current;
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) cb.current?.(); },
      { rootMargin: '400px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore]);

  useEffect(observe, [observe]);
  return ref;
}

export default useInfiniteScroll;
