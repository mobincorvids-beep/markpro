import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import lazyRetry from './utils/lazyRetry';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';

const Spinner = () => (
  <div className="loading-overlay" style={{ height:'80vh' }}>
    <div className="spinner spinner-lg" />
  </div>
);

//  Auth 
const LoginPage          = lazyRetry(() => import('./pages/auth/LoginPage'));
const AdminLoginPage     = lazyRetry(() => import('./pages/auth/LoginPage').then(m => ({ default: m.AdminLoginPage })));
const RegisterPage       = lazyRetry(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazyRetry(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazyRetry(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage    = lazyRetry(() => import('./pages/auth/VerifyEmailPage'));

//  Main Dashboard 
const MainDashboard      = lazyRetry(() => import('./pages/dashboard/MainDashboard'));

//  Social Proof 
const DashboardHome      = lazyRetry(() => import('./pages/dashboard/DashboardHome'));
const CampaignsPage      = lazyRetry(() => import('./pages/dashboard/CampaignsPage'));
const CampaignDetailPage = lazyRetry(() => import('./pages/dashboard/CampaignDetailPage'));
const NotificationEditorPage = lazyRetry(() => import('./pages/dashboard/NotificationEditorPage'));
const DomainsPage        = lazyRetry(() => import('./pages/dashboard/DomainsPage'));
const BillingPage        = lazyRetry(() => import('./pages/dashboard/BillingPage'));
const SettingsPage       = lazyRetry(() => import('./pages/dashboard/SettingsPage'));
const LeadsPage          = lazyRetry(() => import('./pages/dashboard/LeadsPage'));
const HandlersPage       = lazyRetry(() => import('./pages/dashboard/HandlersPage'));

//  SMM 
const SmmDashboard       = lazyRetry(() => import('./pages/smm/SmmDashboard'));
const NewOrderPage       = lazyRetry(() => import('./pages/smm/NewOrderPage'));
const OrdersPage         = lazyRetry(() => import('./pages/smm/OrdersPage'));
const MassOrderPage      = lazyRetry(() => import('./pages/smm/MassOrderPage'));
const ServicesPage       = lazyRetry(() => import('./pages/smm/ServicesPage'));
const AddFundsPage       = lazyRetry(() => import('./pages/smm/AddFundsPage'));
const SubscriptionsPage  = lazyRetry(() => import('./pages/smm/SubscriptionsPage'));
const TransactionsPage   = lazyRetry(() => import('./pages/smm/TransactionsPage'));
const TicketsPage        = lazyRetry(() => import('./pages/smm/TicketsPage'));
const TicketDetailPage   = lazyRetry(() => import('./pages/smm/TicketDetailPage'));
const APIPage            = lazyRetry(() => import('./pages/smm/APIPage'));
const ProfilePage        = lazyRetry(() => import('./pages/smm/ProfilePage'));

//  Admin (SP + SMM) 
const AdminDashboard     = lazyRetry(() => import('./pages/admin/AdminDashboard'));
const AdminUsers         = lazyRetry(() => import('./pages/admin/AdminUsers'));
const AdminPlans         = lazyRetry(() => import('./pages/admin/AdminPlans'));
const AdminPayments      = lazyRetry(() => import('./pages/admin/AdminPayments'));
const AdminLocalPayments = lazyRetry(() => import('./pages/admin/AdminLocalPayments'));
const LocalTopUpPage     = lazyRetry(() => import('./pages/billing/LocalTopUpPage'));
const CheckoutPage       = lazyRetry(() => import('./pages/billing/CheckoutPage'));
const SmmAdminDashboard  = lazyRetry(() => import('./pages/admin/SmmAdminDashboard'));
const SmmAdminOrders     = lazyRetry(() => import('./pages/admin/SmmAdminOrders'));
const SmmAdminDeposits   = lazyRetry(() => import('./pages/admin/SmmAdminDeposits'));
const SmmAdminServices   = lazyRetry(() => import('./pages/admin/SmmAdminServices'));
const SmmAdminUsers      = lazyRetry(() => import('./pages/admin/SmmAdminUsers'));
const SmmAdminTickets    = lazyRetry(() => import('./pages/admin/SmmAdminTickets'));
const SmmAdminProviders  = lazyRetry(() => import('./pages/admin/SmmAdminProviders'));
const SmmAdminSettings   = lazyRetry(() => import('./pages/admin/SmmAdminSettings'));
const SmmAdminCoupons    = lazyRetry(() => import('./pages/admin/SmmAdminCoupons'));

//  SEO + Rank Tracker 
const SEOHub             = lazyRetry(() => import('./pages/seo/SEOHub'));
const RankHub            = lazyRetry(() => import('./pages/rank/RankHub'));
const ProjectsPage       = lazyRetry(() => import('./pages/rank/ProjectsPage'));
const ProjectDetailPage  = lazyRetry(() => import('./pages/rank/ProjectDetailPage'));
const ReportsPage        = lazyRetry(() => import('./pages/rank/ReportsPage'));
const ReportDetailPage   = lazyRetry(() => import('./pages/rank/ReportDetailPage'));
const RankToolsPage      = lazyRetry(() => import('./pages/rank/ToolsPage'));
const RankToolRunnerPage = lazyRetry(() => import('./pages/rank/ToolRunnerPage'));
const RankBillingPage    = lazyRetry(() => import('./pages/rank/RankBillingPage'));
const RankSettingsPage   = lazyRetry(() => import('./pages/rank/RankSettingsPage'));
const RankAdminDashboard = lazyRetry(() => import('./pages/rank/RankAdminDashboard'));
const RankAdminUsers     = lazyRetry(() => import('./pages/rank/RankAdminUsers'));
const RankAdminPlans     = lazyRetry(() => import('./pages/rank/RankAdminPlans'));

//  Dev Tools 
const CyberHub           = lazyRetry(() => import('./pages/cyber/CyberHub'));

//  Bio Pages + BioLinks 
const BioHub             = lazyRetry(() => import('./pages/bio/BioHub'));
const BioLinksHub        = lazyRetry(() => import('./pages/biolinks/BioLinksHub'));
const BiolinksPage       = lazyRetry(() => import('./pages/biolinks/BiolinksPage'));
const LinksPage          = lazyRetry(() => import('./pages/biolinks/LinksPage'));
const BLToolPages        = lazyRetry(() => import('./pages/biolinks/BLToolPages'));
const BLDashboard        = lazyRetry(() => import('./pages/biolinks/BLDashboard'));

//  Document Vault 
const DocsHub            = lazyRetry(() => import('./pages/docs/DocsHub'));
const DrivePage          = lazyRetry(() => import('./pages/docs/DrivePage'));
const RequestsPage       = lazyRetry(() => import('./pages/docs/RequestsPage'));
const RequestFulfilPage  = lazyRetry(() => import('./pages/docs/RequestFulfilPage'));
const PublicSharePage    = lazyRetry(() => import('./pages/docs/PublicSharePage'));
const PublicBiolinkPage  = lazyRetry(() => import('./pages/biolinks/public/PublicBiolinkPage'));
const BLPageEditor       = lazyRetry(() => import('./pages/biolinks/BLPageEditor'));
const DocAdminPage       = lazyRetry(() => import('./pages/docs/DocAdminPage'));

//  WhatsApp Marketing 
const WhatsAppHub        = lazyRetry(() => import('./pages/whatsapp/WhatsAppHub'));
const WADashboard        = lazyRetry(() => import('./pages/whatsapp/WADashboard'));
const ChatPage           = lazyRetry(() => import('./pages/whatsapp/ChatPage'));
const WAContactsPage     = lazyRetry(() => import('./pages/whatsapp/WAContactsPage'));
const WAContactDetail    = lazyRetry(() => import('./pages/whatsapp/WAContactDetail'));
const WACampaignsPage    = lazyRetry(() => import('./pages/whatsapp/WACampaignsPage'));
const WACampaignDetail   = lazyRetry(() => import('./pages/whatsapp/WACampaignDetail'));
const WANewCampaign      = lazyRetry(() => import('./pages/whatsapp/WANewCampaign'));
const BotsPage           = lazyRetry(() => import('./pages/whatsapp/BotsPage'));
const TemplatesPage      = lazyRetry(() => import('./pages/whatsapp/TemplatesPage'));
const WASettingsPage     = lazyRetry(() => import('./pages/whatsapp/WASettingsPage'));
const CannedPage         = lazyRetry(() => import('./pages/whatsapp/CannedPage'));
const AiPromptsPage      = lazyRetry(() => import('./pages/whatsapp/AiPromptsPage'));
const WAAdminUsers       = lazyRetry(() => import('./pages/whatsapp/WAAdminUsers'));

//  Social Stream 
const StreamHub          = lazyRetry(() => import('./pages/stream/StreamHub'));
const FeedPage           = lazyRetry(() => import('./pages/stream/FeedPage'));
const AccountsPage       = lazyRetry(() => import('./pages/stream/AccountsPage'));
const StreamsPage        = lazyRetry(() => import('./pages/stream/StreamsPage'));

//  AI Suite 
const AIHub              = lazyRetry(() => import('./pages/ai/AIHub'));
const AIReplyPage        = lazyRetry(() => import('./pages/ai/AIReplyPage'));
const ReplyHistoryPage   = lazyRetry(() => import('./pages/ai/ReplyHistoryPage'));
const ImageGeneratePage  = lazyRetry(() => import('./pages/ai/ImageGeneratePage'));
const GalleryPage        = lazyRetry(() => import('./pages/ai/GalleryPage'));
const FavoritesPage      = lazyRetry(() => import('./pages/ai/FavoritesPage'));

//  AI Generators (AIGen - multi-modal credit-based) 
const AIGenDashboard      = lazyRetry(() => import('./pages/aigen/AIGenDashboard'));
const TextGenerator       = lazyRetry(() => import('./pages/aigen/TextGenerator'));
const ImageGenerator      = lazyRetry(() => import('./pages/aigen/ImageGenerator'));
const SpeechGenerator     = lazyRetry(() => import('./pages/aigen/SpeechGenerator'));
const TranscribeGenerator = lazyRetry(() => import('./pages/aigen/TranscribeGenerator'));
const AnimationGenerator  = lazyRetry(() => import('./pages/aigen/AnimationGenerator'));
const HistoryPage         = lazyRetry(() => import('./pages/aigen/HistoryPage'));
const CreditsPage         = lazyRetry(() => import('./pages/aigen/CreditsPage'));
const AIGenProfilePage    = lazyRetry(() => import('./pages/aigen/AIGenProfilePage'));
const AIGenAdminPage      = lazyRetry(() => import('./pages/aigen/AIGenAdminPage'));
const BioAdminDashboard   = lazyRetry(() => import('./pages/bio/BioAdminDashboard'));
const BioAdminUsers       = lazyRetry(() => import('./pages/bio/BioAdminUsers'));
const BioAdminPlans       = lazyRetry(() => import('./pages/bio/BioAdminPlans'));
const BioAdminTemplates   = lazyRetry(() => import('./pages/bio/BioAdminTemplates'));
const BioAdminCoupons     = lazyRetry(() => import('./pages/bio/BioAdminCoupons'));
const BioAdminPayments2   = lazyRetry(() => import('./pages/bio/BioAdminPayments'));
const BioAdminSettings    = lazyRetry(() => import('./pages/bio/BioAdminSettings'));
const BLAdminDashboard    = lazyRetry(() => import('./pages/biolinks/BLAdminDashboard'));
const BLAdminUsers        = lazyRetry(() => import('./pages/biolinks/BLAdminUsers'));
const BLAdminPlans        = lazyRetry(() => import('./pages/biolinks/BLAdminPlans'));
const BLAdminPages        = lazyRetry(() => import('./pages/biolinks/BLAdminPages'));
const BLAdminSettings     = lazyRetry(() => import('./pages/biolinks/BLAdminSettings'));
const PenAdminDashboard   = lazyRetry(() => import('./pages/pen/PenAdminDashboard'));
const PenAdminUsers       = lazyRetry(() => import('./pages/pen/PenAdminUsers'));
const PenAdminPackages    = lazyRetry(() => import('./pages/pen/PenAdminPackages'));
const PenAdminTemplates   = lazyRetry(() => import('./pages/pen/PenAdminTemplates'));
const PenAdminOrders      = lazyRetry(() => import('./pages/pen/PenAdminOrders'));
const PenAdminSettings    = lazyRetry(() => import('./pages/pen/PenAdminSettings'));
const ChatflowAdminDashboard   = lazyRetry(() => import('./pages/chatflow/adminIndex').then(m => ({ default: m.ChatflowAdminDashboard })));
const ChatflowAdminTenants     = lazyRetry(() => import('./pages/chatflow/adminIndex').then(m => ({ default: m.ChatflowAdminTenants })));
const DesignAdminDashboard     = lazyRetry(() => import('./pages/design/adminIndex').then(m => ({ default: m.DesignAdminDashboard })));
const DesignAdminTemplates     = lazyRetry(() => import('./pages/design/adminIndex').then(m => ({ default: m.DesignAdminTemplates })));
const SiteSpyAdminDashboard    = lazyRetry(() => import('./pages/sitespy/SiteSpyAdminDashboard'));
const StackpostsAdminDashboard = lazyRetry(() => import('./pages/stackposts/adminIndex').then(m => ({ default: m.StackpostsAdminDashboard })));
const StackpostsAdminTickets   = lazyRetry(() => import('./pages/stackposts/adminIndex').then(m => ({ default: m.StackpostsAdminTickets })));
const StackpostsAdminWithdrawals = lazyRetry(() => import('./pages/stackposts/adminIndex').then(m => ({ default: m.StackpostsAdminWithdrawals })));
const StackpostsAdminContent   = lazyRetry(() => import('./pages/stackposts/adminIndex').then(m => ({ default: m.StackpostsAdminContent })));
const TelemanAdminDashboard    = lazyRetry(() => import('./pages/teleman/TelemanAdminDashboard'));
const ToolsaiAdminDashboard    = lazyRetry(() => import('./pages/toolsai/adminIndex').then(m => ({ default: m.ToolsaiAdminDashboard })));
const ToolsaiAdminContent      = lazyRetry(() => import('./pages/toolsai/adminIndex').then(m => ({ default: m.ToolsaiAdminContent })));
const WhatsMLAdminDashboard    = lazyRetry(() => import('./pages/whatsml/WhatsMLAdminDashboard'));
const ZamAdminDashboard        = lazyRetry(() => import('./pages/zamnexus/ZamAdminDashboard'));
const SeoManagerAdminDashboard = lazyRetry(() => import('./pages/seomanager/SeoManagerAdminDashboard'));
const WhatsappAdminSettings    = lazyRetry(() => import('./pages/whatsapp/WhatsappAdminSettings'));

//  Publish (BeePost - compose, schedule, autopilot) 
const PublishDashboard    = lazyRetry(() => import('./pages/publish/PublishDashboard'));
const ComposePage         = lazyRetry(() => import('./pages/publish/ComposePage'));
const PostsPage           = lazyRetry(() => import('./pages/publish/PostsPage'));
const CalendarPage        = lazyRetry(() => import('./pages/publish/CalendarPage'));
const SocialAccountsPage  = lazyRetry(() => import('./pages/publish/SocialAccountsPage'));
const AIContentPage       = lazyRetry(() => import('./pages/publish/AIContentPage'));
const PublishGalleryPage  = lazyRetry(() => import('./pages/publish/PublishGalleryPage'));
const AutopilotPage       = lazyRetry(() => import('./pages/publish/AutopilotPage'));
const PublishBillingPage  = lazyRetry(() => import('./pages/publish/PublishBillingPage'));
const PublishProfilePage  = lazyRetry(() => import('./pages/publish/PublishProfilePage'));
const PublishAdminPage    = lazyRetry(() => import('./pages/publish/PublishAdminPage'));
const BrandHub            = lazyRetry(() => import('./pages/publish/BrandHub'));

//  Pen AI (AI2Pen - template-driven content generation) 
const PenDashboard         = lazyRetry(() => import('./pages/pen/PenDashboard'));
const PenTemplatesPage     = lazyRetry(() => import('./pages/pen/PenTemplatesPage'));
const PenTemplateRunner    = lazyRetry(() => import('./pages/pen/PenTemplateRunner'));
const PenImageGeneratorPage= lazyRetry(() => import('./pages/pen/PenImageGeneratorPage'));
const PenAudioGeneratorPage= lazyRetry(() => import('./pages/pen/PenAudioGeneratorPage'));
const PenChatPage          = lazyRetry(() => import('./pages/pen/PenChatPage'));
const PenBillingPage       = lazyRetry(() => import('./pages/pen/PenBillingPage'));
const PenHistoryPage       = lazyRetry(() => import('./pages/pen/PenHistoryPage'));

//  Design Studio (PixaGuru) 
const DesignDashboard    = lazyRetry(() => import('./pages/design/DesignDashboard'));
const DesignEditor       = lazyRetry(() => import('./pages/design/DesignEditor'));
const DesignMediaLibrary = lazyRetry(() => import('./pages/design/DesignMediaLibrary'));

//  Mailer / XSender 
const MailerDashboard    = lazyRetry(() => import('./pages/mailer/MailerDashboard'));
const MailerContacts     = lazyRetry(() => import('./pages/mailer/MailerContacts'));
const MailerCampaigns    = lazyRetry(() => import('./pages/mailer/MailerCampaigns'));
const MailerNewCampaign  = lazyRetry(() => import('./pages/mailer/MailerNewCampaign'));
const MailerGroups       = lazyRetry(() => import('./pages/mailer/MailerGroups'));

//  SocialVibe 
const SVDashboard        = lazyRetry(() => import('./pages/socialvibe/SVDashboard'));
const SVCalendar         = lazyRetry(() => import('./pages/socialvibe/SVCalendar'));
const SVAIWriter         = lazyRetry(() => import('./pages/socialvibe/SVAIWriter'));
const SVAccounts         = lazyRetry(() => import('./pages/socialvibe/SVAccounts'));
const SVTemplates        = lazyRetry(() => import('./pages/socialvibe/SVTemplates'));
const SVTeam             = lazyRetry(() => import('./pages/socialvibe/SVTeam'));

//  StackPosts 
const StackPostsDashboard= lazyRetry(() => import('./pages/stackposts/StackPostsDashboard'));
const SPAiStudio         = lazyRetry(() => import('./pages/stackposts/SPAiStudio'));
// SPFeeds and SPAffiliate are named exports of the SPAiStudio module - there
// are no separate files, so the old imports broke the production build.
const SPFeeds            = lazyRetry(() => import('./pages/stackposts/SPAiStudio').then(m => ({ default: m.SPFeeds })));
const SPAffiliate        = lazyRetry(() => import('./pages/stackposts/SPAiStudio').then(m => ({ default: m.SPAffiliate })));

//  ChatFlow 
const ChatFlowDashboard  = lazyRetry(() => import('./pages/chatflow/ChatFlowDashboard'));
const ChatFlowInbox      = lazyRetry(() => import('./pages/chatflow/ChatFlowInbox'));
const ChatFlowRules      = lazyRetry(() => import('./pages/chatflow/ChatFlowRules'));
const ChatFlowProducts   = lazyRetry(() => import('./pages/chatflow/ChatFlowProducts'));

//  Teleman 
const TelemanDialer      = lazyRetry(() => import('./pages/teleman/TelemanDialer'));
const TelemanDashboard   = lazyRetry(() => import('./pages/teleman/TelemanDashboard'));
const TelemanContacts    = lazyRetry(() => import('./pages/teleman/TelemanContacts'));
const TelemanProviders   = lazyRetry(() => import('./pages/teleman/TelemanProviders'));

//  WhatsML 
const WhatsMLDashboard   = lazyRetry(() => import('./pages/whatsml/WhatsMLDashboard'));
const WhatsMLInbox       = lazyRetry(() => import('./pages/whatsml/WhatsMLInbox'));
const WhatsMLScanner     = lazyRetry(() => import('./pages/whatsml/WhatsMLScanner'));

//  ToolsAI 
const ToolsAIDashboard   = lazyRetry(() => import('./pages/toolsai/ToolsAIDashboard'));
const ToolsAIWrite       = lazyRetry(() => import('./pages/toolsai/ToolsAIWrite'));
const ToolsAIChat        = lazyRetry(() => import('./pages/toolsai/ToolsAIChat'));
const ToolsAIImages      = lazyRetry(() => import('./pages/toolsai/ToolsAIImages'));

//  SiteSpy 
const SiteSpyDashboard   = lazyRetry(() => import('./pages/sitespy/SiteSpyDashboard'));
const SiteSpyUrls        = lazyRetry(() => import('./pages/sitespy/SiteSpyUrls'));
const SiteSpyTools       = lazyRetry(() => import('./pages/sitespy/SiteSpyTools'));

//  ZAM Nexus 
const ZamDashboard       = lazyRetry(() => import('./pages/zamnexus/ZamDashboard'));
const ZamSeoTools        = lazyRetry(() => import('./pages/zamnexus/ZamSeoTools'));
const ZamContacts        = lazyRetry(() => import('./pages/zamnexus/ZamContacts'));
const ZamLeads           = lazyRetry(() => import('./pages/zamnexus/ZamLeads'));

//  SEO Manager 
const SeoManagerDashboard= lazyRetry(() => import('./pages/seomanager/SeoManagerDashboard'));
const SeoManagerEdit     = lazyRetry(() => import('./pages/seomanager/SeoManagerEdit'));

//  Route Guards 
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login"replace />;
}
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login"replace />;
  if (user.role !== 'admin' && user.role !== 'staff') return <Navigate to="/"replace />;
  return children;
}
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/"replace /> : children;
}

