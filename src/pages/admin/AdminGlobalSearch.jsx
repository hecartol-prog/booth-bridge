import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Building2, Package, Calendar, Ticket, Radio, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const ENTITY_CONFIG = [
  { key: "users", label: "Users", icon: Users, color: "bg-blue-100 text-blue-700", fields: ["full_name", "email"] },
  { key: "exhibitors", label: "Exhibitors", icon: Building2, color: "bg-purple-100 text-purple-700", fields: ["company_name", "contact_email"] },
  { key: "products", label: "Products", icon: Package, color: "bg-green-100 text-green-700", fields: ["title", "description"] },
  { key: "events", label: "Events", icon: Calendar, color: "bg-orange-100 text-orange-700", fields: ["name", "city", "country"] },
  { key: "tickets", label: "Support Tickets", icon: Ticket, color: "bg-red-100 text-red-700", fields: ["subject", "ticket_number", "description"] },
  { key: "nfc", label: "NFC Tags", icon: Radio, color: "bg-indigo-100 text-indigo-700", fields: ["tag_code", "tag_label", "event_name"] },
  { key: "leads", label: "Leads", icon: TrendingUp, color: "bg-yellow-100 text-yellow-700", fields: ["lead_name", "company_name", "email"] },
];

export default function AdminGlobalSearch() {
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: users = [] } = useQuery({ queryKey: ["gs-users"], queryFn: () => db.User.list("-created_date", 500) });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["gs-exhibitors"], queryFn: () => db.ExhibitorProfile.list("-created_date", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["gs-products"], queryFn: () => db.Product.list("-created_date", 500) });
  const { data: events = [] } = useQuery({ queryKey: ["gs-events"], queryFn: () => db.Event.list("-created_date", 200) });
  const { data: tickets = [] } = useQuery({ queryKey: ["gs-tickets"], queryFn: () => db.SupportTicket.list("-created_date", 200) });
  const { data: nfc = [] } = useQuery({ queryKey: ["gs-nfc"], queryFn: () => db.NFCProductTag.list("-created_date", 500) });
  const { data: leads = [] } = useQuery({ queryKey: ["gs-leads"], queryFn: () => db.LeadProfile.list("-created_date", 500) });

  const allData = { users, exhibitors, products, events, tickets, nfc, leads };

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const out = [];
    ENTITY_CONFIG.forEach(cfg => {
      if (entityFilter !== "all" && entityFilter !== cfg.key) return;
      const items = allData[cfg.key] || [];
      items.forEach(item => {
        const hit = cfg.fields.some(f => item[f] && String(item[f]).toLowerCase().includes(q));
        if (hit) {
          const title = cfg.fields.map(f => item[f]).filter(Boolean).join(" — ");
          out.push({ ...item, _type: cfg.key, _label: cfg.label, _color: cfg.color, _icon: cfg.icon, _title: title });
        }
      });
    });
    return out.slice(0, 100);
  }, [query, entityFilter, users, exhibitors, products, events, tickets, nfc, leads]);

  const grouped = useMemo(() => {
    const g = {};
    results.forEach(r => {
      if (!g[r._type]) g[r._type] = [];
      g[r._type].push(r);
    });
    return g;
  }, [results]);

  const adminLinkFor = (type, id) => {
    const map = { users: "/admin/users", exhibitors: "/admin/exhibitors", products: "/admin/products", events: "/admin/events", tickets: "/admin/tickets", leads: "/admin/leads" };
    return map[type] || "/admin";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="w-6 h-6 text-primary" /> Global Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Search across all platform entities</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search users, exhibitors, products, events, tickets, NFC tags, leads..." className="pl-10 h-11 text-base" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44 h-11"><SelectValue placeholder="All Entities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITY_CONFIG.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {query.length < 2 && (
        <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Type at least 2 characters to search</p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {ENTITY_CONFIG.map(c => (
              <span key={c.key} className={`px-3 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">
          <p className="font-medium">No results for "{query}"</p>
        </div>
      )}

      {Object.keys(grouped).map(type => {
        const cfg = ENTITY_CONFIG.find(c => c.key === type);
        const Icon = cfg?.icon || FileText;
        return (
          <div key={type} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{cfg?.label}</span>
              <Badge variant="secondary" className="ml-auto">{grouped[type].length}</Badge>
            </div>
            <div className="divide-y">
              {grouped[type].map((item, i) => (
                <div key={i} className="px-4 py-3 hover:bg-slate-50 flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                  <span className="text-sm font-medium flex-1">{item._title}</span>
                  <span className="text-xs text-muted-foreground font-mono">{item.id?.slice(0, 8)}</span>
                  <Link to={adminLinkFor(type, item.id)} className="text-xs text-primary hover:underline">Open →</Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {results.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
      )}
    </div>
  );
}