import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Ticket, Search, Clock, AlertTriangle, CheckCircle2, Filter } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_COLORS = { low: "bg-slate-100 text-slate-700", medium: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };
const STATUS_COLORS = { open: "bg-yellow-100 text-yellow-700", in_progress: "bg-blue-100 text-blue-700", waiting: "bg-purple-100 text-purple-700", resolved: "bg-green-100 text-green-700", closed: "bg-slate-100 text-slate-700" };

export default function AdminSupportTickets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium", category: "other", created_by: "admin", created_by_name: "Admin" });

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => db.SupportTicket.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.SupportTicket.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.SupportTicket.create({ ...data, ticket_number: `TKT-${Date.now()}` }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support-tickets"] }); setCreating(false); setForm({ subject: "", description: "", priority: "medium", category: "other", created_by: "admin", created_by_name: "Admin" }); },
  });

  const filtered = tickets.filter(t => {
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.includes(search);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = tickets.filter(t => t.status === "open").length;
  const criticalCount = tickets.filter(t => t.priority === "critical" && t.status !== "closed").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Ticket className="w-6 h-6 text-primary" /> Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Persistent ticketing — all tickets stored in database</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ New Ticket</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open", value: openCount, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Critical", value: criticalCount, color: "text-red-600", bg: "bg-red-50" },
          { label: "Total", value: tickets.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Resolved", value: resolvedCount, color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ticket #</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No tickets found</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(t)}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.ticket_number || t.id?.slice(0,8)}</td>
                <td className="px-4 py-3 font-medium">{t.subject}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status?.replace("_", " ")}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.created_date ? format(new Date(t.created_date), "MMM d, HH:mm") : "—"}</td>
                <td className="px-4 py-3">
                  <Select value={t.status} onValueChange={val => { updateMutation.mutate({ id: t.id, data: { status: val, ...(val === "closed" || val === "resolved" ? { closed_at: new Date().toISOString() } : {}) } }); }} onClick={e => e.stopPropagation()}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selected.ticket_number} — {selected.subject}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{selected.status?.replace("_", " ")}</span>
              </div>
              <div><Label>Description</Label><p className="text-muted-foreground mt-1">{selected.description || "No description"}</p></div>
              <div>
                <Label>Resolution Notes</Label>
                <Textarea className="mt-1" rows={3} defaultValue={selected.resolution} onBlur={e => updateMutation.mutate({ id: selected.id, data: { resolution: e.target.value } })} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Modal */}
      {creating && (
        <Dialog open onOpenChange={() => setCreating(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Subject</Label><Input className="mt-1" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="technical">Technical</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="nfc">NFC</SelectItem><SelectItem value="ocr">OCR</SelectItem><SelectItem value="booth">Booth</SelectItem><SelectItem value="account">Account</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.subject || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}