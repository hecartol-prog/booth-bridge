import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Upload, Trash2, Download, Building2, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const typeLabels = {
  company_profile: "Company Profile",
  product_catalog: "Product Catalog",
  new_collection: "New Collection",
  factory_presentation: "Factory Presentation",
  certificates: "Certificates",
  price_list: "Price List",
  video: "Video",
  other: "Other",
};

const typeColors = {
  company_profile: "bg-blue-100 text-blue-700",
  product_catalog: "bg-primary/10 text-primary",
  new_collection: "bg-purple-100 text-purple-700",
  factory_presentation: "bg-orange-100 text-orange-700",
  certificates: "bg-green-100 text-green-700",
  price_list: "bg-amber-100 text-amber-700",
  video: "bg-red-100 text-red-700",
  other: "bg-secondary text-secondary-foreground",
};

export default function CatalogLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("product_catalog");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["ex-profile-catalog", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.ExhibitorProfile.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["my-catalogs", user?.id],
    queryFn: () => base44.entities.CatalogItem.filter({ exhibitor_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.CatalogItem.create({
      exhibitor_user_id: user.id,
      exhibitor_profile_id: profile?.id,
      event_name: profile?.event_name,
      title,
      type,
      description,
      file_url: fileUrl,
      download_count: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-catalogs"] });
      setDialog(false);
      setTitle("");
      setType("product_catalog");
      setDescription("");
      setFileUrl("");
      toast({ title: "Catalog uploaded!", description: "Buyers can now download this." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CatalogItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-catalogs"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Catalog Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buyers can download these from your digital booth</p>
        </div>
        <Button size="sm" onClick={() => setDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : catalogs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No catalogs yet</p>
          <p className="text-xs mt-1">Upload your company profile, product catalogs, and certificates</p>
          <Button className="mt-4" size="sm" onClick={() => setDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Upload First Catalog
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {catalogs.map(cat => (
            <Card key={cat.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{cat.title}</p>
                    <Badge className={`text-xs border-0 mt-0.5 ${typeColors[cat.type] || ""}`}>
                      {typeLabels[cat.type] || cat.type}
                    </Badge>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      <Download className="w-3 h-3 inline mr-1" />
                      {cat.download_count || 0} downloads
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => window.open(cat.file_url, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(cat.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Catalog / Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Main Product Catalog 2024" className="mt-1" />
            </div>
            <div>
              <Label>File *</Label>
              {fileUrl ? (
                <div className="flex items-center gap-2 mt-1 p-3 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">File uploaded successfully</span>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 mt-1 p-8 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Upload PDF, image, or video"}
                  </span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !fileUrl || createMutation.isPending}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}