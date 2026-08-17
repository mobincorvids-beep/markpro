import React from 'react';
import { FiSearch } from 'react-icons/fi';
import {
  FaTwitter, FaFacebook, FaInstagram, FaYoutube,
  FaReddit, FaTiktok, FaRss,
} from 'react-icons/fa';
import { NETWORKS } from '../../utils/networks';

const ICONS = {
  twitter: FaTwitter, facebook: FaFacebook, instagram: FaInstagram,
  youtube: FaYoutube, reddit: FaReddit, tiktok: FaTiktok, rss: FaRss,
};

export default function FilterBar({ networks, activeNetworks, onToggleNetwork, search, onSearch }) {
  return (
    <div className="filter-bar">
      <div className="filter-search">
        <FiSearch className="filter-search-icon" />
        <input
          type="text"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {networks.map((net) => {
          const Icon = ICONS[net] || FaRss;
          const color = NETWORKS[net]?.color || '#888';
          const active = activeNetworks.includes(net);
          return (
            <button
              key={net}
              className={`filter-network-btn ${active ? 'active' : ''}`}
              style={active ? { background: color } : {}}
              onClick={() => onToggleNetwork(net)}
            >
              <Icon style={{ color: active ? '#fff' : color }} />
              {NETWORKS[net]?.label || net}
            </button>
          );
        })}
      </div>
    </div>
  );
}
