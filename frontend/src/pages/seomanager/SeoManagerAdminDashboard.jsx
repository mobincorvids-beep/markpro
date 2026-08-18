import React from 'react';
import { StatsDashboard, objOf } from '../../components/admin/adminKit';
import { seoManagerAdminAPI } from '../../services/api';

export default function SeoManagerAdminDashboard() {
  return (
    <StatsDashboard
      title="SEO Manager — overview"
      subtitle="Page SEO / meta CMS platform health at a glance"
      fetcher={async () => objOf(await seoManagerAdminAPI.getStats())}
      cards={[
        { label: 'Managed pages', key: 'totalPages' },
        { label: 'Total users',   key: 'totalUsers' },
        { label: 'Audits run',    key: 'totalAudits' },
        { label: 'CSV imports',   key: 'totalImports' },
      ]}
    />
  );
}
