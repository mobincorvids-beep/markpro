/**
 * Top-of-page route progress bar (nprogress). Mounted once in AppLayout.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.15 });

export default function RouteProgress() {
  const location = useLocation();
  useEffect(() => {
    NProgress.start();
    const t = setTimeout(() => NProgress.done(), 350);
    return () => { clearTimeout(t); NProgress.done(); };
  }, [location.pathname]);
  return null;
}
