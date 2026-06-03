import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Inbox, Calendar, TrendingUp, Camera, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ExhibitorDashboard() {
  const { user } = useAuth();

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
    queryFn: () => base44.entities.Meeting.list("-created_date", 50),
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

  const stats = [
    { title: "Total Leads", value: accepted.length, icon: Users, color: "text-primary" },
    { title: "Pending", value: pending.length, icon: TrendingUp, color: "text-amber-500" },
    { title: "Open RFIs", value: pendingRfis.length, icon: Inbox, color: "text-red-500" },
    { title: "Meetings", value: meetings.length, icon: Calendar, color: "text-green-500" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        {profile && (
          <p className="text-sm text-muted-foreground mt-1">
            {profile.company_name} · Booth {profile.booth_number} · {profile.event_name}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
            <CardTitle className="text-sm font-heading">Connections Today</CardTitle>
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
            <CardTitle className="text-sm font-heading">RFI Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No RFIs yet</div>
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

      {/* Recent leads */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading">Recent Leads</CardTitle>
            <Link to="/connections" className="text-xs text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No leads yet. Share your QR code!</p>
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