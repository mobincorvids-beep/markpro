/**
 * Application Shell - Stitch Marketing Command Layout
 *
 * 1. Top Collapse Button inside logo header (top-right of sidebar header).
 * 2. Working topbar search bar with live tool filtering popover.
 * 3. Fixed profile dropdown menu with clean items & theme toggle.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import Tooltip from '../ui/Tooltip';
import markproLogo from '../../assets/markpro-logo.png';
import RouteProgress from '../ui/RouteProgress';
import { PageTransition, Popover } from '../ui/Motion';
import {
  LayoutDashboard, Search, Code2, TrendingUp, ShoppingCart, Radio,
  ChevronLeft, ChevronRight, LogOut, Menu, X, Zap,
  Settings, CreditCard, Wallet, Users, Package, Key, BarChart3,
  FileText, Cpu, Megaphone, MessageCircle, Image as ImageIcon,
  MessageSquare, Star, Link2, FolderOpen, QrCode, Bot, FileSearch, Globe,
  Send, Edit3, Mail, Palette, Shield, Contact, Sun, Moon,
  Bell, Camera, Check, Rocket, Building2, Plus, ArrowRight, CornerDownLeft,
} from 'lucide-react';

/* All searchable tools for live search popup */
const SEARCHABLE_ITEMS = [
  { label: 'Dashboard',             category: 'Overview', to: '/dashboard',     icon: LayoutDashboard },
  { label: 'SEO Tools Hub',         category: 'SEO',      to: '/seo',           icon: Search },
  { label: 'Site Audit',            category: 'SEO',      to: '/seo/audit',     icon: BarChart3 },
  { label: 'Rank Tracker',          category: 'SEO',      to: '/rank',          icon: TrendingUp },
  { label: 'SiteSpy Analytics',     category: 'SEO',      to: '/sitespy',       icon: FileSearch },
  { label: 'Meta Manager',          category: 'SEO',      to: '/seo-manager',   icon: FileText },
  { label: 'WhatsApp Hub',          category: 'Messaging',to: '/whatsapp',      icon: MessageCircle },
  { label: 'WhatsApp Live Chat',    category: 'Messaging',to: '/whatsapp/chat', icon: MessageSquare },
  { label: 'WA Campaigns',          category: 'Messaging',to: '/whatsapp/campaigns', icon: Megaphone },
  { label: 'Email & SMS Mailer',    category: 'Messaging',to: '/mailer',        icon: Mail },
  { label: 'Messenger ChatBots',    category: 'Messaging',to: '/chatflow',      icon: Bot },
  { label: 'Voice & Telesales',     category: 'Messaging',to: '/teleman',       icon: Radio },
  { label: 'Post Scheduler',        category: 'Publish',  to: '/stackposts',    icon: Send },
  { label: 'Social Stream',         category: 'Publish',  to: '/stream',        icon: Radio },
  { label: 'Social Proof',          category: 'Publish',  to: '/social',        icon: TrendingUp },
  { label: 'AI Studio',             category: 'AI',       to: '/toolsai',       icon: Cpu },
  { label: 'AI Writer',             category: 'AI',       to: '/toolsai/write', icon: Edit3 },
  { label: 'AI Image Generator',    category: 'AI',       to: '/toolsai/images',icon: ImageIcon },
  { label: 'Design Studio',         category: 'Design',   to: '/design',        icon: Palette },
  { label: 'Bio Pages Builder',     category: 'Links',    to: '/biolinks',      icon: Globe },
  { label: 'URL Shortener',         category: 'Links',    to: '/biolinks/links',icon: Link2 },
  { label: 'QR Code Generator',     category: 'Links',    to: '/biolinks/tools',icon: QrCode },
  { label: 'Document Vault',        category: 'Files',    to: '/docs/drive',    icon: FolderOpen },
  { label: 'CRM & Contacts',        category: 'CRM',      to: '/zam',           icon: Contact },
  { label: 'Lead Finder',           category: 'CRM',      to: '/zam/leads',     icon: TrendingUp },
  { label: 'SMM Panel Home',        category: 'SMM',      to: '/smm',           icon: ShoppingCart },
  { label: 'SMM New Order',         category: 'SMM',      to: '/smm/new-order', icon: ShoppingCart },
  { label: 'SMM Orders List',       category: 'SMM',      to: '/smm/orders',    icon: Package },
  { label: 'Developer Tools',       category: 'Dev',      to: '/cyber',         icon: Code2 },
  { label: 'Account Settings',      category: 'Settings', to: '/social/settings',icon: Settings },
  { label: 'Billing & Plans',       category: 'Billing',  to: '/billing',       icon: CreditCard },
  { label: 'Add Funds / Top Up',    category: 'Billing',  to: '/billing/topup', icon: Wallet },
];

