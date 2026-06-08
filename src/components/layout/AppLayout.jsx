import React, { useState } from "react";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  QrCode, Users, Inbox, Calendar, LayoutDashboard,
  Bell, Menu, X, Package, Camera, CreditCard, LogOut, User,
  Bookmark, BookmarkCheck, Library, CalendarDays, Search, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function AppLayout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { path: "/organizer-analytics", icon: BarChart3, labelKey: "nav.analytics" },
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
    { path: "/discover", icon: Search, labelKey: "nav.discover" },
  ];

  const navItems = user?.user_role === "exhibitor" ? exhibitorNav : buyerNav;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const notifs = await base44.entities.Notification.filter({ user_id: user.id, read: false });
      return notifs.length;
    },
    refetchInterval: 10000,
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const logoText = (size = "base") => (
    <span
      className={`font-bold text-white tracking-widest uppercase ${size === "sm" ? "text-xs" : size === "xs" ? "text-[10px]" : "text-sm"}`}
      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}
    >
      Booth Bridge
    </span>
  );

  const NavLinks = ({ onNavigate }) => (
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
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="Booth Bridge" className="w-9 h-9 rounded-xl object-cover" />
            {logoText("base")}
          </Link>
        </div>
        <NavLinks onNavigate={undefined} />
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col animate-in slide-in-from-left">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={LOGO} alt="Booth Bridge" className="w-8 h-8 rounded-xl object-cover" />
                {logoText("sm")}
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shrink-0 relative z-20">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO} alt="Booth Bridge" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-foreground tracking-widest uppercase text-[10px]" style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}>
              Booth Bridge
            </span>
          </div>
          <Link to="/notifications" className="relative" aria-label={t("nav.notifications")}>
            <Bell className="w-5 h-5" />
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