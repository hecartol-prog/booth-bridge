import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, Trash2, Upload, Loader2, Plus, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATALOGUE_TYPES = [
  "company_profile", "product_catalog", "new_collection",
  "factory_presentation", "certificates", "price_list", "video", "other"
];

const TYPE_LABELS = {
  company_profile: "Company Profile", product_catalog: "Product Catalog",
  new_collection: "New Collection", factory_presentation: "Factory Presentation",
  certificates: "Certificates", price_list: "Price List", video: "Video", other: "Other"
};

const emptyForm = { title: "", type: "product_catalog", description: "", file_url: "", thumbnail_url: "", exhibitor_user_id: "", event_name: "" };

export default function AdminCatalogues() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: catalogues = [], isLoading } = useQuery({
    queryKey: ["admin-catalogues"],
    queryFn: () => db.CatalogItem.list("-created_date", 300),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ["admin-exhibitors"],
    queryFn: () => db.ExhibitorProfile.list("-created_date", 200),
  });

  const saveMut = useMutation({
    mutationFn: ({ id, data }) => id
      ? db.CatalogItem.update(id, data)
      : db.CatalogItem.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalogues"] });
      setEditing(null);
      setIsNew(false);
      toast({ title: isNew ? "Catalogue created" : "Catalogue updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => db.CatalogItem.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-catalogues"] });
      toast({ title: "Catalogue deleted" });
    },
  });

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploadingFile(false);
  };

  const handleUploadThumb = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumb(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, thumbnail_url: file_url }));
    setUploadingThumb(false);
  };

  const openEdit = (cat) => { setForm({ ...cat }); setEditing(cat); setIsNew(false); };
  const openNew = () => { setForm(emptyForm); setEditing({}); setIsNew(true); };

  const filtered = catalogues.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.event_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogues</h1>
          <p className="text-slate-500 text-sm mt-1">Manage exhibitor catalogues and documents</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Upload Catalogue</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by title or event..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Event</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Downloads</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">File</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No catalogues found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {c.thumbnail_url
                      ? <img src={c.thumbnail_url} className="w-8 h-8 rounded object-cover border" alt="" />
                      : <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><FileText className="w-4 h-4 text-slate-400" /></div>
                    }
                    <span className="font-medium text-slate-900">{c.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant="secondary">{TYPE_LABELS[c.type] || c.type}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{c.event_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{c.download_count || 0}</td>
                <td className="px-4 py-3">
                  {c.file_url && (
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editing} onOpenChange={() => { setEditing(null); setIsNew(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Upload New Catalogue" : `Edit — ${editing?.title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="2026 Product Catalog" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATALOGUE_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Name</Label>
                <Input value={form.event_name || ""} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="CES 2026" />
              </div>
            </div>
            <div>
              <Label>Exhibitor</Label>
              <Select value={form.exhibitor_user_id || ""} onValueChange={v => {
                const ex = exhibitors.find(e => e.user_id === v);
                setForm(f => ({ ...f, exhibitor_user_id: v, exhibitor_profile_id: ex?.id || "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select exhibitor" /></SelectTrigger>
                <SelectContent>
                  {exhibitors.map(ex => <SelectItem key={ex.user_id} value={ex.user_id}>{ex.company_name}</SelectItem>)}
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
            {/* File Upload */}
            <div>
              <Label>Catalogue File (PDF, image, video)</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.file_url && (
                  <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Current file
                  </a>
                )}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted text-sm text-slate-500">
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload File
                  <input type="file" accept=".pdf,image/*,video/*" className="hidden" onChange={handleUploadFile} />
                </label>
              </div>
            </div>
            {/* Thumbnail Upload */}
            <div>
              <Label>Thumbnail Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.thumbnail_url && <img src={form.thumbnail_url} className="w-12 h-12 rounded object-cover border" alt="thumb" />}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted text-sm text-slate-500">
                  {uploadingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Thumbnail
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadThumb} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!form.title || !form.file_url || saveMut.isPending}
                onClick={() => saveMut.mutate({ id: isNew ? null : editing.id, data: form })}
              >
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isNew ? "Upload" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}