function Private({ children }) {
  return (
    <PrivateRoute>
      <AppLayout>
        <ErrorBoundary><Suspense fallback={<Spinner />}>{children}</Suspense></ErrorBoundary>
      </AppLayout>
    </PrivateRoute>
  );
}
function Admin({ children }) {
  return (
    <AdminRoute>
      <AppLayout>
        <ErrorBoundary><Suspense fallback={<Spinner />}>{children}</Suspense></ErrorBoundary>
      </AppLayout>
    </AdminRoute>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/** One shared cache for every module that uses react-query. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary><Suspense fallback={<Spinner />}>
          <Routes>
            {/* Root */}
            <Route path="/" element={<Private><MainDashboard /></Private>} />

            {/* Auth */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/admin-login" element={<PublicRoute><AdminLoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

            {/* Public (no auth required) */}
            <Route path="/docs/public/:token" element={<ErrorBoundary><Suspense fallback={<Spinner />}><PublicSharePage /></Suspense></ErrorBoundary>} />
            <Route path="/r/:slug" element={<ErrorBoundary><Suspense fallback={<Spinner />}><PublicBiolinkPage /></Suspense></ErrorBoundary>} />

            {/*  SEO Tools  */}
            <Route path="/seo" element={<Private><SEOHub /></Private>} />
            <Route path="/seo/*" element={<Private><SEOHub /></Private>} />

            {/*  Rank Tracker  */}
            <Route path="/rank" element={<Private><RankHub /></Private>} />
            <Route path="/rank/projects" element={<Private><ProjectsPage /></Private>} />
            <Route path="/rank/projects/:id" element={<Private><ProjectDetailPage /></Private>} />
            <Route path="/reports" element={<Private><ReportsPage /></Private>} />
            <Route path="/reports/:id" element={<Private><ReportDetailPage /></Private>} />
            <Route path="/rank/reports" element={<Private><ReportsPage /></Private>} />
            <Route path="/rank/reports/:id" element={<Private><ReportDetailPage /></Private>} />
            <Route path="/rank/tools" element={<Private><RankToolsPage /></Private>} />
            <Route path="/rank/tools/:tool" element={<Private><RankToolRunnerPage /></Private>} />
            <Route path="/rank/billing" element={<Private><RankBillingPage /></Private>} />
            <Route path="/rank/settings" element={<Private><RankSettingsPage /></Private>} />

            {/*  Dev Tools  */}
            <Route path="/cyber" element={<Private><CyberHub /></Private>} />
            <Route path="/cyber/*" element={<Private><CyberHub /></Private>} />

            {/*  Bio Pages (PixaURL)  */}
            <Route path="/bio" element={<Private><BioHub /></Private>} />
            <Route path="/bio/*" element={<Private><BioHub /></Private>} />

            {/*  BioLinks (URL shortener + QR)  */}
            <Route path="/biolinks" element={<Private><BioLinksHub /></Private>} />
            <Route path="/biolinks/pages" element={<Private><BiolinksPage /></Private>} />
            <Route path="/biolinks/pages/:id/edit" element={<Private><BLPageEditor /></Private>} />
            <Route path="/biolinks/links" element={<Private><LinksPage /></Private>} />
            <Route path="/biolinks/tools" element={<Private><BLToolPages /></Private>} />
            <Route path="/biolinks/stats" element={<Private><BLDashboard /></Private>} />

            {/*  Document Vault  */}
            <Route path="/docs" element={<Private><DocsHub /></Private>} />
            <Route path="/docs/drive" element={<Private><DrivePage /></Private>} />
            <Route path="/docs/requests" element={<Private><RequestsPage /></Private>} />
            <Route path="/docs/requests/:id" element={<Private><RequestFulfilPage /></Private>} />
            <Route path="/docs/shared" element={<Private><DrivePage /></Private>} />

            {/*  WhatsApp Marketing  */}
            <Route path="/whatsapp" element={<Private><WhatsAppHub /></Private>} />
            <Route path="/whatsapp/dashboard" element={<Private><WADashboard /></Private>} />
            <Route path="/whatsapp/chat" element={<Private><ChatPage /></Private>} />
            <Route path="/whatsapp/contacts" element={<Private><WAContactsPage /></Private>} />
            <Route path="/whatsapp/contacts/:id" element={<Private><WAContactDetail /></Private>} />
            <Route path="/whatsapp/campaigns" element={<Private><WACampaignsPage /></Private>} />
            <Route path="/whatsapp/campaigns/new" element={<Private><WANewCampaign /></Private>} />
            <Route path="/whatsapp/campaigns/:id" element={<Private><WACampaignDetail /></Private>} />
            <Route path="/whatsapp/bots" element={<Private><BotsPage /></Private>} />
            <Route path="/whatsapp/templates" element={<Private><TemplatesPage /></Private>} />
            <Route path="/whatsapp/settings" element={<Private><WASettingsPage /></Private>} />
            <Route path="/whatsapp/settings/canned" element={<Private><CannedPage /></Private>} />
            <Route path="/whatsapp/settings/ai-prompts" element={<Private><AiPromptsPage /></Private>} />

            {/*  Social Proof  */}
            <Route path="/social" element={<Private><DashboardHome /></Private>} />
            <Route path="/social/campaigns" element={<Private><CampaignsPage /></Private>} />
            <Route path="/social/campaigns/:id" element={<Private><CampaignDetailPage /></Private>} />
            <Route path="/social/notifications/:campaignId/:notifId" element={<Private><NotificationEditorPage /></Private>} />
            <Route path="/social/domains" element={<Private><DomainsPage /></Private>} />
            <Route path="/social/analytics" element={<Private><HandlersPage /></Private>} />
            <Route path="/social/leads" element={<Private><LeadsPage /></Private>} />
            <Route path="/social/billing" element={<Private><BillingPage /></Private>} />
            <Route path="/billing" element={<Private><BillingPage /></Private>} />
            <Route path="/billing/topup" element={<Private><LocalTopUpPage /></Private>} />
            <Route path="/billing/checkout" element={<Private><CheckoutPage /></Private>} />
            <Route path="/social/settings" element={<Private><SettingsPage /></Private>} />

            {/*  SMM Panel  */}
            <Route path="/smm" element={<Private><SmmDashboard /></Private>} />
            <Route path="/smm/new-order" element={<Private><NewOrderPage /></Private>} />
            <Route path="/smm/orders" element={<Private><OrdersPage /></Private>} />
            <Route path="/smm/mass-order" element={<Private><MassOrderPage /></Private>} />
            <Route path="/smm/services" element={<Private><ServicesPage /></Private>} />
            <Route path="/smm/add-funds" element={<Private><AddFundsPage /></Private>} />
            <Route path="/smm/subscriptions" element={<Private><SubscriptionsPage /></Private>} />
            <Route path="/smm/transactions" element={<Private><TransactionsPage /></Private>} />
            <Route path="/smm/tickets" element={<Private><TicketsPage /></Private>} />
            <Route path="/smm/tickets/:id" element={<Private><TicketDetailPage /></Private>} />
            <Route path="/smm/api" element={<Private><APIPage /></Private>} />
            <Route path="/smm/profile" element={<Private><ProfilePage /></Private>} />

            {/*  Social Stream  */}
            <Route path="/stream" element={<Private><StreamHub /></Private>} />
            <Route path="/stream/feed" element={<Private><FeedPage /></Private>} />
            <Route path="/stream/accounts" element={<Private><AccountsPage /></Private>} />
            <Route path="/stream/widgets" element={<Private><StreamsPage /></Private>} />

            {/*  AI Suite  */}
            <Route path="/ai" element={<Private><AIHub /></Private>} />
            <Route path="/ai/reply" element={<Private><AIReplyPage /></Private>} />
            <Route path="/ai/history" element={<Private><ReplyHistoryPage /></Private>} />
            <Route path="/ai/images" element={<Private><ImageGeneratePage /></Private>} />
            <Route path="/ai/gallery" element={<Private><GalleryPage /></Private>} />
            <Route path="/ai/favorites" element={<Private><FavoritesPage /></Private>} />

            {/*  AI Generators (AIGen)  */}
            <Route path="/ai/generate" element={<Private><AIGenDashboard /></Private>} />
            <Route path="/ai/generate/text" element={<Private><TextGenerator /></Private>} />
            <Route path="/ai/generate/image" element={<Private><ImageGenerator /></Private>} />
            <Route path="/ai/generate/speech" element={<Private><SpeechGenerator /></Private>} />
            <Route path="/ai/generate/transcribe" element={<Private><TranscribeGenerator /></Private>} />
            <Route path="/ai/generate/animate" element={<Private><AnimationGenerator /></Private>} />
            <Route path="/ai/generate/history" element={<Private><HistoryPage /></Private>} />
            <Route path="/ai/generate/credits" element={<Private><CreditsPage /></Private>} />
            <Route path="/ai/generate/profile" element={<Private><AIGenProfilePage /></Private>} />

            {/*  Publish (BeePost + Brand AI)  */}
            <Route path="/publish" element={<Private><PublishDashboard /></Private>} />
            <Route path="/publish/compose" element={<Private><ComposePage /></Private>} />
            <Route path="/publish/posts" element={<Private><PostsPage /></Private>} />
            <Route path="/publish/calendar" element={<Private><CalendarPage /></Private>} />
            <Route path="/publish/social" element={<Private><SocialAccountsPage /></Private>} />
            <Route path="/publish/ai" element={<Private><AIContentPage /></Private>} />
            <Route path="/publish/gallery" element={<Private><PublishGalleryPage /></Private>} />
            <Route path="/publish/autopilot" element={<Private><AutopilotPage /></Private>} />
            <Route path="/publish/billing" element={<Private><PublishBillingPage /></Private>} />
            <Route path="/publish/profile" element={<Private><PublishProfilePage /></Private>} />
            <Route path="/publish/brands" element={<Private><BrandHub /></Private>} />

            {/*  Pen AI (AI2Pen)  */}
            <Route path="/pen" element={<Private><PenDashboard /></Private>} />
            <Route path="/pen/templates" element={<Private><PenTemplatesPage /></Private>} />
            <Route path="/pen/templates/:id" element={<Private><PenTemplateRunner /></Private>} />
            <Route path="/pen/images" element={<Private><PenImageGeneratorPage /></Private>} />
            <Route path="/pen/audio" element={<Private><PenAudioGeneratorPage /></Private>} />
            <Route path="/pen/chat" element={<Private><PenChatPage /></Private>} />
            <Route path="/pen/history" element={<Private><PenHistoryPage /></Private>} />
            <Route path="/pen/billing" element={<Private><PenBillingPage /></Private>} />

            {/*  Design Studio (PixaGuru - Fabric.js canvas editor)  */}
            <Route path="/design" element={<Private><DesignDashboard /></Private>} />
            <Route path="/design/editor/:id" element={<Private><DesignEditor /></Private>} />
            <Route path="/design/media" element={<Private><DesignMediaLibrary /></Private>} />

            {/*  Mailer (XSender - mass email + SMS)  */}
            <Route path="/mailer" element={<Private><MailerDashboard /></Private>} />
            <Route path="/mailer/contacts" element={<Private><MailerContacts /></Private>} />
            <Route path="/mailer/groups" element={<Private><MailerGroups /></Private>} />
            <Route path="/mailer/campaigns" element={<Private><MailerCampaigns /></Private>} />
            <Route path="/mailer/campaigns/new" element={<Private><MailerNewCampaign /></Private>} />

            {/*  SocialVibe (AI social scheduler)  */}
            <Route path="/socialvibe" element={<Private><SVDashboard /></Private>} />
            <Route path="/socialvibe/compose" element={<Private><SVAIWriter /></Private>} />
            <Route path="/socialvibe/ai" element={<Private><SVAIWriter /></Private>} />
            <Route path="/socialvibe/calendar" element={<Private><SVCalendar /></Private>} />
            <Route path="/socialvibe/accounts" element={<Private><SVAccounts /></Private>} />
            <Route path="/socialvibe/templates" element={<Private><SVTemplates /></Private>} />
            <Route path="/socialvibe/team" element={<Private><SVTeam /></Private>} />

            {/*  StackPosts (multi-team social mega-platform)  */}
            <Route path="/stackposts" element={<Private><StackPostsDashboard /></Private>} />
            <Route path="/stackposts/:teamId/ai" element={<Private><SPAiStudio /></Private>} />
            <Route path="/stackposts/:teamId/compose" element={<Private><SPAiStudio /></Private>} />
            <Route path="/stackposts/:teamId/feeds" element={<Private><SPFeeds /></Private>} />
            <Route path="/stackposts/affiliate" element={<Private><SPAffiliate /></Private>} />

            {/*  ChatFlow (Facebook Messenger bots + e-commerce)  */}
            <Route path="/chatflow" element={<Private><ChatFlowDashboard /></Private>} />
            <Route path="/chatflow/inbox" element={<Private><ChatFlowInbox /></Private>} />
            <Route path="/chatflow/rules" element={<Private><ChatFlowRules /></Private>} />
            <Route path="/chatflow/products" element={<Private><ChatFlowProducts /></Private>} />
            <Route path="/chatflow/sequences" element={<Private><ChatFlowDashboard /></Private>} />
            <Route path="/chatflow/broadcasts" element={<Private><ChatFlowDashboard /></Private>} />
            <Route path="/chatflow/orders" element={<Private><ChatFlowDashboard /></Private>} />

            {/*  Teleman (Twilio VoIP + telemarketing)  */}
            <Route path="/teleman" element={<Private><TelemanDashboard /></Private>} />
            <Route path="/teleman/dialer" element={<Private><TelemanDialer /></Private>} />
            <Route path="/teleman/contacts" element={<Private><TelemanContacts /></Private>} />
            <Route path="/teleman/providers" element={<Private><TelemanProviders /></Private>} />
            <Route path="/teleman/campaigns" element={<Private><TelemanDashboard /></Private>} />
            <Route path="/teleman/scripts" element={<Private><TelemanDashboard /></Private>} />
            <Route path="/teleman/tickets" element={<Private><TelemanDashboard /></Private>} />

            {/*  WhatsML (dual-channel WhatsApp + Baileys QR)  */}
            <Route path="/whatsml" element={<Private><WhatsMLDashboard /></Private>} />
            <Route path="/whatsml/inbox" element={<Private><WhatsMLInbox /></Private>} />
            <Route path="/whatsml/scanner" element={<Private><WhatsMLScanner /></Private>} />
            <Route path="/whatsml/customers" element={<Private><WhatsMLDashboard /></Private>} />
            <Route path="/whatsml/campaigns" element={<Private><WhatsMLDashboard /></Private>} />
            <Route path="/whatsml/bots" element={<Private><WhatsMLDashboard /></Private>} />
            <Route path="/whatsml/training" element={<Private><WhatsMLDashboard /></Private>} />
            <Route path="/whatsml/scrape" element={<Private><WhatsMLDashboard /></Private>} />

            {/*  ToolsAI (Gemini suite + Blog CMS)  */}
            <Route path="/toolsai" element={<Private><ToolsAIDashboard /></Private>} />
            <Route path="/toolsai/write" element={<Private><ToolsAIWrite /></Private>} />
            <Route path="/toolsai/chat" element={<Private><ToolsAIChat /></Private>} />
            <Route path="/toolsai/images" element={<Private><ToolsAIImages /></Private>} />
            <Route path="/toolsai/code" element={<Private><ToolsAIWrite /></Private>} />

            {/*  SiteSpy (visitor analytics + URL shortener)  */}
            <Route path="/sitespy" element={<Private><SiteSpyDashboard /></Private>} />
            <Route path="/sitespy/urls" element={<Private><SiteSpyUrls /></Private>} />
            <Route path="/sitespy/tools" element={<Private><SiteSpyTools /></Private>} />
            <Route path="/sitespy/analytics/:id" element={<Private><SiteSpyDashboard /></Private>} />

            {/*  ZAM Nexus (CRM + Lead Gen + Gemini SEO)  */}
            <Route path="/zam" element={<Private><ZamDashboard /></Private>} />
            <Route path="/zam/seo" element={<Private><ZamSeoTools /></Private>} />
            <Route path="/zam/contacts" element={<Private><ZamContacts /></Private>} />
            <Route path="/zam/leads" element={<Private><ZamLeads /></Private>} />
            <Route path="/zam/assets" element={<Private><ZamDashboard /></Private>} />

            {/*  SEO Manager (per-page meta/OG/JSON-LD CMS)  */}
            <Route path="/seo-manager" element={<Private><SeoManagerDashboard /></Private>} />
            <Route path="/seo-manager/:id/edit" element={<Private><SeoManagerEdit /></Private>} />

            {/*  Admin  */}
            <Route path="/admin" element={<Admin><AdminDashboard /></Admin>} />
            <Route path="/admin/users" element={<Admin><AdminUsers /></Admin>} />
            <Route path="/admin/plans" element={<Admin><AdminPlans /></Admin>} />
            <Route path="/admin/payments" element={<Admin><AdminPayments /></Admin>} />
            <Route path="/admin/payments/local" element={<Admin><AdminLocalPayments /></Admin>} />
            <Route path="/admin/rank" element={<Admin><RankAdminDashboard /></Admin>} />
            <Route path="/admin/rank/users" element={<Admin><RankAdminUsers /></Admin>} />
            <Route path="/admin/rank/plans" element={<Admin><RankAdminPlans /></Admin>} />
            <Route path="/admin/smm" element={<Admin><SmmAdminDashboard /></Admin>} />
            <Route path="/admin/smm/orders" element={<Admin><SmmAdminOrders /></Admin>} />
            <Route path="/admin/smm/deposits" element={<Admin><SmmAdminDeposits /></Admin>} />
            <Route path="/admin/smm/services" element={<Admin><SmmAdminServices /></Admin>} />
            <Route path="/admin/smm/users" element={<Admin><SmmAdminUsers /></Admin>} />
            <Route path="/admin/smm/tickets" element={<Admin><SmmAdminTickets /></Admin>} />
            <Route path="/admin/smm/providers" element={<Admin><SmmAdminProviders /></Admin>} />
            <Route path="/admin/smm/settings" element={<Admin><SmmAdminSettings /></Admin>} />
            <Route path="/admin/smm/coupons" element={<Admin><SmmAdminCoupons /></Admin>} />
            <Route path="/admin/whatsapp/users" element={<Admin><WAAdminUsers /></Admin>} />
            <Route path="/admin/docs" element={<Admin><DocAdminPage /></Admin>} />
            <Route path="/admin/publish" element={<Admin><PublishAdminPage /></Admin>} />
            <Route path="/admin/aigen" element={<Admin><AIGenAdminPage /></Admin>} />
            <Route path="/admin/bio" element={<Admin><BioAdminDashboard /></Admin>} />
            <Route path="/admin/bio/users" element={<Admin><BioAdminUsers /></Admin>} />
            <Route path="/admin/bio/plans" element={<Admin><BioAdminPlans /></Admin>} />
            <Route path="/admin/bio/templates" element={<Admin><BioAdminTemplates /></Admin>} />
            <Route path="/admin/bio/coupons" element={<Admin><BioAdminCoupons /></Admin>} />
            <Route path="/admin/bio/payments" element={<Admin><BioAdminPayments2 /></Admin>} />
            <Route path="/admin/bio/settings" element={<Admin><BioAdminSettings /></Admin>} />
            <Route path="/admin/biolinks" element={<Admin><BLAdminDashboard /></Admin>} />
            <Route path="/admin/biolinks/users" element={<Admin><BLAdminUsers /></Admin>} />
            <Route path="/admin/biolinks/plans" element={<Admin><BLAdminPlans /></Admin>} />
            <Route path="/admin/biolinks/pages" element={<Admin><BLAdminPages /></Admin>} />
            <Route path="/admin/biolinks/settings" element={<Admin><BLAdminSettings /></Admin>} />
            <Route path="/admin/pen" element={<Admin><PenAdminDashboard /></Admin>} />
            <Route path="/admin/pen/users" element={<Admin><PenAdminUsers /></Admin>} />
            <Route path="/admin/pen/packages" element={<Admin><PenAdminPackages /></Admin>} />
            <Route path="/admin/pen/templates" element={<Admin><PenAdminTemplates /></Admin>} />
            <Route path="/admin/pen/orders" element={<Admin><PenAdminOrders /></Admin>} />
            <Route path="/admin/pen/settings" element={<Admin><PenAdminSettings /></Admin>} />
            <Route path="/admin/chatflow" element={<Admin><ChatflowAdminDashboard /></Admin>} />
            <Route path="/admin/chatflow/tenants" element={<Admin><ChatflowAdminTenants /></Admin>} />
            <Route path="/admin/design" element={<Admin><DesignAdminDashboard /></Admin>} />
            <Route path="/admin/design/templates" element={<Admin><DesignAdminTemplates /></Admin>} />
            <Route path="/admin/sitespy" element={<Admin><SiteSpyAdminDashboard /></Admin>} />
            <Route path="/admin/stackposts" element={<Admin><StackpostsAdminDashboard /></Admin>} />
            <Route path="/admin/stackposts/tickets" element={<Admin><StackpostsAdminTickets /></Admin>} />
            <Route path="/admin/stackposts/withdrawals" element={<Admin><StackpostsAdminWithdrawals /></Admin>} />
            <Route path="/admin/stackposts/content" element={<Admin><StackpostsAdminContent /></Admin>} />
            <Route path="/admin/teleman" element={<Admin><TelemanAdminDashboard /></Admin>} />
            <Route path="/admin/toolsai" element={<Admin><ToolsaiAdminDashboard /></Admin>} />
            <Route path="/admin/toolsai/content" element={<Admin><ToolsaiAdminContent /></Admin>} />
            <Route path="/admin/whatsml" element={<Admin><WhatsMLAdminDashboard /></Admin>} />
            <Route path="/admin/zamnexus" element={<Admin><ZamAdminDashboard /></Admin>} />
            <Route path="/admin/seomanager" element={<Admin><SeoManagerAdminDashboard /></Admin>} />
            <Route path="/admin/whatsapp/settings" element={<Admin><WhatsappAdminSettings /></Admin>} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/"replace />} />
          </Routes>
        </Suspense></ErrorBoundary>
        <ToastContainer position="top-right" theme="colored" autoClose={4000} />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
