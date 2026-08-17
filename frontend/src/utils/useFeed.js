import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useDebounce from '../utils/useDebounce';

export default function useFeed() {
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [allNetworks, setAllNetworks]   = useState([]);
  const [activeNetworks, setActiveNetworks] = useState([]);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState('newest');
  const debouncedSearch = useDebounce(search, 400);

  // Track mounted state to avoid setState after unmount
  const mounted = useRef(true);
  useEffect(() => { return () => { mounted.current = false; }; }, []);

  const fetchPage = useCallback(async (pg, reset = false) => {
    if (!mounted.current) return;
    if (reset) setLoading(true);

    try {
      const params = new URLSearchParams({
        page: pg,
        limit: 20,
        sort,
        ...(debouncedSearch   && { q: debouncedSearch }),
        ...(activeNetworks.length && { networks: activeNetworks.join(',') }),
      });
      const res = await api.get(`/feed?${params}`);
      if (!mounted.current) return;

      const newPosts = res.data.posts || [];
      setPosts(prev => (reset || pg === 1) ? newPosts : [...prev, ...newPosts]);
      setHasMore(pg < res.data.pagination.pages);
      setPage(pg + 1);

      // Accumulate known networks for the filter bar
      if (pg === 1) {
        const nets = [...new Set(newPosts.map(p => p.network))];
        setAllNetworks(prev => {
          const combined = [...new Set([...prev, ...nets])];
          return combined;
        });
      }
    } catch {
      if (mounted.current) toast.error('Failed to load posts');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [debouncedSearch, activeNetworks, sort]);

  // Reset whenever filters change
  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
  }, [debouncedSearch, activeNetworks, sort]);

  const loadMore = () => fetchPage(page);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post('/feed/refresh');
      toast.success(`Synced ${res.data.saved} new posts`);
      setPosts([]);
      setPage(1);
      setHasMore(true);
      await fetchPage(1, true);
    } catch {
      toast.error('Refresh failed');
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const toggleNetwork = (net) => {
    setActiveNetworks(prev =>
      prev.includes(net) ? prev.filter(n => n !== net) : [...prev, net]
    );
  };

  return {
    posts, loading, refreshing, hasMore,
    allNetworks, activeNetworks, toggleNetwork,
    search, setSearch,
    sort, setSort,
    loadMore, refresh,
  };
}
