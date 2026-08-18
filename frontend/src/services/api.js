import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const rt = localStorage.getItem('refreshToken');
      if (rt) {
        try {
          const base = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          const { data } = await axios.post(`${base}/auth/refresh`, { refreshToken: rt });
          const at = data.data?.accessToken || data.accessToken;
          localStorage.setItem('accessToken', at);
          localStorage.setItem('token', at);
          orig.headers.Authorization = `Bearer ${at}`;
          return api(orig);
        } catch {
          ['accessToken','refreshToken','token'].forEach(k => localStorage.removeItem(k));
          window.location.href = '/login';
        }
      } else { window.location.href = '/login'; }
    }
    return Promise.reject(err);
  }
);

//  Auth 
export const authAPI = {
  login:          d => api.post('/auth/login', d),
  register:       d => api.post('/auth/register', d),
  logout:         () => api.post('/auth/logout'),
  refresh:        rt => api.post('/auth/refresh', { refreshToken: rt }),
  me:             () => api.get('/auth/me'),
  forgotPassword: e => api.post('/auth/forgot-password', { email: e }),
  resetPassword:  d => api.post('/auth/reset-password', d),
  verifyEmail:    t => api.get(`/auth/verify-email/${t}`),
  getPlans:       () => api.get('/auth/plans'),
  socialConfig:   () => api.get('/auth/social/config'),
  social:         (provider, body) => api.post(`/auth/social/${provider}`, body),
};

//  SEO Tools 
export const seoAPI = {
  runTool:  (tool, d)  => api.post(`/seo/tools/${tool}`, d),
  history:  (p)        => api.get('/seo/tools/history', { params: p }),
  audit:    (d)        => api.post('/seo/tools/audit', d),
  keywords: (d)        => api.post('/seo/tools/keywords', d),
  backlinks:(d)        => api.post('/seo/tools/backlinks', d),
};

//  Cyber / Dev Tools 
export const cyberAPI = {
  runTool: (tool, d) => api.post(`/cyber/tools/${tool}`, d),
  list:    ()        => api.get('/cyber/tools'),
};

//  Bio Pages (PixaURL) 
export const bioAPI = {
  getPages:     (p) => api.get('/bio/user/campaigns', { params: p }),
  getPage:      id  => api.get(`/bio/editor/template/${id}`),
  createPage:   d   => api.post('/bio/user/campaigns', d),
  updatePage:   (id,d) => api.put('/bio/editor/template/name', { id, ...d }),
  deletePage:   id  => api.delete(`/bio/user/campaigns/${id}`),
  getTemplates: ()  => api.get('/bio/user/templates'),
  getThemes:    ()  => api.get('/bio/user/templates', { params: { type: 'theme' } }),
  getAnalytics: id  => api.get(`/bio/user/analytics`, { params: { id } }),
  uploadImage:  d   => api.post('/bio/editor/upload', d, { headers:{'Content-Type':'multipart/form-data'}}),
};

//  Social Proof 
export const socialAPI = {
  getCampaigns:  p     => api.get('/social/campaigns', { params: p }),
  getCampaign:   id    => api.get(`/social/campaigns/${id}`),
  createCampaign: d    => api.post('/social/campaigns', d),
  updateCampaign: (id,d) => api.put(`/social/campaigns/${id}`, d),
  deleteCampaign: id   => api.delete(`/social/campaigns/${id}`),
  getNotifications: id => api.get(`/social/campaigns/${id}/notifications`),
  createNotification: (id,d) => api.post(`/social/campaigns/${id}/notifications`, d),
  getDomains:    ()    => api.get('/social/user/domains'),
  getPixel:      id    => api.get(`/social/pixel/pixel.js`, { params: { campaign: id } }),
  getPlans:      ()    => api.get('/social/plans'),
  checkout:      d     => api.post('/social/user/billing/checkout', d),
};

//  SMM Panel 
export const smmAPI = {
  getServices:  p     => api.get('/smm/services', { params: p }),
  getOrders:    p     => api.get('/smm/orders/mine', { params: p }),
  createOrder:  d     => api.post('/smm/orders', d),
  createMass:   d     => api.post('/smm/orders/mass', d),
  getTickets:   p     => api.get('/smm/tickets', { params: p }),
  createTicket: d     => api.post('/smm/tickets', d),
  replyTicket:  (id,d)=> api.post(`/smm/tickets/${id}/reply`, d),
  getTransactions: p  => api.get('/smm/transactions', { params: p }),
  addFunds:     d     => api.post('/smm/add-funds/manual', d),
  getPayMethods:()    => api.get('/smm/add-funds/methods'),
  getSubscriptions: ()=> api.get('/smm/subscriptions'),
};

//  Social Stream 
export const streamAPI = {
  getFeed:      p     => api.get('/stream/feed', { params: p }),
  refreshFeed:  ()    => api.post('/stream/feed/refresh'),
  getAccounts:  ()    => api.get('/stream/accounts'),
  addAccount:   d     => api.post('/stream/accounts', d),
  removeAccount:id    => api.delete(`/stream/accounts/${id}`),
  getStreams:    ()    => api.get('/stream/streams'),
  createStream: d     => api.post('/stream/streams', d),
  deleteStream: id    => api.delete(`/stream/streams/${id}`),
};

//  AI Suite 
export const aiAPI = {
  generateReply:  d   => api.post('/ai/replies/generate', d),
  getHistory:     p   => api.get('/ai/replies/history', { params: p }),
  toggleFavorite: id  => api.patch(`/ai/replies/${id}/favorite`),
  generateImage:  d   => api.post('/ai/images/generate', d),
  saveImage:      d   => api.post('/ai/images/save', d),
  getImages:      p   => api.get('/ai/images', { params: p }),
  getFavorites:   ()  => api.get('/ai/images/favorites'),
};

//  AI images (gallery / generator) 
export const imagesAPI = {
  list:       p       => api.get('/ai/images', { params: p }),
  mine:       p       => api.get('/ai/images/my', { params: p }),
  get:        id      => api.get(`/ai/images/${id}`),
  generate:   d       => api.post('/ai/images/generate', d),
  save:       d       => api.post('/ai/images/save', d),
  remove:     id      => api.delete(`/ai/images/${id}`),
  setVisibility: (id, isPrivate) => api.patch(`/ai/images/${id}/visibility`, { isPrivate }),
};

export const favoritesAPI = {
  list:   ()  => api.get('/ai/images/favorites'),
  toggle: id  => api.post(`/ai/images/${id}/favorite`),
};

//  Admin 
export const adminAPI = {
  getStats:          ()      => api.get('/admin/stats'),
  getDashboard:      ()      => api.get('/admin/dashboard'),
  listUsers:         p       => api.get('/admin/users', { params: p }),
  updateUser:        (id,d)  => api.put(`/admin/users/${id}`, d),
  deleteUser:        id      => api.delete(`/admin/users/${id}`),
  adjustBalance:     (id,d)  => api.patch(`/admin/users/${id}/balance`, d),
  toggleStatus:      (id,d)  => api.patch(`/admin/users/${id}/status`, d),
  listPlans:         ()      => api.get('/admin/plans'),
  createPlan:        d       => api.post('/admin/plans', d),
  updatePlan:        (id,d)  => api.put(`/admin/plans/${id}`, d),
  deletePlan:        id      => api.delete(`/admin/plans/${id}`),
  listServices:      p       => api.get('/admin/services', { params: p }),
  createService:     d       => api.post('/admin/services', d),
  updateService:     (id,d)  => api.put(`/admin/services/${id}`, d),
  deleteService:     id      => api.delete(`/admin/services/${id}`),
  listOrders:        p       => api.get('/admin/orders', { params: p }),
  updateOrderStatus: (id,d)  => api.patch(`/admin/orders/${id}/status`, d),
  listProviders:     ()      => api.get('/admin/providers'),
  createProvider:    d       => api.post('/admin/providers', d),
  updateProvider:    (id,d)  => api.put(`/admin/providers/${id}`, d),
  deleteProvider:    id      => api.delete(`/admin/providers/${id}`),
  listTickets:       p       => api.get('/admin/tickets', { params: p }),
  replyTicket:       (id,d)  => api.post(`/admin/tickets/${id}/reply`, d),
  getSettings:       ()      => api.get('/admin/settings'),
  updateSettings:    d       => api.put('/admin/settings', d),
  listCoupons:       ()      => api.get('/admin/coupons'),
  createCoupon:      d       => api.post('/admin/coupons', d),
};


