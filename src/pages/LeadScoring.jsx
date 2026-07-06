import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Thermometer, Snowflake, Users, FileText, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SCORES = {
  scan_qr: 10,
  view_booth: 10,
  view_product: 15,
  download_catalog: 25,
  send_rfi: 50,
  schedule_meeting: 75,
  attend_meeting: 100,
};

function getTemperature(score) {
  if (score >= 151) return { label: "Hot", color: "text-red-500", bg: "bg-red-50", icon: Flame, border: "border-red-200" };
  if (score >= 51) return { label: "Warm", color: "text-orange-500", bg: "bg-orange-50", icon: Thermometer, border: "border-orange-200" };
  return { label: "Cold", color: "text-blue-400", bg: "bg-blue-50", icon: Snowflake, border: "border-blue-200" };
}

function calcScore(conn, rfis, meetings) {
  let score = SCORES.scan_qr; // any connection = scanned
  score += SCORES.view_booth;
  const buyerRfis = rfis.filter(r => r.buyer_user_id === conn.buyer_user_id);
  score += buyerRfis.length * SCORES.send_rfi;
  const buyerMeetings = meetings.filter(m =>
    m.proposed_by === conn.buyer_user_id || m.proposed_to === conn.buyer_user_id
  );
  score += buyerMeetings.filter(m => m.status === "proposed" || m.status === "accepted").length * SCORES.schedule_meeting;
  score += buyerMeetings.filter(m => m.status === "accepted").length * SCORES.attend_meeting;
  return score;
}

export default function LeadScoring() {
  const { user } = useAuth();

  const { data: connections = [] } = useQuery({
    queryKey: ["ls-connections", user?.id],
    queryFn: () => db.Connection.filter({ exhibitor_user_id: user.id, status: "accepted" }),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["ls-rfis", user?.id],
    queryFn: () => db.RFI.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["ls-meetings", user?.id],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        db.Meeting.filter({ proposed_by: user.id }),
        db.Meeting.filter({ proposed_to: user.id }),
      ]);
      return [...a, ...b];
    },
    enabled: !!user?.id,
  });

  const leads = connections.map(conn => ({
    ...conn,
    score: calcScore(conn, rfis, meetings),
  })).sort((a, b) => b.score - a.score);

  const hot = leads.filter(l => l.score >= 151);
  const warm = leads.filter(l => l.score >= 51 && l.score < 151);
  const cold = leads.filter(l => l.score < 51);

  const funnelData = [
    { stage: "Booth Visits", count: connections.length, color: "#6b9be8" },
    { stage: "RFIs Sent", count: rfis.length, color: "#a78bfa" },
    { stage: "Meetings", count: meetings.length, color: "#34d399" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">Lead Scoring</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered lead temperature based on buyer engagement</p>
      </div>

      {/* Score legend */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Hot Leads", count: hot.length, icon: Flame, color: "text-red-500", bg: "bg-red-50", desc: "Score 151+" },
          { label: "Warm Leads", count: warm.length, icon: Thermometer, color: "text-orange-500", bg: "bg-orange-50", desc: "Score 51-150" },
          { label: "Cold Leads", count: cold.length, icon: Snowflake, color: "text-blue-400", bg: "bg-blue-50", desc: "Score 0-50" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-2`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold">{item.count}</p>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel chart */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Engagement Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={funnelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scoring guide */}
      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score Breakdown Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(SCORES).map(([action, pts]) => (
              <div key={action} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground capitalize">{action.replace(/_/g, " ")}</span>
                <span className="text-xs font-bold text-primary">+{pts}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No connections yet</p>
          ) : (
            <div className="space-y-2">
              {leads.map(lead => {
                const temp = getTemperature(lead.score);
                const TempIcon = temp.icon;
                const leadRfis = rfis.filter(r => r.buyer_user_id === lead.buyer_user_id).length;
                const leadMeetings = meetings.filter(m =>
                  m.proposed_by === lead.buyer_user_id || m.proposed_to === lead.buyer_user_id
                ).length;
                return (
                  <div key={lead.id} className={`flex items-center justify-between p-3 rounded-xl border ${temp.border} ${temp.bg}`}>
                    <div className="flex items-center gap-3">
                      <TempIcon className={`w-5 h-5 ${temp.color} shrink-0`} />
                      <div>
                        <p className="text-sm font-semibold">{lead.buyer_name || "Buyer"}</p>
                        <p className="text-xs text-muted-foreground">{lead.buyer_company}</p>
                        <div className="flex gap-3 mt-1">
                          {leadRfis > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> {leadRfis} RFI</span>}
                          {leadMeetings > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {leadMeetings} Meeting</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${temp.color}`}>{lead.score}</p>
                      <Badge className={`text-[10px] ${temp.color} bg-transparent border-current`} variant="outline">{temp.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}