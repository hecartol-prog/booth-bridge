import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Upload, Trash2, Package, Image } from "lucide-react";

export default function Products() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", user?.id],
    queryFn: () => db.Product.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => db.Product.create({
      exhibitor_user_id: user.id,
      title,
      description,
      image_url: imageUrl,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialog(false);
      setTitle("");
      setDescription("");
      setImageUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Products</h1>
        <Button size="sm" onClick={() => setDialog(true)} disabled={products.length >= 10}>
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{products.length}/10 products</p>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3" />
          <p>No products yet. Add up to 10 products to your digital booth.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden group relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{product.title}</p>
                {product.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteMutation.mutate(product.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Photo</Label>
              {imageUrl ? (
                <img src={imageUrl} className="w-full h-48 object-cover rounded-lg mt-2" alt="Product" />
              ) : (
                <label className="flex flex-col items-center gap-2 mt-2 p-8 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Upload photo"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !imageUrl || createMutation.isPending}>
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}