//  PHPRank 
/**
 * Legacy alias used by the SMM admin screens, which were written against an
 * older method naming scheme. Thin mapping onto adminAPI / the same endpoints.
 */
/** AI reply-generator alias used by the AI module screens. */
export const replyAPI = {
  generate:       d  => api.post('/ai/replies/generate', d),
  getHistory:     p  => api.get('/ai/replies/history', { params: p }),
  toggleFavorite: id => api.patch(`/ai/replies/${id}/favorite`),
  deleteReply:    id => api.delete(`/ai/replies/${id}`),
};

export const adminApi = {
  stats:             ()      => adminAPI.getStats(),
  users:             p       => adminAPI.listUsers(p),
  updateUserStatus:  (id,d)  => adminAPI.toggleStatus(id, d),
  adjustBalance:     (id,d)  => adminAPI.adjustBalance(id, d),
  categories:        ()      => api.get('/admin/categories'),
  services:          p       => adminAPI.listServices(p),
  createService:     d       => adminAPI.createService(d),
  updateService:     (id,d)  => adminAPI.updateService(id, d),
  deleteService:     id      => adminAPI.deleteService(id),
  orders:            p       => adminAPI.listOrders(p),
  updateOrderStatus: (id,d)  => adminAPI.updateOrderStatus(id, d),
  providers:         ()      => adminAPI.listProviders(),
  createProvider:    d       => adminAPI.createProvider(d),
  updateProvider:    (id,d)  => adminAPI.updateProvider(id, d),
  deleteProvider:    id      => adminAPI.deleteProvider(id),
  checkProviderBal:  id      => api.post(`/admin/providers/${id}/check-balance`),
  tickets:           p       => adminAPI.listTickets(p),
  replyTicket:       (id,d)  => adminAPI.replyTicket(id, d),
  updateTicket:      (id,d)  => api.patch(`/admin/tickets/${id}/status`, d),
  settings:          ()      => adminAPI.getSettings(),
  saveSettings:      d       => adminAPI.updateSettings(d),
  coupons:           ()      => adminAPI.listCoupons(),
  createCoupon:      d       => adminAPI.createCoupon(d),
  updateCoupon:      (id,d)  => api.put(`/admin/coupons/${id}`, d),
};

export const rankAPI = {
  getDashboard:    ()       => api.get('/rank/dashboard'),
  getProjects:     p        => api.get('/rank/projects', { params: p }),
  getProject:      id       => api.get(`/rank/projects/${id}`),
  createProject:   d        => api.post('/rank/projects', d),
  updateProject:   (id,d)   => api.put(`/rank/projects/${id}`, d),
  deleteProject:   id       => api.delete(`/rank/projects/${id}`),
  runAudit:        id       => api.post(`/rank/projects/${id}/audit`),
  getReports:      p        => api.get('/rank/reports', { params: p }),
  getReport:       id       => api.get(`/rank/reports/${id}`),
  runTool:         (tool,d) => api.post(`/rank/tools/${tool}/run`, d),
  getTools:        ()       => api.get('/rank/tools'),
  getPlans:        ()       => api.get('/rank/plans'),
  checkout:        d        => api.post('/rank/checkout', d),
};

//  BioLinks 
export const biolinksAPI = {
  getPages:         p       => api.get('/biolinks/links', { params: { ...(p||{}), type: 'biolink' } }),
  getPage:          id      => api.get(`/biolinks/links/${id}`),
  createPage:       d       => api.post('/biolinks/links/biolink', d),
  updatePage:       (id,d)  => api.put(`/biolinks/links/${id}`, d),
  deletePage:       id      => api.delete(`/biolinks/links/${id}`),
  getLinks:         p       => api.get('/biolinks/links', { params: p }),
  createLink:       d       => api.post('/biolinks/links/short', d),
  updateLink:       (id,d)  => api.put(`/biolinks/links/${id}`, d),
  deleteLink:       id      => api.delete(`/biolinks/links/${id}`),
  generateQR:       d       => api.post('/biolinks/tools/qr', d),
  getLinkStats:     id      => api.get(`/biolinks/statistics/${id}`),
  getStats:         ()      => api.get('/biolinks/statistics/overview'),
};

//  Document Vault 
export const docsAPI = {
  getStats:         ()      => api.get('/docs/documents/stats'),
  getFiles:         p       => api.get('/docs/documents', { params: p }),
  uploadFile:       d       => api.post('/docs/documents/upload', d, { headers:{'Content-Type':'multipart/form-data'}}),
  deleteFile:       id      => api.delete(`/docs/documents/${id}`),
  shareFile:        (id,d)  => api.post(`/docs/documents/${id}/share`, d),
  getShareLink:     id      => api.get(`/docs/documents/${id}/share`),
  downloadFile:     id      => api.get(`/docs/documents/${id}/download`, { responseType:'blob' }),
  getFolders:       ()      => api.get('/docs/folders'),
  createFolder:     d       => api.post('/docs/folders', d),
  updateFolder:     (id,d)  => api.put(`/docs/folders/${id}`, d),
  deleteFolder:     id      => api.delete(`/docs/folders/${id}`),
  getRequests:      p       => api.get('/docs/requests', { params: p }),
  createRequest:    d       => api.post('/docs/requests', d),
  fulfillRequest:   (id,d)  => api.post(`/docs/requests/${id}/fulfill`, d),
  getNotifications: ()      => api.get('/docs/notifications'),
  markNotifRead:    id      => api.patch(`/docs/notifications/${id}/read`),
  getPublicShare:   token   => api.get(`/docs/public/documents/${token}`),
};

//  WhatsApp Marketing 
export const whatsappAPI = {
  getDashboard:     ()      => api.get('/whatsapp/dashboard'),
  // Contacts
  getContacts:      p       => api.get('/whatsapp/contacts', { params: p }),
  getContact:       id      => api.get(`/whatsapp/contacts/${id}`),
  createContact:    d       => api.post('/whatsapp/contacts', d),
  updateContact:    (id,d)  => api.put(`/whatsapp/contacts/${id}`, d),
  deleteContact:    id      => api.delete(`/whatsapp/contacts/${id}`),
  importContacts:   d       => api.post('/whatsapp/contacts/import/csv', d),
  // Campaigns
  getCampaigns:     p       => api.get('/whatsapp/campaigns', { params: p }),
  getCampaign:      id      => api.get(`/whatsapp/campaigns/${id}`),
  createCampaign:   d       => api.post('/whatsapp/campaigns', d),
  updateCampaign:   (id,d)  => api.put(`/whatsapp/campaigns/${id}`, d),
  deleteCampaign:   id      => api.delete(`/whatsapp/campaigns/${id}`),
  sendCampaign:     id      => api.post(`/whatsapp/campaigns/${id}/send`),
  pauseCampaign:    id      => api.post(`/whatsapp/campaigns/${id}/pause`),
  // Chat
  getChats:         p       => api.get('/whatsapp/chat', { params: p }),
  getChat:          id      => api.get(`/whatsapp/chat/${id}`),
  getChatMessages:  (id,p)  => api.get(`/whatsapp/chat/${id}/messages`, { params: p }),
  sendMessage:      d       => api.post('/whatsapp/send', d),
  markRead:         id      => api.patch(`/whatsapp/chat/${id}/read`),
  // Templates & Bots
  getTemplates:     ()      => api.get('/whatsapp/templates'),
  syncTemplates:    ()      => api.post('/whatsapp/templates/sync'),
  getBots:          ()      => api.get('/whatsapp/bots'),
  createBot:        d       => api.post('/whatsapp/bots/message', d),
  toggleBot:        id      => api.patch(`/whatsapp/bots/message/${id}/toggle`),
  // Canned & AI
  getCannedReplies: ()      => api.get('/whatsapp/canned'),
  createCannedReply:d       => api.post('/whatsapp/canned', d),
  getAiPrompts:     ()      => api.get('/whatsapp/ai-prompts'),
  createAiPrompt:   d       => api.post('/whatsapp/ai-prompts', d),
  // Settings
  getSettings:      ()      => api.get('/whatsapp/settings'),
  updateSettings:   d       => api.put('/whatsapp/settings', d),
};

