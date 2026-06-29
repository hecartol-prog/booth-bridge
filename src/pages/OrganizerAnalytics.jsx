import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, MessageSquare, Calendar, FileText, Download,
  TrendingUp, Trophy, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell
} from "recharts";

export default function OrganizerAnalytics() {
  const [selectedEvent, setSelectedEvent] = useState("all");

  const { data: exhibitors = [] } = useQuery({ queryKey: ["org-exhibitors"], queryFn: () => db.ExhibitorProfile.list() });
  const { data: connections = [] } = useQuery({ queryKey: ["org-connections"], queryFn: () => db.Connection.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ["org-meetings"], queryFn: () => db.Meeting.list() });
  const { data: rfis = [] } = useQuery({ queryKey: ["org-rfis"], queryFn: () => db.RFI.list() });
  const { data: catalogs = [] } = useQuery({ queryKey: ["org-catalogs"], queryFn: () => db.CatalogItem.list() });
  const { data: events = [] } = useQuery({ queryKey: ["org-events"], queryFn: () => db.Event.list() });

  const eventNames = [...new Set(exhibitors.map(e => e.event_name).filter(Boolean))].sort();

  const filter = (arr, field) => selectedEvent === "all" ? arr : arr.filter(r => r.event_name === selectedEvent || r[field] === selectedEvent);

  const filteredExhibitors = filter(exhibitors, "event_name");
  const filteredConnections = filter(connections, "event_name");
  const filteredMeetings = meetings; // meetings don't carry event_name, use all
  const filteredRFIs = rfis;
  const filteredCatalogs = filter(catalogs, "event_name");

  const totalDownloads = filteredCatalogs.reduce((s, c) => s + (c.download_count || 0), 0);
  const acceptedConnections = filteredConnections.filter(c => c.status === "accepted");

  // Top exhibitors by leads
  const leadsByExhibitor = filteredConnections.reduce((acc, c) => {
    if (c.exhibitor_company) acc[c.exhibitor_company] = (acc[c.exhibitor_company] || 0) + 1;
    return acc;
  }, {});
  const topExhibitors = Object.entries(leadsByExhibitor)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Connections per day (last 14 days)
  const now = new Date();
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const count = filteredConnections.filter(c => {
      const cd = new Date(c.created_date);
      return cd.toDateString() === d.toDateString();
    }).length;
    return { date: label, count };
  });

  const stats = [
    { label: "Exhibitors", value: filteredExhibitors.length, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Connections", value: filteredConnections.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Accepted Leads", value: acceptedConnections.length, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Meetings", value: filteredMeetings.length, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "RFIs Sent", value: filteredRFIs.length, icon: MessageSquare, color: "text-red-600", bg: "bg-red-50" },
    { label: "Catalog Downloads", value: totalDownloads, icon: Download, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  // RFI by type
  const rfiByType = filteredRFIs.reduce((acc, r) => {
    const label = r.request_type?.replace(/_/g, " ") || "other";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const rfiChartData = Object.entries(rfiByType).map(([name, count]) => ({ name, count }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Event Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide intelligence dashboard</p>
        </div>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Events" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {eventNames.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Daily connections chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Connections Over Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221, 73%, 40%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* RFI breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">RFI Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {rfiChartData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No RFIs yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rfiChartData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={85} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(213, 65%, 65%)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Exhibitor Rankings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Top Exhibitors by Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topExhibitors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topExhibitors.map((ex, i) => (
                <div key={ex.name} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{ex.name}</span>
                      <span className="text-sm font-bold text-primary ml-2">{ex.count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5"
                        style={{ width: `${Math.min(100, (ex.count / (topExhibitors[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
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