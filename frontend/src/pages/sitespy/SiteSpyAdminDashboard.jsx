import React from 'react';
import { StatsDashboard, objOf } from '../../components/admin/adminKit';
import { sitespyAdminAPI } from '../../services/api';

export default function SiteSpyAdminDashboard() {
  return (
    <StatsDashboard
      title="SiteSpy — overview"
      subtitle="Website monitoring & tools platform health at a glance"
      fetcher={async () => objOf(await sitespyAdminAPI.getStats())}
      cards={[
        { label: 'Total users',   key: 'totalUsers' },
        { label: 'Websites tracked', key: 'totalWebsites' },
        { label: 'Short URLs',    key: 'totalUrls' },
        { label: 'Scans (30d)',   key: 'recentScans' },
      ]}
    />
  );
}