//  Publish (BeePost - compose, schedule, autopilot) 
export const publishAPI = {
  // Posts
  getPosts:        p        => api.get('/publish/posts', { params: p }),
  getPost:         id        => api.get(`/publish/posts/${id}`),
  createPost:      d        => api.post('/publish/posts', d, d instanceof FormData ? { headers:{'Content-Type':'multipart/form-data'} } : undefined),
  updatePost:      (id,d)   => api.put(`/publish/posts/${id}`, d),
  deletePost:      id        => api.delete(`/publish/posts/${id}`),
  publishNow:      id        => api.post(`/publish/posts/${id}/publish`),
  getCalendar:     p         => api.get('/publish/posts/calendar', { params: p }),
  // Social accounts
  getAccounts:     ()        => api.get('/publish/social/accounts'),
  connectAccount:  d         => api.post('/publish/social/accounts/manual', d),
  disconnectAccount: id      => api.delete(`/publish/social/accounts/${id}`),
  // AI content
  getTemplates:    ()        => api.get('/publish/ai/templates'),
  generateText:    d         => api.post('/publish/ai/generate-text', d),
  generateImage:   d         => api.post('/publish/ai/generate-image', d),
  // Autopilot campaigns
  getCampaigns:    ()        => api.get('/publish/posts/campaigns'),
  createCampaign:  d         => api.post('/publish/posts/campaigns', d),
  updateCampaign:  (id,d)    => api.put(`/publish/posts/campaigns/${id}`, d),
  deleteCampaign:  id        => api.delete(`/publish/posts/campaigns/${id}`),
  toggleCampaign:  id         => api.patch(`/publish/posts/campaigns/${id}/toggle`),
  // Billing
  getPlans:        ()        => api.get('/publish/billing/plans'),
  checkout:        d         => api.post('/publish/billing/plans/checkout', d),
  // Profile / affiliate
  getProfile:      ()        => api.get('/publish/social/profile'),
  updateProfile:   d         => api.put('/publish/social/profile', d),
};

//  Brand AI (SocialAI - brand identities, voice, strategy) 
export const brandAPI = {
  getBrands:           ()       => api.get('/publish/brand/brands'),
  getBrand:            id       => api.get(`/publish/brand/brands/${id}`),
  createBrand:         d        => api.post('/publish/brand/brands', d),
  updateBrand:         (id,d)   => api.put(`/publish/brand/brands/${id}`, d),
  deleteBrand:         id       => api.delete(`/publish/brand/brands/${id}`),
  generateIdentities:  id       => api.post(`/publish/brand/brands/${id}/generate/identities`),
  generateAudiences:   id       => api.post(`/publish/brand/brands/${id}/generate/audiences`),
  generateVoice:       id       => api.post(`/publish/brand/brands/${id}/generate/voice`),
  generateStrategy:    id       => api.post(`/publish/brand/brands/${id}/generate/strategy`),
  generateSlogan:      id       => api.post(`/publish/brand/brands/${id}/generate/slogan`),
  generatePostContent: d        => api.post('/publish/brand/posts/generate-content', d),
  generatePostImage:   d        => api.post('/publish/brand/posts/generate-image', d),
  publishNow:          d        => api.post('/publish/brand/posts/publish-now', d),
  getPlatforms:        ()       => api.get('/publish/brand/social/platforms'),
  connectPlatform:     platform => api.get(`/publish/brand/social/connect/${platform}`),
};

//  AI Generators (AIGen - multi-modal credit-based generation) 
export const aigenAPI = {
  generate:        d        => api.post('/ai/prompts/generate', d, d instanceof FormData ? { headers:{'Content-Type':'multipart/form-data'} } : undefined),
  getHistory:      p        => api.get('/ai/prompts/history', { params: p }),
  getPrompt:       id       => api.get(`/ai/prompts/${id}`),
  deletePrompt:    id       => api.delete(`/ai/prompts/${id}`),
  // Credits
  getBalance:      ()       => api.get('/ai/credits/balance'),
  getPackages:     ()       => api.get('/ai/credits/packages'),
  purchaseCredits: d        => api.post('/ai/credits/checkout', d),
  getTransactions: p        => api.get('/ai/credits/transactions', { params: p }),
};

//  Pen AI (AI2Pen - template-driven content generation) 
export const penAPI = {
  // Auth (Pen has its own auth namespace under /pen/auth/*)
  getMe:            ()      => api.get('/pen/auth/me'),
  updateProfile:    d       => api.put('/pen/auth/profile', d),
  changePassword:   d       => api.put('/pen/auth/change-password', d),
  // Dashboard
  getDashboardStats:()      => api.get('/pen/dashboard/stats'),
  // Templates
  getGroups:        ()      => api.get('/pen/templates/groups'),
  getTemplates:     p       => api.get('/pen/templates', { params: p }),
  getTemplate:      id      => api.get(`/pen/templates/${id}`),
  // Generation
  generateText:     d       => api.post('/pen/generate/text', d),
  generateCustom:   d       => api.post('/pen/generate/custom', d),
  generateImage:    d       => api.post('/pen/generate/image', d),
  generateAudio:    d       => api.post('/pen/generate/audio', d),
  generateCode:     d       => api.post('/pen/generate/code', d),
  // Chat
  chat:             d       => api.post('/pen/chat', d),
  getChatSessions:  ()      => api.get('/pen/chat/sessions'),
  getChatSession:   id      => api.get(`/pen/chat/sessions/${id}`),
  deleteChatSession:id      => api.delete(`/pen/chat/sessions/${id}`),
  // History
  getHistory:       p       => api.get('/pen/history', { params: p }),
  getHistoryItem:   id      => api.get(`/pen/history/${id}`),
  deleteHistory:    id      => api.delete(`/pen/history/${id}`),
  renameHistory:    (id,d)  => api.put(`/pen/history/${id}/name`, d),
  // Saved docs
  getSavedDocs:     ()      => api.get('/pen/saved'),
  saveDoc:          d       => api.post('/pen/saved', d),
  deleteSavedDoc:   id      => api.delete(`/pen/saved/${id}`),
  // Billing
  getPackages:      ()      => api.get('/pen/billing/packages'),
  checkout:         d       => api.post('/pen/billing/checkout', d),
  verifyPayment:    p       => api.get('/pen/billing/verify', { params: p }),
  getMyOrders:      ()      => api.get('/pen/billing/orders'),
  // Team
  getTeamMembers:   ()      => api.get('/pen/team'),
  inviteTeamMember: d       => api.post('/pen/team/invite', d),
  updateTeamMember: (id,d)  => api.put(`/pen/team/${id}`, d),
  removeTeamMember: id      => api.delete(`/pen/team/${id}`),
};

//  Bio Pages — Admin 
export const bioAdminAPI = {
  getAnalytics:      ()      => api.get('/bio/admin/analytics'),
  getUsers:          p       => api.get('/bio/admin/users', { params: p }),
  updateUserStatus:  d       => api.put('/bio/admin/users/status', d),
  updateUser:        d       => api.put('/bio/admin/users/update', d),
  deleteUser:        id      => api.delete(`/bio/admin/users/${id}`),
  assignPlan:        d       => api.post('/bio/admin/users/assign-plan', d),
  getCampaigns:      p       => api.get('/bio/admin/campaigns', { params: p }),
  getPlans:          ()      => api.get('/bio/admin/plans'),
  createPlan:        d       => api.post('/bio/admin/plans', d),
  updatePlanStatus:  d       => api.put('/bio/admin/plans/status', d),
  deletePlan:        id      => api.delete(`/bio/admin/plans/${id}`),
  getTemplates:      ()      => api.get('/bio/admin/templates'),
  createTemplate:    d       => api.post('/bio/admin/templates', d),
  saveTemplate:      d       => api.put('/bio/admin/templates', d),
  updateTemplateStatus: d    => api.put('/bio/admin/templates/status', d),
  deleteTemplate:    id      => api.delete(`/bio/admin/templates/${id}`),
  getCategories:     ()      => api.get('/bio/admin/categories'),
  saveCategory:      d       => api.post('/bio/admin/categories', d),
  updateCategoryStatus: d    => api.put('/bio/admin/categories/status', d),
  deleteCategory:    id      => api.delete(`/bio/admin/categories/${id}`),
  getThemes:         ()      => api.get('/bio/admin/themes'),
  addTheme:          d       => api.post('/bio/admin/themes', d),
  editTheme:         d       => api.put('/bio/admin/themes', d),
  updateThemeStatus: d       => api.put('/bio/admin/themes/status', d),
  deleteTheme:       id      => api.delete(`/bio/admin/themes/${id}`),
  getSocialTypes:    ()      => api.get('/bio/admin/social-types'),
  addSocialType:     d       => api.post('/bio/admin/social-types', d),
  deleteSocialType:  id      => api.delete(`/bio/admin/social-types/${id}`),
  getSettings:       ()      => api.get('/bio/admin/settings'),
  updateSettings:    d       => api.put('/bio/admin/settings', d),
  updateEmailSettings: d     => api.put('/bio/admin/settings/email', d),
  getCoupons:        ()      => api.get('/bio/admin/coupons'),
  addCoupon:         d       => api.post('/bio/admin/coupons', d),
  updateCouponStatus:d       => api.put('/bio/admin/coupons/status', d),
  deleteCoupon:      id      => api.delete(`/bio/admin/coupons/${id}`),
  getPendingPayments:()      => api.get('/bio/admin/payments/pending'),
  updatePaymentStatus:d      => api.put('/bio/admin/payments/status', d),
};

