import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadMedia } from "@/utils/assetPipeline";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Upload, Eye, Trash2, Download, Image, FileText, Film, Tag, Grid, List } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TYPE_FILTERS = {
  all: () => true,
  images: r => r.media_type === "image" || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(r.file_url || ""),
  documents: r => r.media_type === "document" || /\.(pdf|doc|docx)/i.test(r.file_url || ""),
  videos: r => r.media_type === "video" || /\.(mp4|mov|avi)/i.test(r.file_url || ""),
};

export default function AdminMedia() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeType, setActiveType] = useState("all");
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["admin-media"],
    queryFn: () => db.Media.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: id => db.Media.delete(id),
    onSuccess: () => { qc.invalidateQueries(["admin-media"]); toast({ title: "Media deleted" }); },
  });

  const handleUpload = async (files) => {
    setUploading(true);
    for (const file of files) {
      const { file_url } = await uploadMedia(file, user?.id || "admin");
      await db.Media.create({
        file_url,
        file_name: file.name,
        file_size: file.size,
        media_type: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document",
        title: file.name,
      });
    }
    qc.invalidateQueries(["admin-media"]);
    setUploading(false);
    toast({ title: `${files.length} file(s) uploaded` });
  };

  const filtered = media.filter(m => {
    const matchSearch = !search || (m.title || m.file_name || "").toLowerCase().includes(search.toLowerCase());
    const matchType = TYPE_FILTERS[activeType](m);
    return matchSearch && matchType;
  });

  const isImage = (m) => m.media_type === "image" || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(m.file_url || "");

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Image className="w-5 h-5 text-purple-500" /> Media Library</h2>
          <p className="text-sm text-slate-500">{media.length} assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload Files"}
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={e => handleUpload(Array.from(e.target.files))} />
          <Button variant="outline" size="sm" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center mb-4 hover:border-primary/40 transition-colors cursor-pointer"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleUpload(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Drag & drop files here or <span className="text-primary">click to browse</span></p>
        <p className="text-xs text-slate-400 mt-1">Images, Videos, PDFs, Documents</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {Object.keys(TYPE_FILTERS).map(type => (
          <Button key={type} variant={activeType === type ? "default" : "outline"} size="sm" className="h-9 text-xs capitalize"
            onClick={() => setActiveType(type)}>{type}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading media...</div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Image className="w-12 h-12 text-slate-200 mb-3" />
          <p>No media files found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 overflow-y-auto flex-1">
          {filtered.map(m => (
            <div key={m.id} className="group relative bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                {isImage(m) ? (
                  <img src={m.file_url} alt={m.title} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <FileText className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate text-slate-700">{m.title || m.file_name || "Untitled"}</p>
                <p className="text-[10px] text-slate-400">{m.media_type || "file"}</p>
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" className="h-7 w-7 p-0" onClick={() => setPreview(m)}><Eye className="w-3 h-3" /></Button>
                <a href={m.file_url} download target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" className="h-7 w-7 p-0"><Download className="w-3 h-3" /></Button>
                </a>
                <Button variant="secondary" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                  onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(m.id); }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">File</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {isImage(m) ? (
                      <img src={m.file_url} alt="" className="w-8 h-8 rounded object-cover bg-slate-100" />
                    ) : <FileText className="w-8 h-8 text-slate-300" />}
                    <span className="font-medium text-slate-700 text-xs">{m.title || m.file_name || "Untitled"}</span>
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{m.media_type || "file"}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{m.created_date ? new Date(m.created_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPreview(m)}><Eye className="w-3 h-3" /></Button>
                      <a href={m.file_url} download target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="h-7 px-2"><Download className="w-3 h-3" /></Button>
                      </a>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(m.id); }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <Dialog open onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{preview.title || preview.file_name}</DialogTitle></DialogHeader>
            <div className="text-center">
              {isImage(preview) ? (
                <img src={preview.file_url} alt={preview.title} className="max-w-full max-h-96 mx-auto rounded-lg" />
              ) : (
                <div className="py-12 text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-200" />
                  <p>Preview not available for this file type</p>
                </div>
              )}
              <div className="flex justify-center gap-2 mt-4">
                <a href={preview.file_url} target="_blank" rel="noreferrer">
                  <Button variant="outline"><Download className="w-4 h-4 mr-1" /> Download</Button>
                </a>
                <a href={preview.file_url} target="_blank" rel="noreferrer">
                  <Button variant="outline"><Eye className="w-4 h-4 mr-1" /> Open in New Tab</Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}