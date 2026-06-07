import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Users, Building2, Package, FileText,
  Calendar, MessageSquare, Menu, X, ChevronRight, ShieldCheck, LogOut
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/exhibitors", label: "Exhibitors", icon: Building2 },
  { path: "/admin/products", label: "Products", icon: Package },
  { path: "/admin/catalogues", label: "Catalogues", icon: FileText },
  { path: "/admin/events", label: "Events", icon: Calendar },
  { path: "/admin/connections", label: "Connections", icon: MessageSquare },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const SidebarLinks = ({ onNavigate }) => (
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-4">
      {navItems.map(item => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive(item)
              ? "bg-white/15 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {item.label}
          {isActive(item) && <ChevronRight className="w-3 h-3 ml-auto" />}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-slate-900 text-white h-full">
        <div className="p-5 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-2.5">
            <img src={LOGO} alt="Booth Bridge" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <p className="text-xs font-bold text-white tracking-widest uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>Booth Bridge</p>
              <p className="text-[10px] text-white/50 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin Panel</p>
            </div>
          </Link>
        </div>
        <SidebarLinks />
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10">
            ← Back to App
          </Link>
          <button
            onClick={() => base44.auth.logout("/login")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <span className="font-bold text-white text-sm">Admin Panel</span>
              <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5 text-white/70" /></button>
            </div>
            <SidebarLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-slate-900 text-white shrink-0">
          <button onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></button>
          <span className="font-bold text-sm">Admin Panel</span>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}