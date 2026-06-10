import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Inbox, Calendar, TrendingUp, FileText, CreditCard, Flame, Download, Wand2 } from "lucide-react";
import { calculateLeadScore, getLeadTemperature } from "@/utils/leadScoring";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { exportLeadsCSV } from "@/utils/csvExport";

export default function ExhibitorDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: connections = [] } = useQuery({
    queryKey: ["ex-connections", user?.id],
    queryFn: () => base44.entities.Connection.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["ex-rfis", user?.id],
    queryFn: () => base44.entities.RFI.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["ex-meetings", user?.id],
    queryFn: async () => {
      const [asProposer, asRecipient] = await Promise.all([
        base44.entities.Meeting.filter({ proposed_by: user.id }),
        base44.entities.Meeting.filter({ proposed_to: user.id }),
      ]);
      return [...asProposer, ...asRecipient];
    },
    enabled: !!user?.id,
  });

  const { data: catalogues = [] } = useQuery({
    queryKey: ["ex-catalogues", user?.id],
    queryFn: () => base44.entities.CatalogItem.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: leadInteractions = [] } = useQuery({
    queryKey: ["ex-interactions", user?.id],
    queryFn: () => base44.entities.LeadInteraction.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: buyerProfiles = [] } = useQuery({
    queryKey: ["ex-buyer-profiles", user?.id],
    queryFn: async () => {
      const conns = await base44.entities.Connection.filter({ exhibitor_user_id: user.id, status: "accepted" });
      const buyerIds = conns.map(c => c.buyer_user_id).filter(Boolean);
      if (!buyerIds.length) return [];
      const profiles = await base44.entities.BuyerProfile.list();
      return profiles.filter(p => buyerIds.includes(p.user_id));
    },
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["ex-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.ExhibitorProfile.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id,
  });

  const accepted = connections.filter(c => c.status === "accepted");
  const pending = connections.filter(c => c.status === "pending");
  const pendingRfis = rfis.filter(r => r.status === "pending");

  // RFI breakdown
  const rfiBreakdown = rfis.reduce((acc, r) => {
    acc[r.request_type] = (acc[r.request_type] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(rfiBreakdown).map(([type, count]) => ({
    name: type.replace(/_/g, " "),
    count,
  }));

  // Connections per hour (today)
  const today = new Date();
  const todayConns = accepted.filter(c => {
    const d = new Date(c.created_date);
    return d.toDateString() === today.toDateString();
  });
  const hourData = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    const count = todayConns.filter(c => new Date(c.created_date).getHours() === hour).length;
    return { hour: `${hour}:00`, count };
  });

  const totalCatalogueViews = catalogues.reduce((sum, c) => sum + (c.download_count || 0), 0);
  const businessCardsCollected = buyerProfiles.filter(p => p.digital_card?.name || p.digital_card?.email).length;

  const stats = [
    { title: t("dashboard.totalLeads"), value: accepted.length, icon: Users, color: "text-primary" },
    { title: t("dashboard.pending"), value: pending.length, icon: TrendingUp, color: "text-amber-500" },
    { title: t("dashboard.openRFIs"), value: pendingRfis.length, icon: Inbox, color: "text-red-500" },
    { title: t("dashboard.meetings"), value: meetings.length, icon: Calendar, color: "text-green-500" },
    { title: "Catalogue Views", value: totalCatalogueViews, icon: FileText, color: "text-violet-500" },
    { title: "Business Cards Collected", value: businessCardsCollected, icon: CreditCard, color: "text-teal-500" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("dashboard.dashboard")}</h1>
          {profile && (
            <p className="text-sm text-muted-foreground mt-1">
              {profile.company_name} · {t("dashboard.booth")} {profile.booth_number} · {profile.event_name}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link to="/setup-wizard">
            <Button size="sm" variant="outline">
              <Wand2 className="w-4 h-4 mr-1.5" /> Setup Wizard
            </Button>
          </Link>
          {accepted.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportLeadsCSV({ connections: accepted, rfis, meetings })}
            >
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map(stat => (
          <Card key={stat.title} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.title}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Connections per hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("dashboard.connectionsToday")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourData}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221, 73%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RFI Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">{t("dashboard.rfiBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">{t("dashboard.noRFIs")}</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(213, 65%, 65%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Scoring */}
      {leadInteractions.length > 0 && (() => {
        const byBuyer = leadInteractions.reduce((acc, i) => {
          if (!acc[i.buyer_user_id]) acc[i.buyer_user_id] = [];
          acc[i.buyer_user_id].push(i);
          return acc;
        }, {});
        const scoredLeads = Object.entries(byBuyer).map(([buyerId, ints]) => {
          const score = calculateLeadScore(ints);
          const temp = getLeadTemperature(score);
          const conn = accepted.find(c => c.buyer_user_id === buyerId);
          return { buyerId, score, temp, name: conn?.buyer_name || "Unknown", company: conn?.buyer_company || "" };
        }).sort((a, b) => b.score - a.score);

        return (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" /> Lead Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scoredLeads.slice(0, 8).map(lead => (
                  <div key={lead.buyerId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                    </div>
                    <div className={`ml-4 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${lead.temp.bg} ${lead.temp.color} ${lead.temp.border} shrink-0`}>
                      <span>{lead.temp.emoji}</span>
                      <span>{lead.score} pts</span>
                      <span className="opacity-70">· {lead.temp.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Catalogue views breakdown */}
      {catalogues.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" /> Catalogue Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {catalogues.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.thumbnail_url
                      ? <img src={c.thumbnail_url} className="w-7 h-7 rounded object-cover border shrink-0" alt="" />
                      : <div className="w-7 h-7 rounded bg-violet-50 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5 text-violet-400" /></div>
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.type?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-violet-600">{c.download_count || 0}</p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent leads */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading">{t("dashboard.recentLeads")}</CardTitle>
            <Link to="/connections" className="text-xs text-primary hover:underline">{t("dashboard.viewAll")}</Link>
          </div>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("dashboard.noLeads")}</p>
          ) : (
            <div className="space-y-2">
              {accepted.slice(0, 5).map(conn => (
                <div key={conn.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{conn.buyer_name}</p>
                    <p className="text-xs text-muted-foreground">{conn.buyer_company}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(conn.created_date), "MMM d, h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}