//  BioLinks — Admin 
export const blAdminAPI = {
  getStats:          ()      => api.get('/biolinks/admin/stats'),
  getUsers:          p       => api.get('/biolinks/admin/users', { params: p }),
  getUser:           id      => api.get(`/biolinks/admin/users/${id}`),
  createUser:        d       => api.post('/biolinks/admin/users', d),
  updateUser:        (id,d)  => api.put(`/biolinks/admin/users/${id}`, d),
  deleteUser:        id      => api.delete(`/biolinks/admin/users/${id}`),
  updateUserStatus:  (id,d)  => api.patch(`/biolinks/admin/users/${id}/status`, d),
  assignPlan:        (id,d)  => api.post(`/biolinks/admin/users/${id}/assign-plan`, d),
  getPlans:          ()      => api.get('/biolinks/admin/plans'),
  createPlan:        d       => api.post('/biolinks/admin/plans', d),
  updatePlan:        (id,d)  => api.put(`/biolinks/admin/plans/${id}`, d),
  deletePlan:        id      => api.delete(`/biolinks/admin/plans/${id}`),
  getThemes:         ()      => api.get('/biolinks/admin/themes'),
  createTheme:       d       => api.post('/biolinks/admin/themes', d),
  updateTheme:       (id,d)  => api.put(`/biolinks/admin/themes/${id}`, d),
  deleteTheme:       id      => api.delete(`/biolinks/admin/themes/${id}`),
  getTemplates:      ()      => api.get('/biolinks/admin/templates'),
  createTemplate:    d       => api.post('/biolinks/admin/templates', d),
  updateTemplate:    (id,d)  => api.put(`/biolinks/admin/templates/${id}`, d),
  deleteTemplate:    id      => api.delete(`/biolinks/admin/templates/${id}`),
  getTemplateCategories: ()  => api.get('/biolinks/admin/template-categories'),
  createTemplateCategory: d  => api.post('/biolinks/admin/template-categories', d),
  deleteTemplateCategory: id => api.delete(`/biolinks/admin/template-categories/${id}`),
  getSettings:       ()      => api.get('/biolinks/admin/settings'),
  updateSettings:    d       => api.put('/biolinks/admin/settings', d),
  getPayments:       p       => api.get('/biolinks/admin/payments', { params: p }),
  getCodes:          ()      => api.get('/biolinks/admin/codes'),
  createCode:        d       => api.post('/biolinks/admin/codes', d),
  updateCode:        (id,d)  => api.put(`/biolinks/admin/codes/${id}`, d),
  deleteCode:        id      => api.delete(`/biolinks/admin/codes/${id}`),
  getDomains:        ()      => api.get('/biolinks/admin/domains'),
  createDomain:      d       => api.post('/biolinks/admin/domains', d),
  deleteDomain:      id      => api.delete(`/biolinks/admin/domains/${id}`),
};

//  Pen AI — Admin 
export const penAdminAPI = {
  getStats:          ()      => api.get('/pen/admin/stats'),
  getUsers:          p       => api.get('/pen/admin/users', { params: p }),
  createUser:        d       => api.post('/pen/admin/users', d),
  updateUser:        (id,d)  => api.put(`/pen/admin/users/${id}`, d),
  deleteUser:        id      => api.delete(`/pen/admin/users/${id}`),
  updateUserStatus:  (id,d)  => api.patch(`/pen/admin/users/${id}/status`, d),
  assignPackage:     (id,d)  => api.post(`/pen/admin/users/${id}/package`, d),
  addCredits:        (id,d)  => api.post(`/pen/admin/users/${id}/credits`, d),
  getPackages:       ()      => api.get('/pen/admin/packages'),
  createPackage:     d       => api.post('/pen/admin/packages', d),
  updatePackage:     (id,d)  => api.put(`/pen/admin/packages/${id}`, d),
  deletePackage:     id      => api.delete(`/pen/admin/packages/${id}`),
  getGroups:         ()      => api.get('/pen/admin/groups'),
  createGroup:       d       => api.post('/pen/admin/groups', d),
  updateGroup:       (id,d)  => api.put(`/pen/admin/groups/${id}`, d),
  deleteGroup:       id      => api.delete(`/pen/admin/groups/${id}`),
  getTemplates:      ()      => api.get('/pen/admin/templates'),
  createTemplate:    d       => api.post('/pen/admin/templates', d),
  updateTemplate:    (id,d)  => api.put(`/pen/admin/templates/${id}`, d),
  deleteTemplate:    id      => api.delete(`/pen/admin/templates/${id}`),
  getSettings:       ()      => api.get('/pen/admin/settings'),
  updateSettings:    d       => api.put('/pen/admin/settings', d),
  getOrders:         p       => api.get('/pen/admin/orders', { params: p }),
};

export default api;

//  ChatFlow — Admin 
export const chatflowAdminAPI = {
  getStats:          ()      => api.get('/chatflow/admin/stats'),
  getTenants:        p       => api.get('/chatflow/admin/tenants', { params: p }),
  suspendTenant:     (id,d)  => api.put(`/chatflow/admin/tenants/${id}/suspend`, d),
};

//  Design Studio — Admin 
export const designAdminAPI = {
  getStats:          ()      => api.get('/design/admin/stats'),
  createTemplate:    d       => api.post('/design/templates', d),
  updateTemplate:    (id,d)  => api.put(`/design/templates/${id}`, d),
  deleteTemplate:    id      => api.delete(`/design/templates/${id}`),
};

//  SiteSpy — Admin 
export const sitespyAdminAPI = {
  getStats:          ()      => api.get('/sitespy/admin/stats'),
};

//  StackPosts — Admin 
export const stackpostsAdminAPI = {
  getStats:          ()      => api.get('/sp/admin/stats'),
  getTickets:        p       => api.get('/sp/admin/tickets', { params: p }),
  replyTicket:       (id,d)  => api.post(`/sp/admin/tickets/${id}/reply`, d),
  getWithdrawals:    p       => api.get('/sp/admin/withdrawals', { params: p }),
  updateWithdrawal:  (id,d)  => api.put(`/sp/admin/withdrawals/${id}`, d),
  createBlog:        d       => api.post('/sp/admin/blog', d),
  updateBlog:        (id,d)  => api.put(`/sp/admin/blog/${id}`, d),
  deleteBlog:        id      => api.delete(`/sp/admin/blog/${id}`),
  getAiTemplates:    ()      => api.get('/sp/admin/ai-templates'),
  createAiTemplate:  d       => api.post('/sp/admin/ai-templates', d),
};

//  Teleman — Admin 
export const telemanAdminAPI = {
  getStats:          ()      => api.get('/teleman/admin/stats'),
};

//  ToolsAI — Admin 
export const toolsaiAdminAPI = {
  getStats:          ()      => api.get('/toolsai/admin/stats'),
  createBlog:        d       => api.post('/toolsai/admin/blog', d),
  updateBlog:        (id,d)  => api.put(`/toolsai/admin/blog/${id}`, d),
  deleteBlog:        id      => api.delete(`/toolsai/admin/blog/${id}`),
  createTemplate:    d       => api.post('/toolsai/admin/templates', d),
  updateTemplate:    (id,d)  => api.put(`/toolsai/admin/templates/${id}`, d),
};

//  WhatsML — Admin 
export const whatsmlAdminAPI = {
  getStats:          ()      => api.get('/whatsml/admin/stats'),
};

//  ZAM Nexus — Admin 
export const zamAdminAPI = {
  getStats:          ()      => api.get('/zam/admin/stats'),
};

