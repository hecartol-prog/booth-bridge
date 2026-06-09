import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Building2, MessageSquare, Calendar, FileText, Download,
  TrendingUp, Trophy, Globe, BarChart3, Star, Activity, QrCode, Bookmark
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { exportGenericCSV } from "@/utils/csvExport";

const COLORS = ["hsl(221,73%,40%)", "hsl(213,65%,65%)", "hsl(170,55%,45%)", "hsl(340,65%,55%)", "hsl(200,70%,50%)", "hsl(45,90%,50%)"];

export default function OrganizerCommandCenter() {
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: exhibitors = [] } = useQuery({ queryKey: ["occ-exhibitors"], queryFn: () => base44.entities.ExhibitorProfile.list() });
  const { data: connections = [] } = useQuery({ queryKey: ["occ-connections"], queryFn: () => base44.entities.Connection.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ["occ-meetings"], queryFn: () => base44.entities.Meeting.list() });
  const { data: rfis = [] } = useQuery({ queryKey: ["occ-rfis"], queryFn: () => base44.entities.RFI.list() });
  const { data: catalogs = [] } = useQuery({ queryKey: ["occ-catalogs"], queryFn: () => base44.entities.CatalogItem.list() });
  const { data: events = [] } = useQuery({ queryKey: ["occ-events"], queryFn: () => base44.entities.Event.list() });
  const { data: saved = [] } = useQuery({ queryKey: ["occ-saved"], queryFn: () => base44.entities.SavedBooth.list() });
  const { data: sponsored = [] } = useQuery({ queryKey: ["occ-sponsored"], queryFn: () => base44.entities.SponsoredListing.list() });

  const eventNames = [...new Set(exhibitors.map(e => e.event_name).filter(Boolean))].sort();
  const filterByEvent = (arr, field = "event_name") =>
    selectedEvent === "all" ? arr : arr.filter(r => r[field] === selectedEvent);

  const filteredExhibitors = filterByEvent(exhibitors);
  const filteredConnections = filterByEvent(connections);
  const filteredRFIs = rfis;
  const filteredSaved = filterByEvent(saved);
  const totalDownloads = filterByEvent(catalogs).reduce((s, c) => s + (c.download_count || 0), 0);
  const accepted = filteredConnections.filter(c => c.status === "accepted");

  // Top exhibitors by engagement
  const engagementByExhibitor = filteredConnections.reduce((acc, c) => {
    const key = c.exhibitor_company || c.exhibitor_user_id;
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topExhibitors = Object.entries(engagementByExhibitor)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Country distribution
  const countryMap = accepted.reduce((acc, c) => {
    const k = c.buyer_country || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const countryData = Object.entries(countryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Daily traffic (14 days)
  const now = new Date();
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const count = filteredConnections.filter(c => new Date(c.created_date).toDateString() === d.toDateString()).length;
    return { date: label, count };
  });

  // Sponsor performance
  const sponsorData = sponsored.map(s => ({
    company: s.company_name || s.exhibitor_user_id,
    tier: s.visibility_tier,
    impressions: s.impressions || 0,
    clicks: s.clicks || 0,
    leads: s.leads_generated || 0,
  }));

  const summaryStats = [
    { label: "Total Exhibitors", value: filteredExhibitors.length, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Connections Made", value: filteredConnections.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Accepted Leads", value: accepted.length, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Meetings Scheduled", value: meetings.length, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "RFIs Generated", value: filteredRFIs.length, icon: MessageSquare, color: "text-red-600", bg: "bg-red-50" },
    { label: "Saved Suppliers", value: filteredSaved.length, icon: Bookmark, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Catalog Downloads", value: totalDownloads, icon: Download, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Active Sponsors", value: sponsored.filter(s => s.status === "active").length, icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const tabs = ["overview", "exhibitors", "buyers", "sponsors"];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Organizer Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time event intelligence dashboard</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventNames.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => exportGenericCSV(filteredConnections, "event-report.csv")}>
            <Download className="w-4 h-4 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        {summaryStats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Event Traffic — Last 14 Days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(221,73%,40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Exhibitors by Leads</CardTitle></CardHeader>
            <CardContent>
              {topExhibitors.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No data yet</p> : (
                <div className="space-y-2">
                  {topExhibitors.slice(0, 6).map((ex, i) => (
                    <div key={ex.name} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>#{i+1}</span>
                      <span className="text-sm flex-1 truncate">{ex.name}</span>
                      <div className="w-24 bg-muted rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${(ex.count / (topExhibitors[0]?.count || 1)) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold">{ex.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "exhibitors" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">All Exhibitors ({filteredExhibitors.length})</CardTitle></CardHeader>
            <CardContent>
              {filteredExhibitors.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No exhibitors yet</p> : (
                <div className="space-y-2">
                  {filteredExhibitors.slice(0, 20).map(ex => {
                    const leads = filteredConnections.filter(c => c.exhibitor_user_id === ex.user_id).length;
                    return (
                      <div key={ex.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{ex.company_name}</p>
                          <p className="text-xs text-muted-foreground">Booth {ex.booth_number} · {ex.event_name}</p>
                        </div>
                        <Badge variant="outline">{leads} leads</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "buyers" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Countries Represented</CardTitle></CardHeader>
            <CardContent>
              {countryData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No country data yet</p> : (
                <div className="space-y-2">
                  {countryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i+1}</span>
                      <span className="text-sm flex-1">{c.name}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${(c.value / countryData[0].value) * 100}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-6">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">RFI Breakdown</CardTitle></CardHeader>
            <CardContent>
              {filteredRFIs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No RFIs yet</p> : (() => {
                const rfiByType = filteredRFIs.reduce((acc, r) => {
                  const l = r.request_type?.replace(/_/g, " ") || "other";
                  acc[l] = (acc[l] || 0) + 1;
                  return acc;
                }, {});
                const rfiData = Object.entries(rfiByType).map(([name, count]) => ({ name, count }));
                return (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={rfiData} layout="vertical">
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={85} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(213,65%,65%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "sponsors" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sponsor Performance Report</CardTitle>
          </CardHeader>
          <CardContent>
            {sponsorData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sponsored listings yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">Company</th>
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">Tier</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Impressions</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Clicks</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorData.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-medium">{s.company}</td>
                        <td className="py-2"><Badge variant="outline" className="capitalize">{s.tier}</Badge></td>
                        <td className="py-2 text-right">{s.impressions.toLocaleString()}</td>
                        <td className="py-2 text-right">{s.clicks.toLocaleString()}</td>
                        <td className="py-2 text-right text-green-600 font-semibold">{s.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}