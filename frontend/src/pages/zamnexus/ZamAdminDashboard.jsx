import React from 'react';
import { StatsDashboard, objOf } from '../../components/admin/adminKit';
import { zamAdminAPI } from '../../services/api';

export default function ZamAdminDashboard() {
  return (
    <StatsDashboard
      title="ZAM Nexus — overview"
      subtitle="CRM / contacts platform health at a glance"
      fetcher={async () => objOf(await zamAdminAPI.getStats())}
      cards={[
        { label: 'Total users',   key: 'totalUsers' },
        { label: 'Contacts',      key: 'totalContacts' },
        { label: 'Lead searches', key: 'totalLeadSearches' },
        { label: 'Assets stored', key: 'totalAssets' },
      ]}
    />
  );
}