const GROUPS = [
  {
    id: 'growth', label: 'Search & Growth', icon: Search,
    match: ['/seo', '/rank', '/sitespy', '/seo-manager'],
    items: [
      { to: '/seo',          icon: Search,     label: 'SEO Tools Hub' },
      { to: '/seo/audit',    icon: BarChart3,  label: 'Site Audit' },
      { to: '/rank',         icon: TrendingUp, label: 'Rank Tracker' },
      { to: '/rank/projects',icon: Globe,      label: 'Tracked Projects' },
      { to: '/sitespy',      icon: FileSearch, label: 'SiteSpy Analytics' },
      { to: '/seo-manager',  icon: FileText,   label: 'Meta Manager' },
    ],
  },
  {
    id: 'engage', label: 'Messaging', icon: MessageCircle,
    match: ['/whatsapp', '/mailer', '/chatflow', '/teleman'],
    items: [
      { to: '/whatsapp',           icon: MessageCircle, label: 'WhatsApp Hub' },
      { to: '/whatsapp/chat',      icon: MessageSquare, label: 'Live Chat' },
      { to: '/whatsapp/campaigns', icon: Megaphone,     label: 'WA Campaigns' },
      { to: '/mailer',             icon: Mail,          label: 'Email & SMS' },
      { to: '/chatflow',           icon: Bot,           label: 'Messenger Bots' },
      { to: '/teleman',            icon: Radio,         label: 'Voice & Telesales' },
    ],
  },
  {
    id: 'publish', label: 'Publishing', icon: Send,
    match: ['/stackposts', '/stream', '/social'],
    items: [
      { to: '/stackposts',         icon: Send,       label: 'Post Scheduler' },
      { to: '/stream',             icon: Radio,      label: 'Social Stream' },
      { to: '/social',             icon: TrendingUp, label: 'Social Proof' },
      { to: '/social/campaigns',   icon: Megaphone,  label: 'Proof Campaigns' },
    ],
  },
  {
    id: 'create', label: 'Create with AI', icon: Cpu,
    match: ['/toolsai', '/design'],
    items: [
      { to: '/toolsai',        icon: Cpu,       label: 'AI Studio' },
      { to: '/toolsai/write',  icon: Edit3,     label: 'AI Writer' },
      { to: '/toolsai/images', icon: ImageIcon, label: 'AI Images' },
      { to: '/design',         icon: Palette,   label: 'Design Studio' },
    ],
  },
  {
    id: 'links', label: 'Links & Files', icon: Link2,
    match: ['/biolinks', '/bio', '/docs'],
    items: [
      { to: '/biolinks',       icon: Globe,      label: 'Bio Pages' },
      { to: '/biolinks/links', icon: Link2,      label: 'Short Links' },
      { to: '/biolinks/tools', icon: QrCode,     label: 'QR Codes' },
      { to: '/docs/drive',     icon: FolderOpen, label: 'Document Vault' },
    ],
  },
  {
    id: 'crm', label: 'CRM & Leads', icon: Contact,
    match: ['/zam'],
    items: [
      { to: '/zam',          icon: LayoutDashboard, label: 'Nexus Overview' },
      { to: '/zam/contacts', icon: Users,           label: 'Contacts' },
      { to: '/zam/leads',    icon: TrendingUp,      label: 'Lead Finder' },
    ],
  },
  {
    id: 'smm', label: 'SMM Panel', icon: ShoppingCart,
    match: ['/smm'],
    items: [
      { to: '/smm',            icon: LayoutDashboard, label: 'Panel Home' },
      { to: '/smm/new-order',  icon: ShoppingCart,    label: 'New Order' },
      { to: '/smm/orders',     icon: Package,         label: 'My Orders' },
      { to: '/smm/services',   icon: Star,            label: 'Services' },
      { to: '/smm/add-funds',  icon: Wallet,          label: 'Add Funds' },
    ],
  },
  {
    id: 'dev', label: 'Developer Tools', icon: Code2,
    match: ['/cyber'],
    items: [
      { to: '/cyber',       icon: Code2,  label: 'Tools Hub' },
      { to: '/cyber/tools', icon: Search, label: 'All Utilities' },
    ],
  },
  {
    id: 'account', label: 'Account & Billing', icon: CreditCard,
    match: ['/billing', '/social/billing', '/social/settings', '/smm/profile'],
    items: [
      { to: '/billing',         icon: CreditCard, label: 'Plan & Invoices' },
      { to: '/billing/topup',   icon: Wallet,     label: 'Add Funds' },
      { to: '/social/settings', icon: Settings,   label: 'Settings' },
      { to: '/smm/profile',     icon: Key,        label: 'API Key' },
    ],
  },
];