//  SEO Manager — Admin 
export const seoManagerAdminAPI = {
  getStats:          ()      => api.get('/seo-manager/admin/stats'),
};

//  WhatsApp — global settings (admin) 
export const whatsappAdminAPI = {
  getSettings:       ()      => api.get('/whatsapp/settings'),
  updateSettings:    d       => api.put('/whatsapp/settings', d),
};

//  Design Studio (PixaGuru) 
export const designAPI = {
  getProjects:      p        => api.get('/design/projects', { params: p }),
  getProject:       id       => api.get(`/design/projects/${id}`),
  createProject:    d        => api.post('/design/projects', d),
  updateProject:    (id,d)   => api.put(`/design/projects/${id}`, d),
  deleteProject:    id       => api.delete(`/design/projects/${id}`),
  duplicateProject: id       => api.post(`/design/projects/${id}/duplicate`),
  saveThumbnail:    (id,d)   => api.post(`/design/projects/${id}/thumbnail`, d),
  generateShare:    id       => api.post(`/design/projects/${id}/share`),
  getShared:        token    => api.get(`/design/share/${token}`),
  getTemplates:     p        => api.get('/design/templates', { params: p }),
  getTemplate:      id       => api.get(`/design/templates/${id}`),
  useTemplate:      id       => api.post(`/design/templates/${id}/use`),
  getMedia:         p        => api.get('/design/media', { params: p }),
  uploadMedia:      d        => api.post('/design/media/upload', d, { headers:{'Content-Type':'multipart/form-data'} }),
  deleteMedia:      id       => api.delete(`/design/media/${id}`),
  removeBg:         d        => api.post('/design/media/remove-bg', d),
  searchUnsplash:   p        => api.get('/design/media/unsplash', { params: p }),
  adminStats:       ()       => api.get('/design/admin/stats'),
};

//  Mailer / XSender 
export const mailerAPI = {
  // Groups
  getGroups:         ()       => api.get('/mailer/groups'),
  createGroup:       d        => api.post('/mailer/groups', d),
  updateGroup:       (id,d)   => api.put(`/mailer/groups/${id}`, d),
  deleteGroup:       id       => api.delete(`/mailer/groups/${id}`),
  // Contacts
  getContacts:       p        => api.get('/mailer/contacts', { params: p }),
  createContact:     d        => api.post('/mailer/contacts', d),
  updateContact:     (id,d)   => api.put(`/mailer/contacts/${id}`, d),
  deleteContact:     id       => api.delete(`/mailer/contacts/${id}`),
  importContacts:    d        => api.post('/mailer/contacts/import', d, { headers:{'Content-Type':'multipart/form-data'} }),
  // Templates
  getTemplates:      p        => api.get('/mailer/templates', { params: p }),
  createTemplate:    d        => api.post('/mailer/templates', d),
  updateTemplate:    (id,d)   => api.put(`/mailer/templates/${id}`, d),
  deleteTemplate:    id       => api.delete(`/mailer/templates/${id}`),
  // Campaigns
  getCampaigns:      p        => api.get('/mailer/campaigns', { params: p }),
  getCampaign:       id       => api.get(`/mailer/campaigns/${id}`),
  createCampaign:    d        => api.post('/mailer/campaigns', d),
  updateCampaign:    (id,d)   => api.put(`/mailer/campaigns/${id}`, d),
  deleteCampaign:    id       => api.delete(`/mailer/campaigns/${id}`),
  sendCampaign:      id       => api.post(`/mailer/campaigns/${id}/send`),
  pauseCampaign:     id       => api.post(`/mailer/campaigns/${id}/pause`),
  // Analytics & Settings
  getAnalytics:      ()       => api.get('/mailer/analytics'),
  getSettings:       ()       => api.get('/mailer/settings'),
  updateSettings:    d        => api.put('/mailer/settings', d),
};

//  SocialVibe 
export const socialvibeAPI = {
  getPlans:          ()       => api.get('/socialvibe/plans'),
  getAccounts:       ()       => api.get('/socialvibe/accounts'),
  connectAccount:    d        => api.post('/socialvibe/accounts', d),
  disconnectAccount: id       => api.delete(`/socialvibe/accounts/${id}`),
  getPosts:          p        => api.get('/socialvibe/posts', { params: p }),
  createPost:        d        => api.post('/socialvibe/posts', d),
  updatePost:        (id,d)   => api.put(`/socialvibe/posts/${id}`, d),
  deletePost:        id       => api.delete(`/socialvibe/posts/${id}`),
  aiGenerate:        d        => api.post('/socialvibe/ai/generate', d),
  aiRewrite:         d        => api.post('/socialvibe/ai/rewrite', d),
  aiHashtags:        d        => api.post('/socialvibe/ai/hashtags', d),
  getTemplates:      ()       => api.get('/socialvibe/templates'),
  createTemplate:    d        => api.post('/socialvibe/templates', d),
  deleteTemplate:    id       => api.delete(`/socialvibe/templates/${id}`),
  getTeam:           ()       => api.get('/socialvibe/team'),
  inviteMember:      d        => api.post('/socialvibe/team/invite', d),
  removeMember:      id       => api.delete(`/socialvibe/team/${id}`),
  getTickets:        ()       => api.get('/socialvibe/tickets'),
  createTicket:      d        => api.post('/socialvibe/tickets', d),
  replyTicket:       (id,d)   => api.post(`/socialvibe/tickets/${id}/reply`, d),
  closeTicket:       id       => api.post(`/socialvibe/tickets/${id}/close`),
};

//  StackPosts 
export const stackpostsAPI = {
  getTeams:          ()       => api.get('/sp/teams'),
  createTeam:        d        => api.post('/sp/teams', d),
  getAccounts:       teamId   => api.get(`/sp/teams/${teamId}/accounts`),
  connectAccount:    (teamId,d) => api.post(`/sp/teams/${teamId}/accounts`, d),
  disconnectAccount: (teamId,id) => api.delete(`/sp/teams/${teamId}/accounts/${id}`),
  getPosts:          (teamId,p) => api.get(`/sp/teams/${teamId}/posts`, { params: p }),
  createPost:        (teamId,d) => api.post(`/sp/teams/${teamId}/posts`, d),
  updatePost:        (teamId,id,d) => api.put(`/sp/teams/${teamId}/posts/${id}`, d),
  deletePost:        (teamId,id) => api.delete(`/sp/teams/${teamId}/posts/${id}`),
  duplicatePost:     (teamId,id) => api.post(`/sp/teams/${teamId}/posts/${id}/duplicate`),
  aiGenerate:        d        => api.post('/sp/ai/generate', d),
  aiHashtags:        d        => api.post('/sp/ai/hashtags', d),
  getFeeds:          teamId   => api.get(`/sp/teams/${teamId}/feeds`),
  createFeed:        (teamId,d) => api.post(`/sp/teams/${teamId}/feeds`, d),
  deleteFeed:        (teamId,id) => api.delete(`/sp/teams/${teamId}/feeds/${id}`),
  getCampaigns:      teamId   => api.get(`/sp/teams/${teamId}/campaigns`),
  createCampaign:    (teamId,d) => api.post(`/sp/teams/${teamId}/campaigns`, d),
  getMedia:          (teamId,p) => api.get(`/sp/teams/${teamId}/media`, { params: p }),
  uploadMedia:       (teamId,d) => api.post(`/sp/teams/${teamId}/media/upload`, d, { headers:{'Content-Type':'multipart/form-data'} }),
  getAnalytics:      teamId   => api.get(`/sp/teams/${teamId}/analytics`),
  getTickets:        p        => api.get('/sp/support', { params: p }),
  createTicket:      d        => api.post('/sp/support', d),
  replyTicket:       (id,d)   => api.post(`/sp/support/${id}/reply`, d),
  getAffiliateStats: ()       => api.get('/sp/affiliate'),
  requestWithdrawal: d        => api.post('/sp/affiliate/withdraw', d),
  getBlogPosts:      p        => api.get('/sp/blog', { params: p }),
  getBlogPost:       slug     => api.get(`/sp/blog/${slug}`),
};

