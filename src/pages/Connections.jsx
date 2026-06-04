import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Check, X, Search, MessageSquare, FileText, Calendar,
  Building2, Briefcase, Clock, Star
} from "lucide-react";
import { format } from "date-fns";

export default function Connections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [noteDialog, setNoteDialog] = useState(null);
  const [noteText, setNoteText] = useState("");

  const isExhibitor = user?.role === "exhibitor" || user?.user_type === "exhibitor";

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const filter = isExhibitor
        ? { exhibitor_user_id: user.id }
        : { buyer_user_id: user.id };
      return base44.entities.Connection.filter(filter, "-created_date");
    },
    enabled: !!user?.id,
  });

  // For exhibitors, also get RFIs and media for intent scoring
  const { data: allRfis = [] } = useQuery({
    queryKey: ["connection-rfis", user?.id],
    queryFn: () => base44.entities.RFI.filter(
      isExhibitor ? { exhibitor_user_id: user.id } : { buyer_user_id: user.id }
    ),
    enabled: !!user?.id,
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ["connection-media", user?.id],
    queryFn: () => base44.entities.Media.list("-created_date", 200),
    enabled: !!user?.id,
  });

  const { data: allMeetings = [] } = useQuery({
    queryKey: ["connection-meetings", user?.id],
    queryFn: () => base44.entities.Meeting.filter(
      isExhibitor ? { proposed_to: user.id } : { proposed_by: user.id }
    ),
    enabled: !!user?.id && isExhibitor,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Connection.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  const handleAccept = async (conn) => {
    await updateMutation.mutateAsync({ id: conn.id, data: { status: "accepted" } });
    const notifUserId = isExhibitor ? conn.buyer_user_id : conn.exhibitor_user_id;
    await base44.entities.Notification.create({
      user_id: notifUserId,
      type: "connection_accepted",
      title: "Connection Accepted!",
      message: `${user.full_name} accepted your connection request.`,
      from_user_name: user.full_name,
    });
  };

  const handleDecline = (conn) => {
    updateMutation.mutate({ id: conn.id, data: { status: "declined" } });
  };

  const handleSaveNote = async () => {
    if (!noteDialog) return;
    const field = isExhibitor ? "exhibitor_notes" : "buyer_notes";
    await updateMutation.mutateAsync({ id: noteDialog.id, data: { [field]: noteText } });
    setNoteDialog(null);
  };

  const getIntentScore = (conn) => {
    const connMedia = allMedia.filter(m => m.connection_id === conn.id);
    const connRfis = allRfis.filter(r => r.connection_id === conn.id);
    const connMeetings = allMeetings.filter(m => m.connection_id === conn.id);
    const score = connMedia.length * 1 + connRfis.length * 2 + connMeetings.length * 3;
    if (score >= 5) return { label: "High", color: "bg-green-100 text-green-700" };
    if (score >= 2) return { label: "Medium", color: "bg-amber-100 text-amber-700" };
    return { label: "Low", color: "bg-secondary text-secondary-foreground" };
  };

  const pending = connections.filter(c => c.status === "pending");
  const accepted = connections.filter(c => c.status === "accepted");
  const filtered = (list) => list.filter(c => {
    const name = isExhibitor ? c.buyer_name : c.exhibitor_name;
    const company = isExhibitor ? c.buyer_company : c.exhibitor_company;
    return (name || "").toLowerCase().includes(search.toLowerCase()) ||
           (company || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">
          {isExhibitor ? "Leads" : "My Connections"}
        </h1>
        <Badge variant="outline" className="text-sm">
          {accepted.length} connected
        </Badge>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="accepted">
        <TabsList className="mb-4">
          <TabsTrigger value="accepted">
            Connected ({accepted.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered(pending).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No pending requests</div>
          ) : (
            <div className="space-y-3">
              {filtered(pending).map(conn => (
                <Card key={conn.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {isExhibitor ? conn.buyer_name : conn.exhibitor_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isExhibitor ? conn.buyer_company : `${conn.exhibitor_company} · Booth ${conn.booth_number}`}
                        </p>
                      </div>
                    </div>
                    {conn.initiated_by !== (isExhibitor ? "exhibitor" : "buyer") && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(conn)}>
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDecline(conn)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {conn.initiated_by === (isExhibitor ? "exhibitor" : "buyer") && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" /> Waiting
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered(accepted).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No connections yet</div>
          ) : (
            <div className="space-y-3">
              {filtered(accepted).map(conn => {
                const intent = isExhibitor ? getIntentScore(conn) : null;
                return (
                  <Card key={conn.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                          {isExhibitor ? (
                            <Building2 className="w-5 h-5 text-primary" />
                          ) : (
                            <Briefcase className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {isExhibitor ? conn.buyer_name : conn.exhibitor_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isExhibitor ? conn.buyer_company : `${conn.exhibitor_company} · Booth ${conn.booth_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(conn.created_date), "MMM d, h:mm a")}
                          </p>
                          {(isExhibitor ? conn.exhibitor_notes : conn.buyer_notes) && (
                            <p className="text-xs mt-1 bg-muted p-2 rounded italic">
                              {isExhibitor ? conn.exhibitor_notes : conn.buyer_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {intent && (
                          <Badge className={`text-xs ${intent.color}`}>
                            <Star className="w-3 h-3 mr-1" /> {intent.label}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const note = isExhibitor ? conn.exhibitor_notes : conn.buyer_notes;
                            setNoteText(note || "");
                            setNoteDialog(conn);
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add private notes about this connection..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}