const ADMIN_GROUP = {
  id: 'admin', label: 'Administration', icon: Shield,
  match: ['/admin'],
  items: [
    { to: '/admin',               icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/users',         icon: Users,           label: 'Users' },
    { to: '/admin/plans',         icon: CreditCard,      label: 'Plans' },
    { to: '/admin/payments',      icon: Wallet,          label: 'Payments' },
    { to: '/admin/smm',           icon: ShoppingCart,    label: 'SMM Panel' },
    { to: '/admin/smm/services',  icon: Star,            label: 'SMM Services' },
    { to: '/admin/smm/deposits',  icon: Wallet,          label: 'Pending Deposits' },
    { to: '/admin/payments/local',icon: Wallet,          label: 'Local Payments' },
    { to: '/admin/smm/settings',  icon: Settings,        label: 'Platform Settings' },
    { to: '/admin/rank',          icon: TrendingUp,      label: 'Rank Tracker' },
    { to: '/admin/docs',          icon: FileText,        label: 'Document Vault' },
    { to: '/admin/publish',       icon: Send,            label: 'Publish & Brand AI' },
    { to: '/admin/aigen',         icon: ImageIcon,       label: 'AI Suite' },
    { to: '/admin/whatsapp/users',icon: MessageCircle,   label: 'WhatsApp Users' },
    { to: '/admin/bio',           icon: Contact,         label: 'Bio Pages' },
    { to: '/admin/bio/users',     icon: Users,           label: 'Bio Pages Users' },
    { to: '/admin/bio/templates', icon: Palette,         label: 'Bio Pages Templates' },
    { to: '/admin/biolinks',      icon: Link2,           label: 'BioLinks' },
    { to: '/admin/biolinks/users',icon: Users,           label: 'BioLinks Users' },
    { to: '/admin/biolinks/pages',icon: FolderOpen,      label: 'BioLinks Templates & Domains' },
    { to: '/admin/pen',           icon: Edit3,           label: 'Pen AI' },
    { to: '/admin/pen/users',     icon: Users,           label: 'Pen AI Users' },
    { to: '/admin/pen/packages',  icon: Package,         label: 'Pen AI Packages' },
    { to: '/admin/chatflow',      icon: MessageCircle,   label: 'ChatFlow' },
    { to: '/admin/chatflow/tenants', icon: Users,        label: 'ChatFlow Tenants' },
    { to: '/admin/design',        icon: Palette,         label: 'Design Studio' },
    { to: '/admin/design/templates', icon: FolderOpen,   label: 'Design Templates' },
    { to: '/admin/sitespy',       icon: TrendingUp,      label: 'SiteSpy' },
    { to: '/admin/stackposts',    icon: Send,            label: 'StackPosts' },
    { to: '/admin/stackposts/tickets', icon: MessageCircle, label: 'StackPosts Support' },
    { to: '/admin/stackposts/withdrawals', icon: Wallet, label: 'StackPosts Withdrawals' },
    { to: '/admin/teleman',       icon: MessageCircle,   label: 'Teleman' },
    { to: '/admin/toolsai',       icon: ImageIcon,       label: 'ToolsAI' },
    { to: '/admin/whatsml',       icon: MessageCircle,   label: 'WhatsML' },
    { to: '/admin/zamnexus',      icon: Contact,         label: 'ZAM Nexus' },
    { to: '/admin/seomanager',    icon: TrendingUp,      label: 'SEO Manager' },
    { to: '/admin/whatsapp/settings', icon: Settings,    label: 'WhatsApp Settings' },
  ],
};

const EXACT_ROOTS = new Set([
  '/seo', '/rank', '/cyber', '/bio', '/biolinks', '/docs', '/whatsapp', '/social',
  '/smm', '/stream', '/admin', '/publish', '/pen', '/design', '/mailer',
  '/stackposts', '/chatflow', '/teleman', '/toolsai', '/sitespy', '/zam',
  '/seo-manager', '/billing', '/dashboard',
]);

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <Tooltip label={collapsed ? label : null}>
      <NavLink
        to={to}
        end={EXACT_ROOTS.has(to)}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Icon className="nav-icon" />
        {!collapsed && <span className="nav-label">{label}</span>}
      </NavLink>
    </Tooltip>
  );
}

