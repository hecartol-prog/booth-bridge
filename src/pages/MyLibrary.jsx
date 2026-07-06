import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Package, Bookmark, Trash2, StickyNote, Image,
  BookmarkCheck
} from "lucide-react";

const interestColors = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-green-100 text-green-700",
};

export default function MyLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState("");

  const { data: savedProducts = [], isLoading } = useQuery({
    queryKey: ["saved-products", user?.id],
    queryFn: () => db.SavedProduct.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: (/** @type {any} */ { id, data }) => db.SavedProduct.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {any} */ id) => db.SavedProduct.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-products"] }),
  });

  const filtered = savedProducts.filter(p => {
    if (!search) return true;
    return (
      (p.product_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.exhibitor_company || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.collection || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.event_name || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  // Group by collection (or "Uncategorized")
  const grouped = filtered.reduce((acc, p) => {
    const key = p.collection || "Saved Products";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">My Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{savedProducts.length} products saved</p>
        </div>
        <BookmarkCheck className="w-6 h-6 text-primary" />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products, suppliers, events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No products saved yet</p>
          <p className="text-xs mt-1">Visit exhibitor booths and save products you're interested in</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([collection, items]) => (
            <div key={collection}>
              <div className="flex items-center gap-2 mb-3">
                <Bookmark className="w-4 h-4 text-primary" />
                <h2 className="font-heading font-semibold text-sm">{collection}</h2>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map(item => (
                  <Card key={item.id} className="overflow-hidden group">
                    <div className="relative">
                      {item.product_image_url ? (
                        <img src={item.product_image_url} alt={item.product_title} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className={`absolute top-1.5 left-1.5 text-xs border-0 ${interestColors[item.interest_level] || ""}`}>
                        {item.interest_level}
                      </Badge>
                    </div>
                    <div className="p-2.5">
                      <p className="font-semibold text-xs truncate">{item.product_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.exhibitor_company}</p>
                      {item.event_name && (
                        <p className="text-xs text-muted-foreground/70 truncate">{item.event_name}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">{item.notes}</p>
                      )}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => { setNoteText(item.notes || ""); setNoteDialog(item); }}
                          className="flex-1 py-1 rounded text-xs hover:bg-muted flex items-center justify-center gap-1 text-muted-foreground"
                        >
                          <StickyNote className="w-3 h-3" /> Note
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="flex-1 py-1 rounded text-xs hover:bg-destructive/10 flex items-center justify-center gap-1 text-muted-foreground"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes — {noteDialog?.product_title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{noteDialog?.exhibitor_company}</p>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add notes about this product..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              updateMutation.mutate({ id: noteDialog.id, data: { notes: noteText } });
              setNoteDialog(null);
            }}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}