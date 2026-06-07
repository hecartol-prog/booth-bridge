import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, Trash2, Plus, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { name: "", venue: "", city: "", country: "", start_date: "", end_date: "", organizer: "", description: "", status: "upcoming" };

const STATUS_COLORS = { upcoming: "bg-blue-50 text-blue-700", active: "bg-green-50 text-green-700", past: "bg-slate-100 text-slate-500" };

export default function AdminEvents() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => base44.entities.Event.list("-start_date", 200),
  });

  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities.Event.update(id, data) : base44.entities.Event.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setEditing(null);
      setIsNew(false);
      toast({ title: isNew ? "Event created" : "Event updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const openNew = () => { setForm(emptyForm); setEditing({}); setIsNew(true); };
  const openEdit = (ev) => { setForm({ ...ev }); setEditing(ev); setIsNew(false); };

  const filtered = events.filter(ev =>
    ev.name?.toLowerCase().includes(search.toLowerCase()) ||
    ev.city?.toLowerCase().includes(search.toLowerCase()) ||
    ev.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-slate-500 text-sm mt-1">Manage trade show events</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Event</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name, city, country..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Event</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Dates</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Organizer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No events found</td></tr>
            ) : filtered.map(ev => (
              <tr key={ev.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ev.logo_url && <img src={ev.logo_url} className="w-7 h-7 rounded object-cover border" alt="" />}
                    <span className="font-medium text-slate-900">{ev.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{[ev.city, ev.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{ev.start_date} – {ev.end_date}</td>
                <td className="px-4 py-3 text-slate-500">{ev.organizer || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[ev.status] || ""}`}>{ev.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(ev)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(ev.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={() => { setEditing(null); setIsNew(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "New Event" : `Edit — ${editing?.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Event Name *</Label>
              <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CES 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Venue</Label>
                <Input value={form.venue || ""} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country || ""} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
              <div>
                <Label>Organizer</Label>
                <Input value={form.organizer || ""} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date || ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date || ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "upcoming"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && <img src={form.logo_url} className="w-10 h-10 rounded object-cover border" alt="" />}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted text-sm text-slate-500">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</Button>
              <Button className="flex-1" disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate({ id: isNew ? null : editing.id, data: form })}>
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isNew ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}