export default function AppLayout({ children }) {
  const { user, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const notifRef = useRef(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  /* Topbar search state */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const groups = useMemo(() => (isAdmin ? [...GROUPS, ADMIN_GROUP] : GROUPS), [isAdmin]);

  const activeGroup = useMemo(() => {
    const path = location.pathname;
    const hit = groups.find(g => g.match.some(m => path === m || path.startsWith(`${m}/`)));
    return hit?.id || null;
  }, [location.pathname, groups]);

  const [openGroup, setOpenGroup] = useState(activeGroup);
  useEffect(() => { if (activeGroup) setOpenGroup(activeGroup); }, [activeGroup]);

  /* Outside click handlers */
  useEffect(() => {
    const h = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  /* Ctrl/Cmd + K focuses the global search */
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* Lock background scroll + close drawer on Escape while it is open */
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  /* Live search results */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCHABLE_ITEMS.filter(
      item => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    ).slice(0, 7);
  }, [searchQuery]);

  useEffect(() => {
    let alive = true;
    accountAPI.notifications({ limit: 30 })
      .then(r => {
        const list = r?.data?.data?.notifications || r?.data?.notifications || [];
        if (alive) setNotifs(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const unread = notifs.filter(n => !n.read && !n.isRead).length;

  const handleAvatarPick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { window.alert('Please choose an image under 2 MB.'); return; }
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setUser(prev => ({ ...(prev || {}), avatar: preview }));
    try {
      const r = await accountAPI.uploadAvatar(file);
      const url = r?.data?.data?.avatar || r?.data?.avatar;
      if (url) setUser(prev => ({ ...(prev || {}), avatar: url }));
    } catch {
      setUser(prev => ({ ...(prev || {}), avatar: null }));
    } finally {
      URL.revokeObjectURL(preview);
      setUploading(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const initials = (user?.name || user?.email || 'MP')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-shell">
      <RouteProgress />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        {/* LOGO HEADER WITH TOP COLLAPSE BUTTON */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-brand">
            <div className="sidebar-logo-icon">
              <img src={markproLogo} alt="MarkPro" className="sidebar-logo-img" width={34} height={34} />
            </div>
            {!collapsed && (
              <div>
                <div className="sidebar-logo-text">MarkPro</div>
                <div className="sidebar-logo-sub">MARKETING COMMAND</div>
              </div>
            )}
          </div>

          {/* TOP COLLAPSE BUTTON AS REQUESTED BY USER */}
          <button
            type="button"
            className="sidebar-collapse-top-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="sidebar-body" aria-label="Main navigation">
          <div className="sidebar-quick">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
          </div>

          {groups.map(group => {
            const Icon = group.icon;
            const open = openGroup === group.id && !collapsed;
            return (
              <div className="sb-group" key={group.id}>
                <Tooltip label={collapsed ? group.label : null}>
                  <button
                    type="button"
                    className={`sb-group-btn ${open ? 'open' : ''}`}
                    onClick={() => {
                      if (collapsed) { setCollapsed(false); setOpenGroup(group.id); return; }
                      setOpenGroup(o => (o === group.id ? null : group.id));
                    }}
                  >
                    <Icon className="nav-icon" />
                    <span className="sb-group-label">{group.label}</span>
                    <ChevronRight size={13} className="sb-caret" />
                  </button>
                </Tooltip>
                {open && (
                  <div className="sb-group-items">
                    {group.items.map(item => (
                      <NavItem key={item.to} {...item} collapsed={false} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <NavLink to="/billing" className="sidebar-upgrade-btn">
            <Rocket size={14} />
            {!collapsed && <span>Upgrade Plan</span>}
          </NavLink>
        </div>
      </aside>

      {/* ── MAIN AREA ────────────────────────────────────────────── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon topbar-mobile-btn"
            onClick={() => setMobileOpen(m => !m)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            id="mob-menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* WORKING LIVE SEARCH WITH DROPDOWN */}
          <div className="topbar-search-wrap" ref={searchRef}>
            <div className="topbar-search">
              <Search size={15} color="var(--text-3)" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search tools and modules"
                placeholder="Search tools, modules, tasks..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  style={{ border: 'none', background: 'none', color: 'var(--text-3)', padding: 0, display: 'grid', placeItems: 'center' }}
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="topbar-search-kbd">Ctrl K</span>
              )}
            </div>

            {/* Live Search Popover */}
            {searchOpen && searchQuery.trim().length > 0 && (
              <div className="topbar-search-results">
                {searchResults.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center' }}>
                    No matching tools found for "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className="topbar-search-item"
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--brand-light)', color: 'var(--brand-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.category}</div>
                        </div>
                        <CornerDownLeft size={12} color="var(--text-3)" />
                      </NavLink>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Topbar Center Tabs */}
          <div className="topbar-tabs">
            <NavLink to="/dashboard" className={({ isActive }) => `topbar-tab ${isActive ? 'active' : ''}`}>Workspace</NavLink>
            <NavLink to="/reports" className={({ isActive }) => `topbar-tab ${isActive ? 'active' : ''}`}>Reports</NavLink>
            <NavLink to="/whatsapp" className="topbar-tab">Automation</NavLink>
          </div>

          {/* Actions Right */}
          <div className="topbar-actions">
            {/* Bell */}
            <div className="dropdown" ref={notifRef}>
              <button className="btn btn-ghost btn-icon" onClick={() => setNotifOpen(o => !o)} style={{ borderRadius: '50%', width: 52, height: 52 }}>
                <Bell size={30} strokeWidth={2.1} />
                {unread > 0 && <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid var(--bg, #fff)' }}>{unread > 9 ? '9+' : unread}</span>}
              </button>
              <Popover open={notifOpen} className="dropdown-menu" style={{ minWidth: 280 }}>
                <div className="dropdown-head" style={{ padding: '8px 12px', fontSize: 12.5, fontWeight: 700, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notifications</span>
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>No new notifications.</div>
                ) : notifs.slice(0, 5).map((n, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                    {n.title || n.message}
                  </div>
                ))}
              </Popover>
            </div>

            {/* Top Up button */}
            <NavLink to="/billing/topup" className="topbar-btn">
              Top Up
            </NavLink>

            {/* Create Campaign button */}
            <NavLink to="/whatsapp/campaigns/new" className="topbar-btn topbar-btn-primary">
              Create Campaign
            </NavLink>

            {/* Avatar Profile Dropdown */}
            <div className="dropdown" ref={profileRef}>
              <button
                type="button"
                className="topbar-avatar"
                onClick={() => setProfileOpen(p => !p)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'var(--brand-2)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
              </button>

              <Popover open={profileOpen} className="dropdown-menu">
                <div className="dropdown-profile">
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-2)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div className="dropdown-profile-info">
                    <div className="dropdown-profile-name">{user?.name || 'Muhammad Shozab'}</div>
                    <div className="dropdown-profile-email">{user?.email || 'm.shozab2005@gmail.com'}</div>
                  </div>
                </div>

                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarPick} style={{ display: 'none' }} />

                <NavLink to="/social/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <Settings size={14} /> Settings
                </NavLink>
                <NavLink to="/smm/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                  <Key size={14} /> API Key
                </NavLink>

                <div className="dropdown-sep" />

                {/* Theme toggle */}
                <button type="button" className="dropdown-item" onClick={() => { toggleTheme(); setProfileOpen(false); }}>
                  {theme === 'dark' ? <><Sun size={14} /> Light Mode</> : <><Moon size={14} /> Dark Mode</>}
                </button>

                <div className="dropdown-sep" />

                <button type="button" className="dropdown-item danger" onClick={handleLogout}>
                  <LogOut size={14} /> Sign Out
                </button>
              </Popover>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content" data-section={(location.pathname.split('/')[1] || 'home').toLowerCase()}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <style>{'@media(max-width:768px){#mob-menu{display:flex!important;}}'}</style>
    </div>
  );
}
