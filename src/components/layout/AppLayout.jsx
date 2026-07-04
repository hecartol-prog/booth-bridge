import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  QrCode, Users, Inbox, Calendar, LayoutDashboard,
  Bell, Menu, X, Package, Camera, CreditCard, LogOut, User,
  Bookmark, BookmarkCheck, Library, CalendarDays, Search, BarChart3, PlugZap, SlidersHorizontal,
  Flame, Crown, Activity, Nfc, ScanLine, ShieldCheck, ChevronDown
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/api/authClient";
import { db } from "@/utils/dbClient";
import { useQuery } from "@tanstack/react-query";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

const exhibitorNav = [
  { path: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { path: "/qr", icon: QrCode, labelKey: "nav.myQR" },
  { path: "/connections", icon: Users, labelKey: "nav.leads" },
  { path: "/rfi-inbox", icon: Inbox, labelKey: "nav.rfiInbox" },
  { path: "/catalog-library", icon: Library, labelKey: "nav.catalogs" },
  { path: "/products", icon: Package, labelKey: "nav.products" },
  { path: "/meetings", icon: Calendar, labelKey: "nav.meetings" },
  { path: "/business-card", icon: CreditCard, labelKey: "nav.myCard" },
  { path: "/events", icon: CalendarDays, labelKey: "nav.events" },
  { path: "/lead-intelligence", icon: Flame, labelKey: "nav.leads" },
  { path: "/analytics", icon: BarChart3, labelKey: "nav.analytics" },
  { path: "/premium-booth", icon: Crown, labelKey: "nav.premium" },
  { path: "/nfc", icon: Nfc, labelKey: "nav.nfc" },
  { path: "/organizer-analytics", icon: Activity, labelKey: "nav.orgAnalytics" },
  { path: "/organizer-command", icon: Activity, labelKey: "nav.commandCenter" },
  { path: "/integrations", icon: PlugZap, labelKey: "nav.integrations" },
  { path: "/billing", icon: CreditCard, labelKey: "nav.billing" },
];

const buyerNav = [
  { path: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { path: "/scan", icon: Camera, labelKey: "nav.scanBooth" },
  { path: "/saved-booths", icon: Bookmark, labelKey: "nav.savedBooths" },
  { path: "/my-library", icon: BookmarkCheck, labelKey: "nav.myLibrary" },
  { path: "/my-rfis", icon: Inbox, labelKey: "nav.requests" },
  { path: "/meetings", icon: Calendar, labelKey: "nav.meetings" },
  { path: "/qr", icon: QrCode, labelKey: "nav.myQR" },
  { path: "/events", icon: CalendarDays, labelKey: "nav.events" },
  { path: "/workspace/compare", icon: SlidersHorizontal, labelKey: "nav.workspace" },
  { path: "/discover", icon: Search, labelKey: "nav.discover" },
  { path: "/nfc", icon: Nfc, labelKey: "nav.nfc" },
  { path: "/ocr-scanner", icon: ScanLine, labelKey: "nav.ocrScanner" },
  { path: "/contacts", icon: Users, labelKey: "nav.contacts" },
  { path: "/billing", icon: CreditCard, labelKey: "nav.billing" },
];

const IMPERSONATE_KEY = "bb_impersonate_as_user";
const IMPERSONATE_ROLE_KEY = "bb_impersonate_role";

function AdminRoleSwitcher({ user }) {
  const isImpersonating = localStorage.getItem(IMPERSONATE_KEY) === "true";

  const switchToUserMode = async (userRole) => {
    localStorage.setItem(IMPERSONATE_KEY, "true");
    localStorage.setItem(IMPERSONATE_ROLE_KEY, userRole);
    window.location.href = "/";
  };

  const switchToAdminMode = async () => {
    localStorage.removeItem(IMPERSONATE_KEY);
    localStorage.removeItem(IMPERSONATE_ROLE_KEY);
    window.location.href = "/admin";
  };

  if (isImpersonating) {
    return (
      <button
        onClick={switchToAdminMode}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors mb-1"
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">Exit User Preview</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-sidebar-accent/60 text-sidebar-primary border border-sidebar-border hover:bg-sidebar-accent transition-colors mb-1">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Admin Controls</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => switchToUserMode("exhibitor")}>
          <LayoutDashboard className="w-4 h-4 mr-2" /> Preview as Exhibitor
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchToUserMode("buyer")}>
          <Search className="w-4 h-4 mr-2" /> Preview as Buyer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { window.location.href = "/admin"; }}>
          <ShieldCheck className="w-4 h-4 mr-2" /> Go to Admin Panel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ navItems, location, t, unreadCount, onNavigate, onLogout, user }) {
  return (
    <>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === item.path
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        {(user?.role || "").toLowerCase() === "admin" && (
          <AdminRoleSwitcher user={user} />
        )}
        <Link
          to="/notifications"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 relative"
        >
          <Bell className="w-4 h-4" />
          {t("nav.notifications")}
          {unreadCount > 0 && (
            <Badge className="ml-auto bg-accent text-accent-foreground text-xs px-1.5 py-0.5">{unreadCount}</Badge>
          )}
        </Link>
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        >
          <User className="w-4 h-4" />
          {t("nav.profile")}
        </Link>
        <LanguageSwitcher />
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminRole = (user?.role || "").toLowerCase() === "admin";
  const previewRole = localStorage.getItem(IMPERSONATE_ROLE_KEY);
  const navRole = isAdminRole && localStorage.getItem(IMPERSONATE_KEY) === "true"
    ? previewRole || "exhibitor"
    : user?.user_role;
  // Admin defaults to exhibitor nav unless explicitly switched to buyer
  const navItems = navRole === "buyer" ? buyerNav : exhibitorNav;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const notifs = await db.Notification.filter({ user_id: user.id, read: false });
      return notifs.length;
    },
    refetchInterval: 10000,
    enabled: !!user?.id,
  });

  const handleLogout = () => auth.logout("/login");

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="Booth Bridge" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-white tracking-widest uppercase text-sm" style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}>
              Booth Bridge
            </span>
          </Link>
        </div>
        <SidebarContent
          navItems={navItems}
          location={location}
          t={t}
          unreadCount={unreadCount}
          onNavigate={undefined}
          onLogout={handleLogout}
          user={user}
        />
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" style={{ pointerEvents: "all" }}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={LOGO} alt="Booth Bridge" className="w-8 h-8 rounded-xl object-cover" />
                <span className="font-bold text-white tracking-widest uppercase text-xs" style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}>
                  Booth Bridge
                </span>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <SidebarContent
              navItems={navItems}
              location={location}
              t={t}
              unreadCount={unreadCount}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              user={user}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="Booth Bridge" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-foreground tracking-widest uppercase text-[10px]" style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}>
              Booth Bridge
            </span>
          </div>
          <Link to="/notifications" className="relative p-1" aria-label={t("nav.notifications")}>
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}