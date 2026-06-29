import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV } from "@/utils/adminExport";
import { Edit, Trash2, Zap, MessageSquare, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TEMP_COLORS = {
  hot: "bg-red-100 text-red-700", warm: "bg-orange-100 text-orange-700",
  cold: "bg-blue-100 text-blue-700", qualified: "bg-green-100 text-green-700",
  opportunity: "bg-purple-100 text-purple-700", customer: "bg-emerald-100 text-emerald-700",
};

export default function AdminLeads() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: leads = [], isLoading } = useQuery({ queryKey: ["admin-leads"], queryFn: () => db.LeadProfile.list() });
  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({ queryKey: ["admin-meetings"], queryFn: () => db.Meeting.list() });
  const { data: rfis = [], isLoading: loadingRFIs } = useQuery({ queryKey: ["admin-rfis"], queryFn: () => db.RFI.list() });

  const updateLead = useMutation({
    mutationFn: d => db.LeadProfile.update(d.id, d),
    onSuccess: () => { qc.invalidateQueries(["admin-leads"]); toast({ title: "Lead updated" }); setEditing(null); },
  });

  const deleteLead = useMutation({
    mutationFn: id => db.LeadProfile.delete(id),
    onSuccess: () => { qc.invalidateQueries(["admin-leads"]); toast({ title: "Lead deleted" }); },
  });

  const leadColumns = [
    { header: "Lead Name", accessor: "lead_name", render: r => <span className="font-medium">{r.lead_name}</span> },
    { header: "Company", accessor: "company_name", render: r => <span className="text-xs text-slate-500">{r.company_name || "—"}</span> },
    { header: "Temperature", accessor: "lead_temperature", render: r => r.lead_temperature ? (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TEMP_COLORS[r.lead_temperature] || "bg-slate-100"}`}>{r.lead_temperature}</span>
    ) : "—" },
    { header: "Score", accessor: "lead_score", render: r => (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-slate-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${r.lead_score || 0}%` }} />
        </div>
        <span className="text-xs font-mono">{r.lead_score || 0}</span>
      </div>
    )},
    { header: "Status", accessor: "status", render: r => <span className="text-xs text-slate-500">{r.status || "new"}</span> },
    { header: "Event", accessor: "source_event_name", render: r => <span className="text-xs text-slate-400">{r.source_event_name || "—"}</span> },
    { header: "Actions", sortable: false, render: r => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing({ ...r })}><Edit className="w-3 h-3" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => { if (confirm("Delete lead?")) deleteLead.mutate(r.id); }}><Trash2 className="w-3 h-3" /></Button>
      </div>
    )},
  ];

  const meetingColumns = [
    { header: "Requester", accessor: "requested_by_name", render: r => <span className="font-medium">{r.requested_by_name || "—"}</span> },
    { header: "Company", accessor: "requested_by_company" },
    { header: "Target", accessor: "target_exhibitor_company" },
    { header: "Status", accessor: "status", render: r => <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{r.status}</span> },
    { header: "Event", accessor: "event_name" },
    { header: "Date", accessor: "created_date", render: r => <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</span> },
  ];

  const rfiColumns = [
    { header: "Company / Title", render: r => <span className="font-medium">{r.company_name || r.subject || "—"}</span> },
    { header: "Status", accessor: "status", render: r => <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{r.status}</span> },
    { header: "Event", accessor: "event_name" },
    { header: "Date", accessor: "created_date", render: r => <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</span> },
  ];

  const filterOptions = [
    { key: "lead_temperature", label: "Temperature", options: ["hot","warm","cold","qualified","opportunity","customer"].map(v => ({ value: v, label: v })) },
    { key: "status", label: "Status", options: ["new","contacted","qualified","proposal","negotiation","won","lost"].map(v => ({ value: v, label: v })) },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> Lead Intelligence Control</h2>
        <p className="text-sm text-slate-500">Manage leads, meetings, and RFIs</p>
      </div>

      <Tabs defaultValue="leads" className="flex-1 flex flex-col">
        <TabsList className="mb-3 w-fit">
          <TabsTrigger value="leads" className="text-xs"><Zap className="w-3 h-3 mr-1" /> Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="meetings" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" /> Meetings ({meetings.length})</TabsTrigger>
          <TabsTrigger value="rfis" className="text-xs"><FileText className="w-3 h-3 mr-1" /> RFIs ({rfis.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="flex-1">
          <AdminDataGrid data={leads} columns={leadColumns} isLoading={isLoading} filterOptions={filterOptions}
            bulkActions={[{ label: "Export", onClick: ids => exportToCSV(leads.filter(l => ids.includes(l.id)), "leads") }]}
            onExport={rows => exportToCSV(rows, "leads")} />
        </TabsContent>

        <TabsContent value="meetings" className="flex-1">
          <AdminDataGrid data={meetings} columns={meetingColumns} isLoading={loadingMeetings}
            onExport={rows => exportToCSV(rows, "meetings")} />
        </TabsContent>

        <TabsContent value="rfis" className="flex-1">
          <AdminDataGrid data={rfis} columns={rfiColumns} isLoading={loadingRFIs}
            onExport={rows => exportToCSV(rows, "rfis")} />
        </TabsContent>
      </Tabs>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Lead: {editing.lead_name}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Lead Score (0-100)</p>
                <Input type="number" min="0" max="100" value={editing.lead_score || 0} onChange={e => setEditing(d => ({ ...d, lead_score: Number(e.target.value) }))} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Temperature</p>
                <Select value={editing.lead_temperature || "cold"} onValueChange={v => setEditing(d => ({ ...d, lead_temperature: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["hot","warm","cold","qualified","opportunity","customer"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Select value={editing.status || "new"} onValueChange={v => setEditing(d => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["new","contacted","qualified","proposal","negotiation","won","lost"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <Input value={editing.notes || ""} onChange={e => setEditing(d => ({ ...d, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => updateLead.mutate(editing)}>Save Lead</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}