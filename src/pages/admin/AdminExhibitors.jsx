import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFile } from "@/api/storageClient";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminExhibitors() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: exhibitors = [], isLoading } = useQuery({
    queryKey: ["admin-exhibitors"],
    queryFn: () => db.ExhibitorProfile.list("-created_date", 200),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => db.ExhibitorProfile.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      setEditing(null);
      toast({ title: "Exhibitor updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => db.ExhibitorProfile.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exhibitors"] });
      toast({ title: "Exhibitor deleted" });
    },
  });

  const handleEdit = (ex) => {
    setForm({ ...ex });
    setEditing(ex);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile(file);
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploading(false);
  };

  const filtered = exhibitors.filter(ex =>
    ex.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    ex.booth_number?.toLowerCase().includes(search.toLowerCase()) ||
    ex.event_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Exhibitors</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all exhibitor profiles</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by company, booth, event..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Booth</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Event</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Country</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Website</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No exhibitors found</td></tr>
            ) : filtered.map(ex => (
              <tr key={ex.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ex.logo_url && <img src={ex.logo_url} className="w-7 h-7 rounded object-cover border" alt="" />}
                    <span className="font-medium text-slate-900">{ex.company_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{ex.booth_number}</Badge></td>
                <td className="px-4 py-3 text-slate-600">{ex.event_name}</td>
                <td className="px-4 py-3 text-slate-500">{ex.country || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[120px]">{ex.website || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(ex)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(ex.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Exhibitor — {editing?.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Company Name</Label>
              <Input value={form.company_name || ""} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Booth Number</Label>
                <Input value={form.booth_number || ""} onChange={e => setForm(f => ({ ...f, booth_number: e.target.value }))} />
              </div>
              <div>
                <Label>Hall</Label>
                <Input value={form.hall || ""} onChange={e => setForm(f => ({ ...f, hall: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Event Name</Label>
              <Input value={form.event_name || ""} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Country</Label>
                <Input value={form.country || ""} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp || ""} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website || ""} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.logo_url && <img src={form.logo_url} className="w-12 h-12 rounded object-cover border" alt="logo" />}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted text-sm text-slate-500">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => updateMut.mutate({ id: editing.id, data: form })} disabled={updateMut.isPending}>
                {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}