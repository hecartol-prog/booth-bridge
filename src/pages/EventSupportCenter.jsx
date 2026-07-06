import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, User, Building2, Package, QrCode, Wifi, FileText, MessageSquare, AlertCircle, CheckCircle2, Clock,
  ChevronRight, X, Ticket, Users
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TICKET_PRIORITIES = ["low", "medium", "high", "critical"];
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

// Local tickets stored in sessionStorage for demo (replace with entity in production)
function useTickets() {
  const [tickets, setTickets] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("bb_support_tickets") || "[]"); } catch { return []; }
  });
  const save = (t) => { sessionStorage.setItem("bb_support_tickets", JSON.stringify(t)); setTickets(t); };
  const addTicket = (ticket) => {
    const newT = { ...ticket, id: Date.now().toString(), created_at: new Date().toISOString(), status: "open" };
    save([newT, ...tickets]);
    return newT;
  };
  const updateTicket = (id, updates) => {
    const updated = tickets.map(t => t.id === id ? { ...t, ...updates } : t);
    save(updated);
  };
  return { tickets, addTicket, updateTicket };
}

function SearchResultCard({ result, onSelect }) {
  const icons = { user: User, exhibitor: Building2, product: Package, nfc: Wifi, qr: QrCode };
  const Icon = icons[result.type] || FileText;
  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg text-left"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{result.name}</p>
        <p className="text-xs text-muted-foreground">{result.sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

function RecordDetail({ record, onClose, onCreateTicket }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const actions = {
    exhibitor: [
      { label: "Regenerate QR Code", action: () => toast({ title: "QR Regenerated", description: "New QR code sent to exhibitor." }) },
      { label: "Resend Activation Email", action: () => toast({ title: "Email Sent", description: "Activation email resent." }) },
      { label: "Update Booth Number", action: () => toast({ title: "Booth Updated", description: "Booth number updated successfully." }) },
    ],
    user: [
      { label: "Reset Account", action: () => toast({ title: "Account Reset", description: "Account reset email sent." }) },
      { label: "Unlock Account", action: () => toast({ title: "Account Unlocked" }) },
      { label: "Resend Activation", action: () => toast({ title: "Activation Sent" }) },
    ],
    nfc: [
      { label: "Reassign NFC Tag", action: () => toast({ title: "NFC Reassigned" }) },
      { label: "Deactivate Tag", action: () => toast({ title: "Tag Deactivated" }) },
    ],
  };

  const availableActions = actions[record.type] || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{record.name}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            {Object.entries(record.fields || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-medium truncate">{v || "—"}</span>
              </div>
            ))}
          </div>

          {availableActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Support Actions</p>
              <div className="space-y-2">
                {availableActions.map(a => (
                  <Button key={a.label} variant="outline" size="sm" className="w-full justify-start" onClick={a.action}>
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            size="sm"
            onClick={() => { onCreateTicket(record); onClose(); }}
          >
            <Ticket className="w-4 h-4 mr-2" /> Create Support Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketForm({ prefill, onSave, onClose }) {
  const [title, setTitle] = useState(prefill?.name ? `Issue with ${prefill.name}` : "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">New Support Ticket</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Title *</p>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Describe the issue" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              className="w-full min-h-20 px-3 py-2 text-sm border rounded-md resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full h-9 px-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {TICKET_PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Assign To</p>
              <Input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Staff name" />
            </div>
          </div>
          {prefill && (
            <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              Linked to: <span className="font-medium text-foreground">{prefill.name}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => onSave({ title, description, priority, assignee, linked: prefill?.name })} disabled={!title}>
              Create Ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventSupportCenter() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketPrefill, setTicketPrefill] = useState(null);
  const [ticketFilter, setTicketFilter] = useState("all");
  const { tickets, addTicket, updateTicket } = useTickets();

  const { data: users = [] } = useQuery({ queryKey: ["esc-users"], queryFn: () => db.User.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["esc-exhibitors"], queryFn: () => db.ExhibitorProfile.list() });
  const { data: products = [] } = useQuery({ queryKey: ["esc-products"], queryFn: () => db.Product.list() });
  const { data: nfcProfiles = [] } = useQuery({ queryKey: ["esc-nfc"], queryFn: () => db.NFCProfile.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ["esc-meetings"], queryFn: () => db.Meeting.list() });

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results = [];

    users.forEach(u => {
      if (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) {
        results.push({
          type: "user",
          id: u.id,
          name: u.full_name || u.email,
          sub: `User · ${u.email}`,
          fields: { email: u.email, role: u.role, created: u.created_date?.slice(0, 10) },
        });
      }
    });

    exhibitors.forEach(e => {
      if (e.company_name?.toLowerCase().includes(q) || e.booth_number?.toLowerCase().includes(q)) {
        results.push({
          type: "exhibitor",
          id: e.id,
          name: e.company_name,
          sub: `Exhibitor · Booth ${e.booth_number} · ${e.event_name}`,
          fields: { booth: e.booth_number, event: e.event_name, country: e.country, status: e.live_status },
        });
      }
    });

    products.forEach(p => {
      if (p.title?.toLowerCase().includes(q)) {
        results.push({
          type: "product",
          id: p.id,
          name: p.title,
          sub: `Product · MOQ: ${p.moq || "N/A"}`,
          fields: { title: p.title, moq: p.moq, status: p.status },
        });
      }
    });

    nfcProfiles.forEach(n => {
      if (n.nfc_identifier?.toLowerCase().includes(q) || n.display_name?.toLowerCase().includes(q)) {
        results.push({
          type: "nfc",
          id: n.id,
          name: n.display_name || n.nfc_identifier,
          sub: `NFC Tag · ${n.active ? "Active" : "Inactive"}`,
          fields: { identifier: n.nfc_identifier, company: n.company, booth: n.booth_number, active: n.active ? "Yes" : "No" },
        });
      }
    });

    return results.slice(0, 15);
  }, [searchQuery, users, exhibitors, products, nfcProfiles]);

  const filteredTickets = ticketFilter === "all" ? tickets : tickets.filter(t => t.status === ticketFilter);

  const handleCreateTicket = (data) => {
    addTicket(data);
    setShowTicketForm(false);
    setTicketPrefill(null);
    toast({ title: "Ticket Created", description: `#${data.title} — ${data.priority} priority` });
  };

  const statsData = [
    { label: "Open Tickets", value: tickets.filter(t => t.status === "open").length, color: "text-amber-600", bg: "bg-amber-50", icon: AlertCircle },
    { label: "In Progress", value: tickets.filter(t => t.status === "in_progress").length, color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
    { label: "Resolved", value: tickets.filter(t => t.status === "resolved").length, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
    { label: "Total Records", value: users.length + exhibitors.length, color: "text-purple-600", bg: "bg-purple-50", icon: Users },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onCreateTicket={(r) => { setTicketPrefill(r); setShowTicketForm(true); }}
        />
      )}
      {showTicketForm && (
        <TicketForm
          prefill={ticketPrefill}
          onSave={handleCreateTicket}
          onClose={() => { setShowTicketForm(false); setTicketPrefill(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> Event Support Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Search, diagnose, and resolve exhibitor & attendee issues</p>
        </div>
        <Button onClick={() => { setTicketPrefill(null); setShowTicketForm(true); }}>
          <Ticket className="w-4 h-4 mr-1.5" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statsData.map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Global Search */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Global Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search users, exhibitors, products, NFC tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="min-h-32 max-h-96 overflow-y-auto">
                {searchQuery.length < 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Type at least 2 characters to search</p>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                      {["users", "exhibitors", "products", "nfc tags"].map(hint => (
                        <span key={hint} className="text-xs bg-muted px-2 py-0.5 rounded-full">{hint}</span>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{searchResults.length} result{searchResults.length > 1 ? "s" : ""}</p>
                    {searchResults.map((r, i) => (
                      <SearchResultCard key={i} result={r} onSelect={setSelectedRecord} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Queue */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Support Tickets ({tickets.length})</CardTitle>
                <div className="flex gap-1">
                  {["all", "open", "in_progress", "resolved"].map(f => (
                    <button
                      key={f}
                      onClick={() => setTicketFilter(f)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${ticketFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {f === "in_progress" ? "active" : f}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tickets yet</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowTicketForm(true)}>
                      Create First Ticket
                    </Button>
                  </div>
                ) : filteredTickets.map(ticket => (
                  <div key={ticket.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ticket.title}</p>
                        {ticket.linked && <p className="text-xs text-muted-foreground">re: {ticket.linked}</p>}
                        {ticket.assignee && <p className="text-xs text-muted-foreground">→ {ticket.assignee}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {["in_progress", "resolved", "closed"].filter(s => s !== ticket.status).map(s => (
                        <Button key={s} size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                          onClick={() => updateTicket(ticket.id, { status: s })}>
                          → {s.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}