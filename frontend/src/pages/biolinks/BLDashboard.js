import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Link2, LayoutGrid, MousePointerClick } from 'lucide-react';
import { biolinksAPI } from '../../services/api';

const errText = (e, f) => e?.response?.data?.message || e?.response?.data?.error || e?.message || f;

export default function BLDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await biolinksAPI.getStats();
      setStats(res?.data?.data ?? res?.data ?? {});
    } catch (e) { setError(errText(e, 'Could not load your stats.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cards = [
    { label: 'Short links',    value: stats?.totalLinks ?? 0,    icon: Link2 },
    { label: 'Biolink pages',  value: stats?.totalBiolinks ?? 0, icon: LayoutGrid },
    { label: 'Total clicks',   value: stats?.totalClicks ?? 0,   icon: MousePointerClick },
  ];

  return (
    <div>
      <div className="page-header-row">
        <div><div className="page-title">Dashboard</div></div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : error ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-title">Couldn't load this</div>
            <div className="empty-sub">{error}</div>
            <button className="btn btn-secondary btn-sm mt-4" onClick={load}>Try again</button>
          </div>
        </div></div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: 20 }}>
            {cards.map(c => (
              <div className="card" key={c.label}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-2, rgba(139,92,246,.12))', display: 'grid', placeItems: 'center' }}>
                    <c.icon size={20} color="#8b5cf6" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900 }}>{c.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <Link to="/biolinks/pages" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Manage biolink pages</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Create and edit your link-in-bio pages <ArrowRight size={13} style={{ verticalAlign: -1 }} /></div>
              </div>
            </Link>
            <Link to="/biolinks/links" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Manage short links</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Create and track shortened URLs <ArrowRight size={13} style={{ verticalAlign: -1 }} /></div>
              </div>
            </Link>
            <Link to="/biolinks/tools" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card-body">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>QR codes</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Generate QR codes for any link <ArrowRight size={13} style={{ verticalAlign: -1 }} /></div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
