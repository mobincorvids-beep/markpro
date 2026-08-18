import React from 'react';
import { StatsDashboard, objOf } from '../../components/admin/adminKit';
import { telemanAdminAPI } from '../../services/api';

export default function TelemanAdminDashboard() {
  return (
    <StatsDashboard
      title="Teleman — overview"
      subtitle="Call & SMS platform health at a glance"
      fetcher={async () => objOf(await telemanAdminAPI.getStats())}
      cards={[
        { label: 'Total users',   key: 'totalUsers' },
        { label: 'Campaigns',     key: 'totalCampaigns' },
        { label: 'Calls (30d)',   key: 'recentCalls' },
        { label: 'SMS sent (30d)',key: 'recentSms' },
      ]}
    />
  );
}
