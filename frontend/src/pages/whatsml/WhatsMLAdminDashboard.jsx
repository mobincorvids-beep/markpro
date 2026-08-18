import React from 'react';
import { StatsDashboard, objOf } from '../../components/admin/adminKit';
import { whatsmlAdminAPI } from '../../services/api';

export default function WhatsMLAdminDashboard() {
  return (
    <StatsDashboard
      title="WhatsML — overview"
      subtitle="WhatsApp automation platform health at a glance"
      fetcher={async () => objOf(await whatsmlAdminAPI.getStats())}
      cards={[
        { label: 'Workspaces',    key: 'totalWorkspaces' },
        { label: 'Customers',     key: 'totalCustomers' },
        { label: 'Conversations', key: 'totalConversations' },
        { label: 'Messages (30d)',key: 'recentMessages' },
      ]}
    />
  );
}
