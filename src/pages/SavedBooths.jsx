import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Bookmark, Search, Building2, MapPin, StickyNote, Trash2, ChevronRight, Filter
} from "lucide-react";
import DigitalBooth from "./DigitalBooth";

const statusLabels = {
  interested: "Interested",
  follow_up: "Follow Up",
  request_quotation: "Request Quotation",
  sample_requested: "Sample Requested",
  supplier_approved: "Supplier Approved",
};

const statusColors = {
  interested: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  request_quotation: "bg-purple-100 text-purple-700",
  sample_requested: "bg-orange-100 text-orange-700",
  supplier_approved: "bg-green-100 text-green-700",
};

export default function SavedBooths() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [viewBooth, setViewBooth] = useState(null);

  const { data: savedBooths = [], isLoading } = useQuery({
    queryKey: ["saved-booths", user?.id],
    queryFn: () => db.SavedBooth.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.SavedBooth.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-booths"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.SavedBooth.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-booths"] }),
  });

  if (viewBooth) {
    return <DigitalBooth exhibitorUserId={viewBooth} onBack={() => setViewBooth(null)} />;
  }

  const filtered = savedBooths.filter(b => {
    const matchSearch = !search ||
      (b.exhibitor_company || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.booth_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.event_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || b.visit_status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Saved Booths</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{savedBooths.length} suppliers saved</p>
        </div>
        <Bookmark className="w-6 h-6 text-primary" />
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No saved booths yet</p>
          <p className="text-xs mt-1">Scan a QR code to visit and save a booth</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booth => (
            <Card key={booth.id} className="p-4">
              <div className="flex items-start justify-between">
                <button className="flex items-start gap-3 flex-1 min-w-0 text-left" onClick={() => setViewBooth(booth.exhibitor_user_id)}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{booth.exhibitor_company || "Exhibitor"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {booth.booth_number && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" /> Booth {booth.booth_number}
                        </span>
                      )}
                      {booth.event_name && (
                        <span className="text-xs text-muted-foreground">· {booth.event_name}</span>
                      )}
                    </div>
                    {booth.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">{booth.notes}</p>
                    )}
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1.5 ml-2 shrink-0">
                  <Badge className={`text-xs border-0 ${statusColors[booth.visit_status] || "bg-secondary text-secondary-foreground"}`}>
                    {statusLabels[booth.visit_status] || booth.visit_status}
                  </Badge>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setNoteText(booth.notes || ""); setNoteDialog(booth); }}
                      className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(booth.id)}
                      className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
              {/* Status selector inline */}
              <div className="mt-2 pt-2 border-t">
                <Select
                  value={booth.visit_status || "interested"}
                  onValueChange={(val) => updateMutation.mutate({ id: booth.id, data: { visit_status: val } })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Note dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes — {noteDialog?.exhibitor_company}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add notes about this supplier..."
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