//  ChatFlow 
export const chatflowAPI = {
  getTenant:         ()       => api.get('/chatflow/tenant'),
  updateTenant:      d        => api.put('/chatflow/tenant', d),
  getPages:          ()       => api.get('/chatflow/pages'),
  createPage:        d        => api.post('/chatflow/pages', d),
  updatePage:        (id,d)   => api.put(`/chatflow/pages/${id}`, d),
  deletePage:        id       => api.delete(`/chatflow/pages/${id}`),
  getSubscribers:    p        => api.get('/chatflow/subscribers', { params: p }),
  updateSubscriber:  (id,d)   => api.put(`/chatflow/subscribers/${id}`, d),
  getConversation:   subId    => api.get(`/chatflow/conversation/${subId}`),
  sendMessage:       (subId,d) => api.post(`/chatflow/conversation/${subId}/send`, d),
  getRules:          ()       => api.get('/chatflow/rules'),
  createRule:        d        => api.post('/chatflow/rules', d),
  updateRule:        (id,d)   => api.put(`/chatflow/rules/${id}`, d),
  deleteRule:        id       => api.delete(`/chatflow/rules/${id}`),
  getSequences:      ()       => api.get('/chatflow/sequences'),
  createSequence:    d        => api.post('/chatflow/sequences', d),
  updateSequence:    (id,d)   => api.put(`/chatflow/sequences/${id}`, d),
  deleteSequence:    id       => api.delete(`/chatflow/sequences/${id}`),
  enrollSubscriber:  (id,d)   => api.post(`/chatflow/sequences/${id}/enroll`, d),
  getBroadcasts:     ()       => api.get('/chatflow/broadcasts'),
  createBroadcast:   d        => api.post('/chatflow/broadcasts', d),
  sendBroadcast:     id       => api.post(`/chatflow/broadcasts/${id}/send`),
  getCategories:     ()       => api.get('/chatflow/categories'),
  createCategory:    d        => api.post('/chatflow/categories', d),
  getProducts:       ()       => api.get('/chatflow/products'),
  createProduct:     d        => api.post('/chatflow/products', d),
  updateProduct:     (id,d)   => api.put(`/chatflow/products/${id}`, d),
  deleteProduct:     id       => api.delete(`/chatflow/products/${id}`),
  getOrders:         p        => api.get('/chatflow/orders', { params: p }),
  updateOrderStatus: (id,d)   => api.put(`/chatflow/orders/${id}/status`, d),
};

//  Teleman 
export const telemanAPI = {
  getPlans:          ()       => api.get('/teleman/plans'),
  getTenant:         ()       => api.get('/teleman/tenant'),
  getDepts:          ()       => api.get('/teleman/departments'),
  createDept:        d        => api.post('/teleman/departments', d),
  updateDept:        (id,d)   => api.put(`/teleman/departments/${id}`, d),
  deleteDept:        id       => api.delete(`/teleman/departments/${id}`),
  getProviders:      ()       => api.get('/teleman/providers'),
  createProvider:    d        => api.post('/teleman/providers', d),
  testProvider:      id       => api.post(`/teleman/providers/${id}/test`),
  deleteProvider:    id       => api.delete(`/teleman/providers/${id}`),
  getVoiceToken:     ()       => api.get('/teleman/voice/token'),
  getContacts:       p        => api.get('/teleman/contacts', { params: p }),
  createContact:     d        => api.post('/teleman/contacts', d),
  updateContact:     (id,d)   => api.put(`/teleman/contacts/${id}`, d),
  deleteContact:     id       => api.delete(`/teleman/contacts/${id}`),
  importContacts:    d        => api.post('/teleman/contacts/import', d, { headers:{'Content-Type':'multipart/form-data'} }),
  getScripts:        ()       => api.get('/teleman/scripts'),
  createScript:      d        => api.post('/teleman/scripts', d),
  updateScript:      (id,d)   => api.put(`/teleman/scripts/${id}`, d),
  deleteScript:      id       => api.delete(`/teleman/scripts/${id}`),
  getCampaigns:      ()       => api.get('/teleman/campaigns'),
  createCampaign:    d        => api.post('/teleman/campaigns', d),
  setCampaignStatus: (id,d)   => api.put(`/teleman/campaigns/${id}/status`, d),
  addContacts:       (id,d)   => api.post(`/teleman/campaigns/${id}/contacts`, d),
  getCalls:          p        => api.get('/teleman/calls', { params: p }),
  sendSms:           d        => api.post('/teleman/sms/send', d),
  getTickets:        ()       => api.get('/teleman/tickets'),
  createTicket:      d        => api.post('/teleman/tickets', d),
  replyTicket:       (id,d)   => api.post(`/teleman/tickets/${id}/reply`, d),
};

//  WhatsML 
export const whatsmlAPI = {
  getWorkspaces:      ()      => api.get('/whatsml/workspaces'),
  createWorkspace:    d       => api.post('/whatsml/workspaces', d),
  getCloudApps:       ()      => api.get('/whatsml/cloud-apps'),
  createCloudApp:     d       => api.post('/whatsml/cloud-apps', d),
  updateCloudApp:     (id,d)  => api.put(`/whatsml/cloud-apps/${id}`, d),
  deleteCloudApp:     id      => api.delete(`/whatsml/cloud-apps/${id}`),
  getWebApps:         ()      => api.get('/whatsml/web-apps'),
  createWebApp:       d       => api.post('/whatsml/web-apps', d),
  getQrCode:          id      => api.get(`/whatsml/web-apps/${id}/qr`),
  deleteWebApp:       id      => api.delete(`/whatsml/web-apps/${id}`),
  getCustomers:       p       => api.get('/whatsml/customers', { params: p }),
  createCustomer:     d       => api.post('/whatsml/customers', d),
  updateCustomer:     (id,d)  => api.put(`/whatsml/customers/${id}`, d),
  deleteCustomer:     id      => api.delete(`/whatsml/customers/${id}`),
  importCustomers:    d       => api.post('/whatsml/customers/import', d, { headers:{'Content-Type':'multipart/form-data'} }),
  getGroups:          ()      => api.get('/whatsml/groups'),
  createGroup:        d       => api.post('/whatsml/groups', d),
  deleteGroup:        id      => api.delete(`/whatsml/groups/${id}`),
  getConversations:   p       => api.get('/whatsml/conversations', { params: p }),
  getMessages:        (id,p)  => api.get(`/whatsml/conversations/${id}/messages`, { params: p }),
  sendMessage:        (id,d)  => api.post(`/whatsml/conversations/${id}/send`, d),
  suggestReply:       id      => api.post(`/whatsml/conversations/${id}/suggest`),
  getCampaigns:       ()      => api.get('/whatsml/campaigns'),
  createCampaign:     d       => api.post('/whatsml/campaigns', d),
  pauseCampaign:      id      => api.post(`/whatsml/campaigns/${id}/pause`),
  resumeCampaign:     id      => api.post(`/whatsml/campaigns/${id}/resume`),
  getBots:            ()      => api.get('/whatsml/bots'),
  createBot:          d       => api.post('/whatsml/bots', d),
  updateBot:          (id,d)  => api.put(`/whatsml/bots/${id}`, d),
  deleteBot:          id      => api.delete(`/whatsml/bots/${id}`),
  getTraining:        ()      => api.get('/whatsml/training'),
  createTraining:     d       => api.post('/whatsml/training', d),
  deleteTraining:     id      => api.delete(`/whatsml/training/${id}`),
  getScanJobs:        ()      => api.get('/whatsml/scanner'),
  createScanJob:      d       => api.post('/whatsml/scanner', d),
  getScanJob:         id      => api.get(`/whatsml/scanner/${id}`),
  getScrapeJobs:      ()      => api.get('/whatsml/scrape'),
  createScrapeJob:    d       => api.post('/whatsml/scrape', d),
  getScrapeResults:   (id,p)  => api.get(`/whatsml/scrape/${id}/results`, { params: p }),
  importScraped:      d       => api.post('/whatsml/scrape/import', d),
};

