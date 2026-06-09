import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Check, X, Download } from "lucide-react";
import { format } from "date-fns";
import { formatMeetingSlot, setVenueTimezone, getVenueTimezone } from "@/utils/venueTimezone";

export default function Meetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMeeting, setNewMeeting] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [title, setTitle] = useState("");
  // Real-time subscription — update meeting status changes instantly
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Meeting.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["meetings", user.id] });
    });
    return unsub;
  }, [user?.id, queryClient]);

  // Derive venue TZ from the exhibitor's event profile when available
  useEffect(() => {
    if (!user?.id || user?.user_role !== "exhibitor") return;
    base44.entities.ExhibitorProfile.filter({ user_id: user.id }).then(profiles => {
      const eventId = profiles[0]?.event_id;
      if (!eventId) return;
      base44.entities.Event.filter({ id: eventId }).then(events => {
        if (events[0]?.timezone) setVenueTimezone(events[0].timezone);
      });
    });
  }, [user?.id]);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", user?.id],
    queryFn: async () => {
      const [asProposer, asRecipient] = await Promise.all([
        base44.entities.Meeting.filter({ proposed_by: user.id }, "-created_date"),
        base44.entities.Meeting.filter({ proposed_to: user.id }, "-created_date"),
      ]);
      const seen = new Set();
      return [...asProposer, ...asRecipient].filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.id,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["meeting-conns", user?.id],
    queryFn: async () => {
      const filter = user?.user_role === "exhibitor"
        ? { exhibitor_user_id: user.id, status: "accepted" }
        : { buyer_user_id: user.id, status: "accepted" };
      return base44.entities.Connection.filter(filter);
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const conn = connections.find(c => c.id === selectedConnection);
      if (!conn) return;
      const targetId = user.user_role === "exhibitor" ? conn.buyer_user_id : conn.exhibitor_user_id;
      const targetName = user.user_role === "exhibitor" ? conn.buyer_name : conn.exhibitor_name;
      
      const meeting = await base44.entities.Meeting.create({
        connection_id: selectedConnection,
        proposed_by: user.id,
        proposed_to: targetId,
        proposed_time: proposedTime,
        duration: parseInt(duration),
        status: "proposed",
        title: title || "Meeting",
        proposer_name: user.full_name,
        recipient_name: targetName,
      });
      await base44.entities.Notification.create({
        user_id: targetId,
        type: "meeting_proposed",
        title: "Meeting Proposed",
        message: `${user.full_name} proposed a ${duration}-min meeting.`,
        from_user_name: user.full_name,
        related_id: meeting.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setNewMeeting(false);
      setTitle("");
      setProposedTime("");
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await base44.entities.Meeting.update(id, { status });
      const meeting = meetings.find(m => m.id === id);
      if (meeting) {
        await base44.entities.Notification.create({
          user_id: meeting.proposed_by,
          type: status === "accepted" ? "meeting_accepted" : "meeting_declined",
          title: `Meeting ${status}`,
          message: `${user.full_name} ${status} your meeting.`,
          from_user_name: user.full_name,
          related_id: id,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const generateICS = (meeting) => {
    const start = new Date(meeting.proposed_time);
    const end = new Date(start.getTime() + meeting.duration * 60000);
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${meeting.title || "Booth Bridge Meeting"}
DESCRIPTION:Meeting via Booth Bridge
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors = {
    proposed: "bg-amber-100 text-amber-700",
    accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };

  const upcoming = meetings.filter(m => m.status !== "declined" && new Date(m.proposed_time) > new Date());
  const past = meetings.filter(m => m.status === "declined" || new Date(m.proposed_time) <= new Date());

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Meetings</h1>
        <Button size="sm" onClick={() => setNewMeeting(true)}>
          <Plus className="w-4 h-4 mr-1" /> Propose
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3" />
          <p>No meetings yet</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-heading font-semibold text-muted-foreground mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(meeting => (
                  <Card key={meeting.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{meeting.title || "Meeting"}</p>
                          <p className="text-xs text-muted-foreground">
                            With: {meeting.proposed_by === user.id ? meeting.recipient_name : meeting.proposer_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatMeetingSlot(meeting.proposed_time)} · {meeting.duration} min
                            </span>
                          </div>
                          <Badge className={`mt-2 text-xs ${statusColors[meeting.status]}`}>
                            {meeting.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {meeting.proposed_to === user.id && meeting.status === "proposed" && (
                          <>
                            <Button size="sm" onClick={() => respondMutation.mutate({ id: meeting.id, status: "accepted" })}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => respondMutation.mutate({ id: meeting.id, status: "declined" })}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {meeting.status === "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => generateICS(meeting)}>
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-heading font-semibold text-muted-foreground mb-3">Past / Declined</h2>
              <div className="space-y-3">
                {past.map(meeting => (
                  <Card key={meeting.id} className="p-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{meeting.title || "Meeting"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMeetingSlot(meeting.proposed_time)} · {meeting.duration} min
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={newMeeting} onOpenChange={setNewMeeting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose a Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>With</Label>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger><SelectValue placeholder="Select connection" /></SelectTrigger>
                <SelectContent>
                  {connections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {user.user_role === "exhibitor" ? conn.buyer_name : `${conn.exhibitor_company} · Booth ${conn.booth_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quick chat about pricing" />
            </div>
            <div>
              <Label>When</Label>
              <Input type="datetime-local" value={proposedTime} onChange={e => setProposedTime(e.target.value)} />
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMeeting(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!selectedConnection || !proposedTime || createMutation.isPending}>
              Propose Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}