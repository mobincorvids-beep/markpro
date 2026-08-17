/**
 * Demo dashboard data.
 *
 * Used only as a visual placeholder so the dashboard charts render with
 * on-theme sample values while the live APIs are not connected yet.
 * As soon as the account overview endpoint returns real numbers, the real
 * data wins and none of this is used.
 */

export const DEMO_OVERVIEW = {
  isDemo: true,
  wallet: { balance: 1284.5, spent30: 412.75 },
  trend: 12,
  counts: { toolRuns: 1846, posts: 214, orders: 96, documents: 148 },
  traffic: [
    { week: 'W1', visits: 120, engagement: 18 },
    { week: 'W2', visits: 168, engagement: 24 },
    { week: 'W3', visits: 142, engagement: 21 },
    { week: 'W4', visits: 205, engagement: 32 },
    { week: 'W5', visits: 248, engagement: 29 },
    { week: 'W6', visits: 226, engagement: 37 },
    { week: 'W7', visits: 302, engagement: 41 },
    { week: 'W8', visits: 335, engagement: 46 },
  ],
  spend: [
    { name: 'AI Studio', value: 34, amount: 140.4, color: '#f5d34a' },
    { name: 'WhatsApp', value: 26, amount: 107.3, color: '#e0a92a' },
    { name: 'SEO Tools', value: 18, amount: 74.3, color: '#b8862b' },
    { name: 'Social', value: 14, amount: 57.8, color: '#7c6a3c' },
    { name: 'Other', value: 8, amount: 33.0, color: '#4a4438' },
  ],
  usage: [
    { name: 'AI', runs: 412 },
    { name: 'Social', runs: 318 },
    { name: 'SEO', runs: 264 },
    { name: 'WhatsApp', runs: 231 },
    { name: 'Email', runs: 176 },
    { name: 'Docs', runs: 118 },
    { name: 'Rank', runs: 94 },
  ],
  activity: [
    { title: 'Generated 12 AI captions', module: 'AI Studio', at: new Date(Date.now() - 6 * 60e3).toISOString() },
    { title: 'Published post to 3 channels', module: 'Social Media', at: new Date(Date.now() - 52 * 60e3).toISOString() },
    { title: 'WhatsApp campaign "Spring Sale" sent', module: 'WhatsApp', at: new Date(Date.now() - 3 * 3600e3).toISOString() },
    { title: 'Rank report generated for 24 keywords', module: 'Rank Tracker', at: new Date(Date.now() - 9 * 3600e3).toISOString() },
    { title: 'Uploaded 5 files to Document Vault', module: 'Documents', at: new Date(Date.now() - 26 * 3600e3).toISOString() },
  ],
};

/** True when the overview payload carries nothing worth charting. */
export const isOverviewEmpty = (o) =>
  !o ||
  (!(o.traffic || []).some(t => t.visits || t.engagement) &&
    !(o.spend || []).length &&
    !(o.usage || []).some(u => u.runs > 0));