//  ToolsAI 
export const toolsaiAPI = {
  getPlans:          ()       => api.get('/toolsai/plans'),
  getCategories:     ()       => api.get('/toolsai/categories'),
  getTemplates:      p        => api.get('/toolsai/templates', { params: p }),
  getTemplate:       slug     => api.get(`/toolsai/templates/${slug}`),
  generateCode:      d        => api.post('/toolsai/generate/code', d, { responseType:'stream' }),
  generateImage:     d        => api.post('/toolsai/generate/image', d),
  generateSpeech:    d        => api.post('/toolsai/generate/speech', d),
  transcribe:        d        => api.post('/toolsai/generate/transcribe', d, { headers:{'Content-Type':'multipart/form-data'} }),
  getConversations:  ()       => api.get('/toolsai/conversations'),
  createConversation:d        => api.post('/toolsai/conversations', d),
  chatMessage:       (id,d)   => api.post(`/toolsai/conversations/${id}/chat`, d),
  deleteConversation:id       => api.delete(`/toolsai/conversations/${id}`),
  getDocs:           p        => api.get('/toolsai/documents', { params: p }),
  updateDoc:         (id,d)   => api.put(`/toolsai/documents/${id}`, d),
  deleteDoc:         id       => api.delete(`/toolsai/documents/${id}`),
  getTickets:        ()       => api.get('/toolsai/tickets'),
  createTicket:      d        => api.post('/toolsai/tickets', d),
  replyTicket:       (id,d)   => api.post(`/toolsai/tickets/${id}/reply`, d),
  getBlogPosts:      p        => api.get('/toolsai/blog', { params: p }),
  getBlogPost:       slug     => api.get(`/toolsai/blog/${slug}`),
};

//  SiteSpy 
export const sitespyAPI = {
  getPlans:          ()       => api.get('/sitespy/plans'),
  getWebsites:       ()       => api.get('/sitespy/websites'),
  createWebsite:     d        => api.post('/sitespy/websites', d),
  deleteWebsite:     id       => api.delete(`/sitespy/websites/${id}`),
  getAnalytics:      (id,p)   => api.get(`/sitespy/websites/${id}/analytics`, { params: p }),
  getUrls:           p        => api.get('/sitespy/urls', { params: p }),
  createShortUrl:    d        => api.post('/sitespy/urls', d),
  deleteUrl:         id       => api.delete(`/sitespy/urls/${id}`),
  whoisLookup:       d        => api.post('/sitespy/whois', d),
  dnsLookup:         d        => api.post('/sitespy/dns', d),
  securityScan:      d        => api.post('/sitespy/security-scan', d),
  getKeywords:       ()       => api.get('/sitespy/keywords'),
  addKeyword:        d        => api.post('/sitespy/keywords', d),
  deleteKeyword:     id       => api.delete(`/sitespy/keywords/${id}`),
};

//  ZAM Nexus 
export const zamAPI = {
  getSeoTools:       ()       => api.get('/zam/seo/tools'),
  runSeoTool:        d        => api.post('/zam/seo/run', d),
  getSeoHistory:     p        => api.get('/zam/seo/history', { params: p }),
  getContacts:       p        => api.get('/zam/contacts', { params: p }),
  getContact:        id       => api.get(`/zam/contacts/${id}`),
  createContact:     d        => api.post('/zam/contacts', d),
  updateContact:     (id,d)   => api.put(`/zam/contacts/${id}`, d),
  deleteContact:     id       => api.delete(`/zam/contacts/${id}`),
  bulkDelete:        d        => api.post('/zam/contacts/bulk-delete', d),
  importContacts:    d        => api.post('/zam/contacts/import', d, { headers:{'Content-Type':'multipart/form-data'} }),
  exportContacts:    d        => api.get('/zam/contacts/export', { params: d, responseType:'blob' }),
  enrichContact:     id       => api.post(`/zam/contacts/${id}/enrich`),
  findDuplicates:    ()       => api.get('/zam/contacts/duplicates'),
  mergeContacts:     d        => api.post('/zam/contacts/merge', d),
  getNotes:          cId      => api.get(`/zam/contacts/${cId}/notes`),
  createNote:        (cId,d)  => api.post(`/zam/contacts/${cId}/notes`, d),
  deleteNote:        (cId,nId)=> api.delete(`/zam/contacts/${cId}/notes/${nId}`),
  getLeadSearches:   ()       => api.get('/zam/leads/searches'),
  createLeadSearch:  d        => api.post('/zam/leads/searches', d),
  getLeads:          p        => api.get('/zam/leads', { params: p }),
  importLeads:       d        => api.post('/zam/leads/import-contacts', d),
  exportLeads:       d        => api.post('/zam/leads/export', d, { responseType:'blob' }),
  getAssets:         p        => api.get('/zam/assets', { params: p }),
  uploadAsset:       d        => api.post('/zam/assets/upload', d, { headers:{'Content-Type':'multipart/form-data'} }),
  deleteAsset:       id       => api.delete(`/zam/assets/${id}`),
};

//  SEO Manager 
export const seoManagerAPI = {
  getPages:          p        => api.get('/seo-manager', { params: p }),
  getPage:           id       => api.get(`/seo-manager/${id}`),
  createPage:        d        => api.post('/seo-manager', d),
  updatePage:        (id,d)   => api.put(`/seo-manager/${id}`, d),
  deletePage:        id       => api.delete(`/seo-manager/${id}`),
  preview:           d        => api.post('/seo-manager/preview', d),
  generateTags:      slug     => api.get(`/seo-manager/generate/${slug}`),
  auditPage:         d        => api.post('/seo-manager/audit', d),
  bulkImport:        d        => api.post('/seo-manager/import/json', d),
  csvImport:         d        => api.post('/seo-manager/import/csv', d, { headers:{'Content-Type':'multipart/form-data'} }),
};

//  BeePost Affiliate / Wallet 
export const affiliateAPI = {
  getStats:          ()       => api.get('/publish/billing/affiliate'),
  generateCode:      ()       => api.post('/publish/billing/affiliate/generate-code'),
  getWallet:         p        => api.get('/publish/billing/wallet', { params: p }),
  depositToWallet:   d        => api.post('/publish/billing/wallet/deposit', d),
  getWithdrawals:    ()       => api.get('/publish/billing/wallet/withdrawals'),
  requestWithdrawal: d        => api.post('/publish/billing/wallet/withdrawals', d),
};

//  Module aliases (legacy screen imports) 

// SMM
export const servicesApi = {
  grouped: p => api.get('/smm/services', { params: p }),
  flat:    p => api.get('/smm/services/flat', { params: p }),
  get:     id => api.get(`/smm/services/${id}`),
};
export const ordersApi = {
  place:  d => api.post('/smm/orders', d),
  mass:   d => api.post('/smm/orders/mass', d),
  mine:   p => api.get('/smm/orders/mine', { params: p }),
  get:    id => api.get(`/smm/orders/${id}`),
  refill: id => api.post(`/smm/orders/${id}/refill`),
};
export const ticketsApi = {
  list:   p => api.get('/smm/tickets', { params: p }),
  create: d => api.post('/smm/tickets', d),
  get:    id => api.get(`/smm/tickets/${id}`),
  reply:  (id, d) => api.post(`/smm/tickets/${id}/reply`, d),
  close:  id => api.patch(`/smm/tickets/${id}/close`),
};
export const fundsApi = {
  methods:        () => api.get('/smm/add-funds/methods'),
  validateCoupon: d => api.post('/smm/add-funds/validate-coupon', d),
  manual:         d => api.post('/smm/add-funds/manual', d),
  adminPending:   () => api.get('/smm/add-funds/admin/pending'),
  adminApprove:   id => api.post(`/smm/add-funds/admin/${id}/approve`),
  adminReject:    (id, d) => api.post(`/smm/add-funds/admin/${id}/reject`, d),
};
export const profileApi = {
  get:               () => api.get('/smm/profile'),
  update:            d => api.patch('/smm/profile', d),
  regenerateApiKey:  () => api.post('/smm/profile/regenerate-api-key'),
};
export const transactionsApi = { list: p => api.get('/smm/transactions', { params: p }) };
export const subscriptionsApi = {
  list:   p  => api.get('/smm/subscriptions', { params: p }),
  pause:  id => api.patch(`/smm/subscriptions/${id}/pause`),
  resume: id => api.patch(`/smm/subscriptions/${id}/resume`),
};

