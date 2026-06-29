import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Search, Eye } from "lucide-react";
import { format } from "date-fns";

const CONFIDENCE_COLOR = (score) => score >= 80 ? "text-green-600 bg-green-50" : score >= 60 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";

export default function AdminOCRReview() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["scanned-contacts-review"],
    queryFn: () => db.ScannedContact.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.ScannedContact.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scanned-contacts-review"] }); setSelected(null); },
  });

  // Contacts that need review: low confidence OR pending follow_up
  const needsReview = contacts.filter(c => (c.ocr_confidence || 0) < 70 || c.follow_up_status === "pending");
  const approved = contacts.filter(c => c.follow_up_status === "contacted" || c.follow_up_status === "converted");
  const rejected = contacts.filter(c => c.follow_up_status === "no_action");

  const filtered = (statusFilter === "pending" ? needsReview : statusFilter === "approved" ? approved : statusFilter === "rejected" ? rejected : contacts)
    .filter(c => !search || [c.full_name, c.company, c.email].filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase())));

  const avgConfidence = contacts.length > 0 ? Math.round(contacts.reduce((a, b) => a + (b.ocr_confidence || 0), 0) / contacts.length) : 0;

  const openForEdit = (c) => {
    setSelected(c);
    setEditForm({ full_name: c.full_name || "", company: c.company || "", email: c.email || "", phone: c.phone || "", website: c.website || "" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="w-6 h-6 text-primary" /> OCR Quality Review</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve low-confidence OCR scans</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Scans", value: contacts.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Needs Review", value: needsReview.length, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Approved", value: approved.length, color: "text-green-600", bg: "bg-green-50" },
          { label: "Avg Confidence", value: `${avgConfidence}%`, color: avgConfidence >= 70 ? "text-green-600" : "text-red-600", bg: avgConfidence >= 70 ? "bg-green-50" : "bg-red-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Needs Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Confidence</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scanned</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No records</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.full_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.company || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.email || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENCE_COLOR(c.ocr_confidence || 0)}`}>
                    {c.ocr_confidence || 0}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.follow_up_status === "contacted" ? "bg-green-100 text-green-700" : c.follow_up_status === "no_action" ? "bg-slate-100 text-slate-600" : "bg-yellow-100 text-yellow-700"}`}>
                    {c.follow_up_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.created_date ? format(new Date(c.created_date), "MMM d") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openForEdit(c)}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateMutation.mutate({ id: c.id, data: { follow_up_status: "contacted" } })}><CheckCircle2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateMutation.mutate({ id: c.id, data: { follow_up_status: "no_action" } })}><XCircle className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && editForm && (
        <Dialog open onOpenChange={() => { setSelected(null); setEditForm(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Review Scan
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${CONFIDENCE_COLOR(selected.ocr_confidence || 0)}`}>{selected.ocr_confidence || 0}% confidence</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {["full_name", "company", "email", "phone", "website"].map(field => (
                <div key={field}><Label className="capitalize">{field.replace("_", " ")}</Label><Input className="mt-1" value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} /></div>
              ))}
              {selected.raw_image_url && <img src={selected.raw_image_url} alt="scan" className="w-full rounded-lg border max-h-40 object-contain" />}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateMutation.mutate({ id: selected.id, data: { ...editForm, follow_up_status: "contacted" } })}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & Save
                </Button>
                <Button variant="outline" className="flex-1 text-red-600 border-red-200" onClick={() => updateMutation.mutate({ id: selected.id, data: { follow_up_status: "no_action" } })}>
                  <XCircle className="w-4 h-4 mr-1" /> Discard
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}