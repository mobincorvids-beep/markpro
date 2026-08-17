import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { format } from 'date-fns';
import { FiFile, FiStar, FiUsers, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/docs/documents/stats').then(r=>setStats(r.data)).catch(()=>{}); }, []);

  if (!stats) return null;

  return (
    <div className="mb-4">
      <div className="stats-grid">
        <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--accent-light)', color:'var(--accent)' }}><FiFile/></div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Documents</div></div></div>
        <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--yellow-light)', color:'var(--yellow)' }}><FiStar/></div><div><div className="stat-value">{stats.starred}</div><div className="stat-label">Starred</div></div></div>
        <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--green-light)', color:'var(--green)' }}><FiUsers/></div><div><div className="stat-value">{stats.shared}</div><div className="stat-label">Shared With Me</div></div></div>
        <div className="card stat-card"><div className="stat-icon" style={{ background:'var(--red-light)', color:'var(--red)' }}><FiTrash2/></div><div><div className="stat-value">{stats.trashed}</div><div className="stat-label">In Trash</div></div></div>
      </div>

      {stats.expiringSoon?.length > 0 && (
        <div className="card mb-4" style={{ borderColor:'var(--yellow)' }}>
          <div className="card-header"><FiAlertTriangle style={{color:'var(--yellow)'}}/><span className="card-title">Expiring Soon</span></div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {stats.expiringSoon.map(d => (
              <div key={d._id} className="flex justify-between" style={{ fontSize:13 }}>
                <span>{d.name}</span>
                <span className="badge badge-yellow">Expires {format(new Date(d.expiryDate),'PP')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
