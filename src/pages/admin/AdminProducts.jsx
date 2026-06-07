import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, Trash2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => base44.entities.Product.list("-created_date", 300),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ["admin-exhibitors"],
    queryFn: () => base44.entities.ExhibitorProfile.list("-created_date", 200),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setEditing(null);
      toast({ title: "Product updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploading(false);
  };

  const filtered = products.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.event_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getExhibitorName = (userId) => exhibitors.find(e => e.user_id === userId)?.company_name || userId?.slice(0, 8) + "...";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all exhibitor products</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by title or event..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-slate-400">No products found</div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {p.image_url
              ? <img src={p.image_url} className="w-full h-40 object-cover" alt={p.title} />
              : <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300 text-xs">No image</div>
            }
            <div className="p-4">
              <p className="font-semibold text-slate-900 truncate">{p.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{getExhibitorName(p.exhibitor_user_id)}</p>
              {p.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setForm({ ...p }); setEditing(p); }}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product — {editing?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Exhibitor</Label>
              <Select value={form.exhibitor_user_id || ""} onValueChange={v => setForm(f => ({ ...f, exhibitor_user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select exhibitor" /></SelectTrigger>
                <SelectContent>
                  {exhibitors.map(ex => <SelectItem key={ex.user_id} value={ex.user_id}>{ex.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Event Name</Label>
              <Input value={form.event_name || ""} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
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
              <Label>Product Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && <img src={form.image_url} className="w-14 h-14 rounded object-cover border" alt="" />}
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted text-sm text-slate-500">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => updateMut.mutate({ id: editing.id, data: form })} disabled={updateMut.isPending}>
                {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}