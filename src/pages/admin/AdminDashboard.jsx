import React from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Building2, Package, FileText, MessageSquare, Calendar,
  TrendingUp, DollarSign, Crown, Star, Zap, BarChart3, Activity,
  ShieldCheck, Database, Globe, ArrowRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["adm-users"], queryFn: () => db.User.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["adm-exhibitors"], queryFn: () => db.ExhibitorProfile.list() });
  const { data: buyers = [] } = useQuery({ queryKey: ["adm-buyers"], queryFn: () => db.BuyerProfile.list() });
  const { data: products = [] } = useQuery({ queryKey: ["adm-products"], queryFn: () => db.Product.list() });
  const { data: events = [] } = useQuery({ queryKey: ["adm-events"], queryFn: () => db.Event.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ["adm-meetings"], queryFn: () => db.Meeting.list() });
  const { data: leads = [] } = useQuery({ queryKey: ["adm-leads"], queryFn: () => db.LeadProfile.list() });
  const { data: subs = [] } = useQuery({ queryKey: ["adm-subs"], queryFn: () => db.PremiumBoothSubscription.list() });
  const { data: connections = [] } = useQuery({ queryKey: ["adm-conn"], queryFn: () => db.Connection.list() });
  const { data: billingTx = [] } = useQuery({ queryKey: ["adm-billing"], queryFn: () => db.BillingTransaction.list() });

  const totalRevenue = billingTx.filter(t => t.status === "succeeded").reduce((s, t) => s + (t.amount || 0), 0);
  const activeSubs = subs.filter(s => s.status === "active").length;
  const activeEvents = events.filter(e => e.status === "active" || e.event_status === "live").length;

  const primaryStats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/users" },
    { label: "Exhibitors", value: exhibitors.length, icon: Building2, color: "text-purple-600", bg: "bg-purple-50", link: "/admin/exhibitors" },
    { label: "Buyers", value: buyers.length, icon: Users, color: "text-green-600", bg: "bg-green-50", link: "/admin/users" },
    { label: "Products", value: products.length, icon: Package, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/products" },
    { label: "Events", value: events.length, icon: Calendar, color: "text-red-600", bg: "bg-red-50", link: "/admin/events" },
    { label: "Meetings", value: meetings.length, icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50", link: "/admin/leads" },
    { label: "Leads", value: leads.length, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50", link: "/admin/leads" },
    { label: "Connections", value: connections.length, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50", link: "/admin/connections" },
    { label: "Active Subscriptions", value: activeSubs, icon: Crown, color: "text-amber-600", bg: "bg-amber-50", link: "/admin/revenue" },
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", link: "/admin/revenue" },
    { label: "Active Events", value: activeEvents, icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50", link: "/admin/events" },
    { label: "Catalogues", value: 0, icon: FileText, color: "text-slate-600", bg: "bg-slate-50", link: "/admin/catalogues" },
  ];

  const userRoleData = [
    { name: "Exhibitors", value: users.filter(u => u.user_role === "exhibitor").length },
    { name: "Buyers", value: users.filter(u => u.user_role === "buyer").length },
    { name: "Admins", value: users.filter(u => u.role === "admin").length },
    { name: "Others", value: users.filter(u => !u.user_role && u.role !== "admin").length },
  ].filter(d => d.value > 0);

  const subStatusData = [
    { name: "Active", value: subs.filter(s => s.status === "active").length },
    { name: "Trial", value: subs.filter(s => s.status === "trial").length },
    { name: "Expired", value: subs.filter(s => s.status === "expired").length },
    { name: "Cancelled", value: subs.filter(s => s.status === "cancelled").length },
  ].filter(d => d.value > 0);

  const quickLinks = [
    { label: "User Management", desc: "Manage all users & roles", link: "/admin/users", icon: Users, color: "border-blue-200 hover:border-blue-400" },
    { label: "Revenue Center", desc: "Subscriptions & transactions", link: "/admin/revenue", icon: DollarSign, color: "border-green-200 hover:border-green-400" },
    { label: "Lead Intelligence", desc: "Leads, scores & meetings", link: "/admin/leads", icon: Zap, color: "border-yellow-200 hover:border-yellow-400" },
    { label: "Event Control", desc: "Events, venues & exhibitors", link: "/admin/events", icon: Calendar, color: "border-red-200 hover:border-red-400" },
    { label: "Media Library", desc: "Images, docs & assets", link: "/admin/media", icon: FileText, color: "border-purple-200 hover:border-purple-400" },
    { label: "Data Quality", desc: "Detect & fix data issues", link: "/admin/data-quality", icon: ShieldCheck, color: "border-teal-200 hover:border-teal-400" },
    { label: "System Settings", desc: "Branding, email, AI config", link: "/admin/settings", icon: Database, color: "border-slate-200 hover:border-slate-400" },
    { label: "Audit Logs", desc: "Who did what & when", link: "/admin/audit", icon: Activity, color: "border-indigo-200 hover:border-indigo-400" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Admin Control Center
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Complete operational overview — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          All Systems Operational
        </div>
      </div>

      {/* Primary stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {primaryStats.map(stat => (
          <Link key={stat.label} to={stat.link}>
            <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer group">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{stat.value}</p>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {userRoleData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No users yet</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={userRoleData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                      {userRoleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {userRoleData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="font-bold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            {subStatusData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={subStatusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {subStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick access modules */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(ql => (
            <Link key={ql.label} to={ql.link}>
              <div className={`bg-white border-2 rounded-xl p-4 transition-all duration-200 ${ql.color} hover:shadow-md group cursor-pointer`}>
                <ql.icon className="w-5 h-5 text-slate-500 group-hover:text-slate-800 mb-2 transition-colors" />
                <p className="text-sm font-semibold text-slate-800">{ql.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ql.desc}</p>
                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 mt-2 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}