// WhatsApp
export const dashboardApi = { stats: () => api.get('/whatsapp/dashboard') };
export const templatesApi = {
  list:   p  => api.get('/whatsapp/templates', { params: p }),
  sync:   d  => api.post('/whatsapp/templates/sync', d),
  delete: id => api.delete(`/whatsapp/templates/${id}`),
};
export const botsApi = {
  all:            () => api.get('/whatsapp/bots'),
  createMsgBot:   d => api.post('/whatsapp/bots/message', d),
  updateMsgBot:   (id, d) => api.put(`/whatsapp/bots/message/${id}`, d),
  deleteMsgBot:   id => api.delete(`/whatsapp/bots/message/${id}`),
  toggleMsgBot:   id => api.patch(`/whatsapp/bots/message/${id}/toggle`),
  createTplBot:   d => api.post('/whatsapp/bots/template', d),
  updateTplBot:   (id, d) => api.put(`/whatsapp/bots/template/${id}`, d),
  deleteTplBot:   id => api.delete(`/whatsapp/bots/template/${id}`),
  toggleTplBot:   id => api.patch(`/whatsapp/bots/template/${id}/toggle`),
};
export const cannedApi = {
  list:   () => api.get('/whatsapp/canned'),
  create: d => api.post('/whatsapp/canned', d),
  update: (id, d) => api.put(`/whatsapp/canned/${id}`, d),
  delete: id => api.delete(`/whatsapp/canned/${id}`),
};
export const aiPromptsApi = {
  list:   () => api.get('/whatsapp/ai-prompts'),
  create: d => api.post('/whatsapp/ai-prompts', d),
  update: (id, d) => api.put(`/whatsapp/ai-prompts/${id}`, d),
  delete: id => api.delete(`/whatsapp/ai-prompts/${id}`),
};
export const settingsApi = {
  get:         () => api.get('/whatsapp/settings'),
  save:        d => api.put('/whatsapp/settings', d),
  tokens:      () => api.get('/whatsml/cloud-apps'),
  createToken: d => api.post('/whatsml/cloud-apps', d),
  deleteToken: id => api.delete(`/whatsml/cloud-apps/${id}`),
};
export const chatApi = {
  list:         p => api.get('/whatsml/conversations', { params: p }),
  messages:     (id, p) => api.get(`/whatsml/conversations/${id}/messages`, { params: p }),
  send:         (id, d) => api.post(`/whatsml/conversations/${id}/send`, d),
  sendMedia:    (id, d) => api.post(`/whatsml/conversations/${id}/send`, d),
  sendTemplate: (id, d) => api.post(`/whatsml/conversations/${id}/send`, { ...d, type: 'template' }),
  aiReply:      (id, d) => api.post(`/whatsml/conversations/${id}/suggest`, d),
  toggleAi:     (id, d) => api.post(`/whatsml/conversations/${id}/suggest`, { ...d, toggle: true }),
  stopBot:      (id) => api.post(`/whatsml/conversations/${id}/suggest`, { stopBot: true }),
};
export const contactsApi = {
  list:       p => api.get('/whatsml/customers', { params: p }),
  get:        id => api.get('/whatsml/customers', { params: { id } }),
  create:     d => api.post('/whatsml/customers', d),
  update:     (id, d) => api.put(`/whatsml/customers/${id}`, d),
  delete:     id => api.delete(`/whatsml/customers/${id}`),
  importCsv:  d => api.post('/whatsml/customers/import', d),
  statuses:   () => api.get('/whatsml/groups'),
  addNote:    (id, d) => api.put(`/whatsml/customers/${id}`, d),
  deleteNote: (id, d) => api.put(`/whatsml/customers/${id}`, d),
};
export const campaignsApi = {
  list:    p => api.get('/whatsml/campaigns', { params: p }),
  get:     id => api.get('/whatsml/campaigns', { params: { id } }),
  details: id => api.get('/whatsml/campaigns', { params: { id } }),
  create:  d => api.post('/whatsml/campaigns', d),
  pause:   id => api.post(`/whatsml/campaigns/${id}/pause`),
  resume:  id => api.post(`/whatsml/campaigns/${id}/resume`),
  retry:   id => api.post(`/whatsml/campaigns/${id}/resume`),
  delete:  id => api.delete(`/whatsml/campaigns/${id}`),
};
export const usersApi = {
  list:   p => api.get('/admin/users', { params: p }),
  create: d => api.post('/admin/users', d),
  update: (id, d) => api.put(`/admin/users/${id}`, d),
  delete: id => api.delete(`/admin/users/${id}`),
  toggle: id => api.patch(`/admin/users/${id}/toggle`),
};

// Social (campaigns / notifications)
export const campaignAPI = {
  list:         p => api.get('/social/campaigns', { params: p }),
  getOne:       id => api.get(`/social/campaigns/${id}`),
  create:       d => api.post('/social/campaigns', d),
  update:       (id, d) => api.put(`/social/campaigns/${id}`, d),
  remove:       id => api.delete(`/social/campaigns/${id}`),
  toggle:       id => api.patch(`/social/campaigns/${id}/toggle`),
  getPixelCode: id => api.get(`/social/campaigns/${id}/pixel-code`),
  stats:        id => api.get(`/social/campaigns/${id}/stats`),
};
export const notificationAPI = {
  list:   cid => api.get(`/social/campaigns/${cid}/notifications`),
  getOne: (cid, id) => api.get(`/social/campaigns/${cid}/notifications/${id}`),
  create: (cid, d) => api.post(`/social/campaigns/${cid}/notifications`, d),
  update: (cid, id, d) => api.put(`/social/campaigns/${cid}/notifications/${id}`, d),
  remove: (cid, id) => api.delete(`/social/campaigns/${cid}/notifications/${id}`),
  toggle: (cid, id) => api.patch(`/social/campaigns/${cid}/notifications/${id}/toggle`),
};

//  Workspace account (topbar: notifications, profile, avatar upload) 
export const accountAPI = {
  overview:          () => api.get('/account/overview'),
  me:                () => api.get('/account/me'),
  updateProfile:     d  => api.put('/account/profile', d),
  notifications:     p  => api.get('/account/notifications', { params: p }),
  markNotifRead:     id => api.patch(`/account/notifications/${id}/read`),
  markAllNotifsRead: () => api.post('/account/notifications/read-all'),
  deleteNotif:       id => api.delete(`/account/notifications/${id}`),
  uploadAvatar:      file => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.post('/account/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  removeAvatar:      () => api.delete('/account/avatar'),
};

export const userAPI = {
  updateProfile:    d => api.put('/social/user/profile', d),
  changePassword:   d => api.put('/social/user/change-password', d),
  regenerateApiKey: () => api.post('/social/user/regenerate-api-key'),
  deleteAccount:    () => api.delete('/social/user/account'),
  listDomains:      () => api.get('/social/user/domains'),
  createDomain:     d => api.post('/social/user/domains', d),
  deleteDomain:     id => api.delete(`/social/user/domains/${id}`),
  listHandlers:     () => api.get('/social/user/handlers'),
  createHandler:    d => api.post('/social/user/handlers', d),
  updateHandler:    (id, d) => api.put(`/social/user/handlers/${id}`, d),
  deleteHandler:    id => api.delete(`/social/user/handlers/${id}`),
  listLeads:        p => api.get('/social/user/leads', { params: p }),
  getPlans:         () => api.get('/social/user/plans'),
  createCheckout:   d => api.post('/social/user/billing/checkout', d),
  getBillingPortal: () => api.get('/social/user/billing/portal'),
  listPayments:     p => api.get('/social/user/billing/payments', { params: p }),
};

// Rank
export const toolsAPI = {
  list: () => api.get('/rank/tools'),
  run:  (tool, d) => api.post(`/rank/tools/${tool}/run`, d),
};
export const projectsAPI = {
  list:   p => api.get('/rank/projects', { params: p }),
  getOne: id => api.get(`/rank/projects/${id}`),
  create: d => api.post('/rank/projects', d),
  update: (id, d) => api.put(`/rank/projects/${id}`, d),
  remove: id => api.delete(`/rank/projects/${id}`),
};
export const reportsAPI = {
  list:   p => api.get('/rank/reports', { params: p }),
  run:    d => api.post('/rank/reports/run', d),
  getOne: id => api.get(`/rank/reports/${id}`),
  remove: id => api.delete(`/rank/reports/${id}`),
};
export const billingAPI = {
  getPlans:         () => api.get('/rank/billing/plans'),
  createCheckout:   d => api.post('/rank/billing/checkout', d),
  getBillingPortal: () => api.get('/rank/billing/portal'),
  listPayments:     p => api.get('/rank/billing/payments', { params: p }),
};

// Local payments (JazzCash, EasyPaisa, bank transfer)
export const paymentsAPI = {
  methods: ()      => api.get('/payments/methods'),
  create:  d       => api.post('/payments/local', d),
  mine:    ()      => api.get('/payments/local/mine'),
  adminList: p     => api.get('/payments/local/admin', { params: p }),
  approve: (id, d) => api.post(`/payments/local/${id}/approve`, d || {}),
  reject:  (id, d) => api.post(`/payments/local/${id}/reject`, d || {}),
};
