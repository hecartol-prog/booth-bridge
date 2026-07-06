import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Flame, Users, Search, ArrowLeft, TrendingUp, Calendar, FileText, Download
} from "lucide-react";
import { calculateLeadScore, getLeadTemperature, TEMPERATURE_BANDS } from "@/utils/leadScoring";
import { formatMeetingSlot } from "@/utils/venueTimezone";
import { exportLeadsCSV } from "@/utils/csvExport";

export default function LeadIntelligence() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);

  const { data: connections = [] } = useQuery({
    queryKey: ["li-connections", user?.id],
    queryFn: () => db.Connection.filter({ exhibitor_user_id: user.id, status: "accepted" }),
    enabled: !!user?.id,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["li-interactions", user?.id],
    queryFn: () => db.LeadInteraction.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["li-rfis", user?.id],
    queryFn: () => db.RFI.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["li-meetings", user?.id],
    queryFn: () => db.Meeting.filter({ proposed_to: user.id }),
    enabled: !!user?.id,
  });

  // Build lead profiles with scores
  const scoredLeads = connections.map(conn => {
    const buyerInteractions = interactions.filter(i => i.buyer_user_id === conn.buyer_user_id);
    const buyerRFIs = rfis.filter(r => r.buyer_user_id === conn.buyer_user_id);
    const buyerMeetings = meetings.filter(m => m.proposed_by === conn.buyer_user_id);

    const score = calculateLeadScore([
      ...buyerInteractions,
      ...buyerRFIs.map(() => ({ interaction_type: "send_rfi" })),
      ...buyerMeetings.map(m => ({ interaction_type: m.status === "completed" ? "attend_meeting" : "schedule_meeting" })),
    ]);
    const temp = getLeadTemperature(score);

    return {
      ...conn,
      score,
      temp,
      interactions: buyerInteractions,
      rfis: buyerRFIs,
      meetings: buyerMeetings,
    };
  }).sort((a, b) => b.score - a.score);

  const filtered = scoredLeads.filter(l => {
    const matchSearch = !search ||
      l.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.buyer_company?.toLowerCase().includes(search.toLowerCase());
    const matchTemp = filterTemp === "all" || l.temp.label === filterTemp;
    return matchSearch && matchTemp;
  });

  const tempCounts = TEMPERATURE_BANDS.reduce((acc, b) => {
    acc[b.label] = scoredLeads.filter(l => l.temp.label === b.label).length;
    return acc;
  }, {});

  if (selectedLead) {
    return <LeadDetailView lead={selectedLead} onBack={() => setSelectedLead(null)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-500" /> Lead Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{scoredLeads.length} qualified leads</p>
        </div>
        {scoredLeads.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => exportLeadsCSV({ connections: scoredLeads })}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        )}
      </div>

      {/* Temperature filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterTemp("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterTemp === "all" ? "bg-primary text-white border-primary" : "border-border bg-card hover:border-primary/50"}`}
        >
          All ({scoredLeads.length})
        </button>
        {TEMPERATURE_BANDS.map(b => (
          <button
            key={b.label}
            onClick={() => setFilterTemp(b.label)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterTemp === b.label ? `${b.bg} ${b.color} ${b.border}` : "border-border bg-card"}`}
          >
            {b.emoji} {b.label} ({tempCounts[b.label] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-sm">No leads yet</p>
          <p className="text-xs text-muted-foreground mt-1">Leads appear when buyers connect and interact with your booth.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead, i) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="w-full text-left"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className={`text-xs font-bold w-6 text-center shrink-0 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}>#{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{(lead.buyer_name || "?")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{lead.buyer_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.buyer_company}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{lead.interactions.length} interactions</p>
                      <p className="text-xs text-muted-foreground">{lead.rfis.length} RFIs</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${lead.temp.bg} ${lead.temp.color} ${lead.temp.border}`}>
                      {lead.temp.emoji} <span>{lead.score}pts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadDetailView({ lead, onBack }) {
  const timeline = [
    ...lead.interactions.map(i => ({ date: i.created_date, type: i.interaction_type, label: i.interaction_type?.replace(/_/g, " ") })),
    ...lead.rfis.map(r => ({ date: r.created_date, type: "rfi", label: `RFI: ${r.request_type?.replace(/_/g, " ")}` })),
    ...lead.meetings.map(m => ({ date: m.created_date, type: "meeting", label: `Meeting: ${m.status}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to Lead Intelligence
      </button>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{(lead.buyer_name || "?")[0]}</span>
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">{lead.buyer_name || "Unknown"}</h1>
          <p className="text-sm text-muted-foreground">{lead.buyer_company} {lead.buyer_country && `· ${lead.buyer_country}`}</p>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${lead.temp.bg} ${lead.temp.color} ${lead.temp.border}`}>
          {lead.temp.emoji} {lead.score} pts · {lead.temp.label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: TrendingUp, label: "Score", value: lead.score, color: "text-primary" },
          { icon: FileText, label: "RFIs", value: lead.rfis.length, color: "text-amber-500" },
          { icon: Calendar, label: "Meetings", value: lead.meetings.length, color: "text-green-500" },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Interaction Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Interaction Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No interactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm capitalize">{item.label}</p>
                    {item.date && <p className="text-xs text-muted-foreground">{formatMeetingSlot(item.date)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}