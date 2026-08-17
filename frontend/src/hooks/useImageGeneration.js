import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { imagesAPI } from '../services/api';

/** Turns a result item into a browser-usable src (base64 or remote URL). */
const srcOf = (item) => (item.format === 'bas' ? `data:image/png;base64,${item.src}` : item.src);

/**
 * Owns the generate → preview → save-to-gallery lifecycle for the AI image
 * generator so the page component stays declarative.
 */
export function useImageGeneration() {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [savedSet, setSavedSet] = useState({});

  const generate = useCallback(async (payload) => {
    if (!payload?.prompt?.trim()) { toast.error('Enter a prompt first'); return; }
    setLoading(true); setResults([]); setSavedSet({});
    try {
      const { data } = await imagesAPI.generate(payload);
      const body = data?.data ?? data;
      const out  = body?.out ?? [];
      const format = body?.format || 'url';
      setResults(out.map(src => ({ src, format })));
      if (!out.length) toast.info('The provider returned no images - try another prompt.');
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveToGallery = useCallback(async (idx, meta) => {
    const item = results[idx];
    if (!item) return;
    try {
      await imagesAPI.save({ ...meta, imageUrl: srcOf(item) });
      setSavedSet(prev => ({ ...prev, [idx]: true }));
      toast.success('Saved to your gallery');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not save this image');
    }
  }, [results]);

  const downloadImage = useCallback((idx) => {
    const item = results[idx];
    if (!item) return;
    const a = document.createElement('a');
    a.href = srcOf(item);
    a.download = `markpro-${Date.now()}-${idx + 1}.png`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  }, [results]);

  return { results, loading, savedSet, generate, saveToGallery, downloadImage };
}

export default useImageGeneration;
