import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { auth } from "@/api/authClient";
import { useAuth } from "@/lib/AuthContext";
import { isSupabase } from "@/config/backend";
import {
  LayoutDashboard, Users, Building2, Package, FileText,
  Calendar, MessageSquare, Menu, X, ChevronRight, ShieldCheck,
  LogOut, TrendingUp, Image, Settings, Activity, Shield, Zap,
  ChevronDown, Search, CheckCircle2, Radio, HeadphonesIcon,
  Ticket, ScanLine, FlaskConical, Monitor
} from "lucide-react";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

const navGroups = [
  {
    label: "Overview",
    items: [
      { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: "Users & Accounts",
    items: [
      { path: "/admin/users", label: "Users", icon: Users },
      { path: "/admin/exhibitors", label: "Exhibitors", icon: Building2 },
    ]
  },
  {
    label: "Content",
    items: [
      { path: "/admin/products", label: "Products", icon: Package },
      { path: "/admin/catalogues", label: "Catalogues", icon: FileText },
      { path: "/admin/events", label: "Events", icon: Calendar },
      { path: "/admin/media", label: "Media Library", icon: Image },
    ]
  },
  {
    label: "Intelligence",
    items: [
      { path: "/admin/leads", label: "Lead Intelligence", icon: Zap },
      { path: "/admin/connections", label: "Connections", icon: MessageSquare },
    ]
  },
  {
    label: "Finance",
    items: [
      { path: "/admin/revenue", label: "Revenue Center", icon: TrendingUp },
    ]
  },
  {
    label: "Event Operations",
    items: [
      { path: "/admin/event-readiness", label: "Readiness Center", icon: CheckCircle2 },
      { path: "/admin/control-room", label: "Live Control Room", icon: Radio },
      { path: "/admin/support-center", label: "Support Center", icon: HeadphonesIcon },
    ]
  },
  {
    label: "Production",
    items: [
      { path: "/admin/search", label: "Global Search", icon: Search },
      { path: "/admin/tickets", label: "Support Tickets", icon: Ticket },
      { path: "/admin/nfc-validation", label: "NFC Validation", icon: Radio },
      { path: "/admin/ocr-review", label: "OCR Review", icon: ScanLine },
      { path: "/admin/stress-test", label: "Stress Test", icon: FlaskConical },
      { path: "/admin/monitoring", label: "Monitoring", icon: Monitor },
    ]
  },
  {
    label: "System",
    items: [
      { path: "/admin/data-quality", label: "Data Quality", icon: Shield },
      { path: "/admin/audit", label: "Audit Log", icon: Activity },
      { path: "/admin/settings", label: "Settings", icon: Settings },
    ]
  },
];

const ADMIN_ROLES = new Set(["admin", "superadmin", "systemadmin", "supportadmin"]);

export default function AdminLayout() {
  const { user, authChecked, isLoadingAuth } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const isAdminAuthed = isSupabase()
    ? ADMIN_ROLES.has((user?.role || "").toLowerCase())
    : auth.isAdminSession();
  if (isSupabase() && (!authChecked || isLoadingAuth)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Verifying admin access...
      </div>
    );
  }
  if (!isAdminAuthed) return <Navigate to="/admin-login" replace />;

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const toggleGroup = (label) => setCollapsed(c => ({ ...c, [label]: !c[label] }));

  const SidebarContent = ({ onNavigate = () => {} }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
          <img src={LOGO} alt="BoothBridge" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <p className="text-xs font-bold text-white tracking-widest uppercase" style={{ fontFamily: "'Orbitron', sans-serif" }}>Booth Bridge</p>
            <p className="text-[10px] text-white/50 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Admin Panel</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors"
            >
              {group.label}
              <ChevronDown className={`w-3 h-3 transition-transform ${collapsed[group.label] ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed[group.label] && (
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive(item)
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {isActive(item) && <ChevronRight className="w-3 h-3 ml-auto text-white/50" />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          ← Back to App
        </Link>
        <button
          onClick={() => {
            if (isSupabase()) {
              auth.logout("/admin-login");
              return;
            }
            auth.clearAdminSession();
            window.location.href = "/admin-login";
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-slate-900 text-white h-full">
        <SidebarContent />
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
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-white shrink-0 shadow-sm">
          <button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5 text-slate-600" /></button>
          <div className="flex-1">
            <p className="text-xs text-slate-400">BoothBridge Admin Control Center</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-md px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}