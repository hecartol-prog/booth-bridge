import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  QrCode, Users, Inbox, Calendar, LayoutDashboard,
  Bell, Menu, X, Package, Camera, CreditCard, LogOut, User,
  Bookmark, BookmarkCheck, Library
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const exhibitorNav = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/qr", icon: QrCode, label: "My QR" },
  { path: "/connections", icon: Users, label: "Leads" },
  { path: "/rfi-inbox", icon: Inbox, label: "RFI Inbox" },
  { path: "/catalog-library", icon: Library, label: "Catalogs" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/meetings", icon: Calendar, label: "Meetings" },
  { path: "/business-card", icon: CreditCard, label: "My Card" },
];

const buyerNav = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/scan", icon: Camera, label: "Scan Booth" },
  { path: "/saved-booths", icon: Bookmark, label: "Saved Booths" },
  { path: "/my-library", icon: BookmarkCheck, label: "My Library" },
  { path: "/my-rfis", icon: Inbox, label: "Requests" },
  { path: "/meetings", icon: Calendar, label: "Meetings" },
  { path: "/qr", icon: QrCode, label: "My QR" },
];

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = user?.role === "exhibitor" ? exhibitorNav : buyerNav;

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
      className={`font-bold text-sidebar-foreground tracking-widest uppercase ${size === "sm" ? "text-xs" : size === "xs" ? "text-[10px]" : "text-sm"}`}
      style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em" }}
    >
      Booth Bridge
    </span>
  );

  return (
    <div className="h-full bg-background flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="https://media.base44.com/images/public/6a1efdb97246f738e8422e59/1e8923133_LS20260603100316.png"
              alt="Booth Bridge"
              className="w-9 h-9 rounded-xl object-cover"
            />
            {logoText("base")}
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/notifications"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 relative"
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-auto bg-accent text-accent-foreground text-xs px-1.5 py-0.5">{unreadCount}</Badge>
            )}
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col animate-in slide-in-from-left">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="https://media.base44.com/images/public/6a1efdb97246f738e8422e59/1e8923133_LS20260603100316.png"
                  alt="Booth Bridge"
                  className="w-8 h-8 rounded-xl object-cover"
                />
                {logoText("sm")}
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-sidebar-border">
              <Link
                to="/notifications"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              >
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-accent text-accent-foreground text-xs px-1.5 py-0.5">{unreadCount}</Badge>
                )}
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/6a1efdb97246f738e8422e59/1e8923133_LS20260603100316.png"
              alt="Booth Bridge"
              className="w-7 h-7 rounded-lg object-cover"
            />
            {logoText("xs")}
          </div>
          <Link to="/notifications" className="relative">
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