import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV, exportToJSON } from "@/utils/adminExport";
import { Plus, Edit, Trash2, Copy, ArrowUpDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  past: "bg-slate-100 text-slate-600",
  live: "bg-green-100 text-green-700",
  planning: "bg-yellow-100 text-yellow-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const EMPTY = { name: "", venue: "", city: "", country: "", start_date: "", end_date: "", status: "upcoming", industry: "", description: "" };

export default function AdminEvents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [sortOrder, setSortOrder] = useState("default");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => db.Event.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (d) => d.id ? db.Event.update(d.id, d) : db.Event.create(d),
    onSuccess: () => { qc.invalidateQueries(["admin-events"]); toast({ title: "Event saved" }); setEditing(null); setIsNew(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => db.Event.delete(id),
    onSuccess: () => { qc.invalidateQueries(["admin-events"]); toast({ title: "Event deleted" }); },
  });

  const openNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const openEdit = (r) => { setEditing({ ...r }); setIsNew(false); };
  const clone = (r) => { setEditing({ ...r, id: undefined, name: r.name + " (Copy)" }); setIsNew(true); };

  const columns = [
    { header: "Event Name", accessor: "name", render: r => <span className="font-medium text-slate-900">{r.name}</span> },
    { header: "City / Venue", render: r => <span className="text-xs text-slate-500">{[r.city, r.venue].filter(Boolean).join(", ") || "—"}</span> },
    { header: "Country", accessor: "country", render: r => r.country ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{r.country}</span> : <span className="text-xs text-slate-400">—</span> },
    { header: "Dates", render: r => <span className="text-xs text-slate-500">{r.start_date} {r.end_date ? `→ ${r.end_date}` : ""}</span> },
    { header: "Status", accessor: "status", render: r => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS[r.event_status] || "bg-slate-100"}`}>{r.event_status || r.status}</span>
    )},
    { header: "Industry", accessor: "industry", render: r => <span className="text-xs text-slate-500">{r.industry || "—"}</span> },
    { header: "Actions", sortable: false, render: r => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(r)}><Edit className="w-3 h-3" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => clone(r)}><Copy className="w-3 h-3" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => { if (confirm("Delete this event?")) deleteMutation.mutate(r.id); }}><Trash2 className="w-3 h-3" /></Button>
      </div>
    )},
  ];

  const industries = [...new Set(events.map(e => e.industry).filter(Boolean))].sort();
  const countries = [...new Set(events.map(e => e.country).filter(Boolean))].sort();

  const sortedEvents = [...events].sort((a, b) => {
    if (sortOrder === "date_asc") return (a.start_date || "") > (b.start_date || "") ? 1 : -1;
    if (sortOrder === "date_desc") return (a.start_date || "") < (b.start_date || "") ? 1 : -1;
    if (sortOrder === "industry") return (a.industry || "").localeCompare(b.industry || "");
    return 0;
  });

  const filterOptions = [
    { key: "status", label: "Status", options: ["upcoming","active","past","planning","live","completed","cancelled"].map(v => ({ value: v, label: v })) },
    { key: "country", label: "Country", options: countries.map(v => ({ value: v, label: v })) },
    { key: "industry", label: "Industry", options: industries.map(v => ({ value: v, label: v })) },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <AdminDataGrid
        data={sortedEvents}
        columns={columns}
        isLoading={isLoading}
        title="Event Management"
        subtitle={`${events.length} events`}
        filterOptions={filterOptions}
        bulkActions={[{ label: "Export CSV", onClick: ids => exportToCSV(events.filter(e => ids.includes(e.id)), "events") }]}
        onExport={rows => exportToCSV(rows, "events")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-8 text-xs w-44">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Order</SelectItem>
                <SelectItem value="date_asc">Date: Earliest First</SelectItem>
                <SelectItem value="date_desc">Date: Latest First</SelectItem>
                <SelectItem value="industry">Sort by Industry</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Event</Button>
          </div>
        }
      />

      {editing && (
        <Dialog open onOpenChange={() => { setEditing(null); setIsNew(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isNew ? "Create Event" : `Edit: ${editing.name}`}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                ["name", "Event Name", "col-span-2"], ["venue", "Venue", "col-span-2"],
                ["city", "City"], ["country", "Country"],
                ["start_date", "Start Date"], ["end_date", "End Date"],
                ["industry", "Industry"], ["organizer", "Organizer"],
              ].map(([key, label, cls = ""]) => (
                <div key={key} className={cls}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <Input value={editing[key] || ""} onChange={e => setEditing(d => ({ ...d, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Select value={editing.status || "upcoming"} onValueChange={v => setEditing(d => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["upcoming","active","past"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Event Status</p>
                <Select value={editing.event_status || "planning"} onValueChange={v => setEditing(d => ({ ...d, event_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["planning","open_registration","registration_closed","live","completed","cancelled"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Event"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}