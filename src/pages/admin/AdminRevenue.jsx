import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Crown, Star, Building2, Users, BarChart3, Zap
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

export default function AdminRevenue() {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: () => base44.entities.PremiumBoothSubscription.list(),
  });
  const { data: sponsored = [] } = useQuery({
    queryKey: ["admin-sponsored"],
    queryFn: () => base44.entities.SponsoredListing.list(),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-revenue-users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: exhibitors = [] } = useQuery({
    queryKey: ["admin-revenue-exhibitors"],
    queryFn: () => base44.entities.ExhibitorProfile.list(),
  });
  const { data: connections = [] } = useQuery({
    queryKey: ["admin-revenue-connections"],
    queryFn: () => base44.entities.Connection.list(),
  });

  const activeSubs = subscriptions.filter(s => s.status === "active");
  const premiumSubs = activeSubs.filter(s => s.plan_type === "premium");
  const activeSponsorships = sponsored.filter(s => s.status === "active");
  const totalMRR = premiumSubs.reduce((s, sub) => s + (sub.amount_paid || 0), 0);
  const sponsorRevenue = activeSponsorships.reduce((s, sp) => s + (sp.event_budget || 0), 0);
  const totalRevenue = totalMRR + sponsorRevenue;

  const tierBreakdown = sponsored.reduce((acc, s) => {
    acc[s.visibility_tier] = (acc[s.visibility_tier] || 0) + 1;
    return acc;
  }, {});

  const placementBreakdown = sponsored.reduce((acc, s) => {
    const label = s.placement?.replace(/_/g, " ") || "other";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const placementChartData = Object.entries(placementBreakdown).map(([name, count]) => ({ name, count }));

  const sponsorImpressionsTotal = sponsored.reduce((s, sp) => s + (sp.impressions || 0), 0);
  const sponsorClicksTotal = sponsored.reduce((s, sp) => s + (sp.clicks || 0), 0);

  const metrics = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50", sub: "all sources" },
    { label: "Premium Booths", value: premiumSubs.length, icon: Crown, color: "text-amber-600", bg: "bg-amber-50", sub: "active" },
    { label: "Sponsored Listings", value: activeSponsorships.length, icon: Star, color: "text-purple-600", bg: "bg-purple-50", sub: "active" },
    { label: "Total Exhibitors", value: exhibitors.length, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", sub: "registered" },
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary", bg: "bg-primary/10", sub: "all roles" },
    { label: "Sponsor Impressions", value: sponsorImpressionsTotal.toLocaleString(), icon: BarChart3, color: "text-teal-600", bg: "bg-teal-50", sub: "total" },
  ];

  const tierColors = { bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", platinum: "#e5e4e2" };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" /> Revenue Control Center
        </h1>
        <p className="text-slate-500 text-sm mt-1">BoothBridge monetization intelligence</p>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{m.value}</p>
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className="text-[10px] text-slate-400">{m.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Sponsored placement breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sponsored Placement Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {placementChartData.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No sponsored listings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={placementChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(221,73%,40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tier breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Visibility Tier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {["platinum", "gold", "silver", "bronze"].map(tier => {
                const count = tierBreakdown[tier] || 0;
                const max = Math.max(...Object.values(tierBreakdown), 1);
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="text-xs font-semibold capitalize w-16" style={{ color: tierColors[tier] }}>{tier}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: tierColors[tier] }} />
                    </div>
                    <span className="text-sm font-bold w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Premium Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {premiumSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No premium subscriptions yet</p>
          ) : (
            <div className="space-y-2">
              {premiumSubs.map(sub => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{sub.exhibitor_id}</p>
                    <p className="text-xs text-muted-foreground">{sub.start_date} → {sub.end_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700">{sub.plan_type}</Badge>
                    <Badge variant={sub.payment_status === "paid" ? "default" : "secondary"}>{sub.payment_status}</Badge>
                    <span className="text-sm font-semibold">${sub.amount_paid || 0}</span>
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