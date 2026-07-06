import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  BarChart3, Globe, Package, Download, Users, Eye, FileText, ArrowLeft
} from "lucide-react";
import { exportGenericCSV } from "@/utils/csvExport";
import { Link } from "react-router-dom";

const COLORS = ["hsl(221,73%,40%)", "hsl(213,65%,65%)", "hsl(170,55%,45%)", "hsl(340,65%,55%)", "hsl(200,70%,50%)"];

export default function ExhibitorAnalytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("traffic");

  const { data: connections = [] } = useQuery({
    queryKey: ["ea-connections", user?.id],
    queryFn: () => db.Connection.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["ea-products", user?.id],
    queryFn: () => db.Product.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: catalogs = [] } = useQuery({
    queryKey: ["ea-catalogs", user?.id],
    queryFn: () => db.CatalogItem.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: rfis = [] } = useQuery({
    queryKey: ["ea-rfis", user?.id],
    queryFn: () => db.RFI.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ["ea-meetings", user?.id],
    queryFn: () => db.Meeting.filter({ proposed_to: user.id }),
    enabled: !!user?.id,
  });
  const { data: interactions = [] } = useQuery({
    queryKey: ["ea-interactions", user?.id],
    queryFn: () => db.LeadInteraction.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const accepted = connections.filter(c => c.status === "accepted");
  const totalDownloads = catalogs.reduce((s, c) => s + (c.download_count || 0), 0);

  // Traffic over last 14 days
  const now = new Date();
  const dailyTraffic = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    const label = d.toLocaleDateString("en", { month: "short", day: "numeric" });
    const count = connections.filter(c => new Date(c.created_date).toDateString() === d.toDateString()).length;
    return { date: label, visits: count };
  });

  // Visitor countries
  const countryMap = accepted.reduce((acc, c) => {
    const k = c.buyer_country || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const countryData = Object.entries(countryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Buyer industries
  const industryMap = accepted.reduce((acc, c) => {
    const k = c.buyer_industry || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const industryData = Object.entries(industryMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  // Catalog downloads sorted
  const catalogSorted = [...catalogs].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));

  // Funnel data
  const funnelData = [
    { name: "Profile Views", value: connections.length, fill: COLORS[0] },
    { name: "Accepted Leads", value: accepted.length, fill: COLORS[1] },
    { name: "Catalog Downloads", value: Math.min(totalDownloads, accepted.length), fill: COLORS[2] },
    { name: "RFIs", value: rfis.length, fill: COLORS[3] },
    { name: "Meetings", value: meetings.length, fill: COLORS[4] },
  ];

  const tabs = ["traffic", "products", "buyers", "funnel"];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics Suite
          </h1>
          <p className="text-sm text-muted-foreground">Measure your booth's ROI</p>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => exportGenericCSV(accepted, "exhibitor-analytics.csv")}>
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Visitors", value: connections.length, icon: Eye, color: "text-primary" },
          { label: "Accepted Leads", value: accepted.length, icon: Users, color: "text-green-600" },
          { label: "RFIs Received", value: rfis.length, icon: FileText, color: "text-amber-600" },
          { label: "Catalog Downloads", value: totalDownloads, icon: Download, color: "text-violet-600" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "traffic" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Visitor Traffic — Last 14 Days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyTraffic}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="visits" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Visits by Country</CardTitle></CardHeader>
            <CardContent>
              {countryData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No country data yet</p> : (
                <div className="space-y-2">
                  {countryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-sm flex-1">{c.name}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${(c.value / countryData[0].value) * 100}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-right w-6">{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Catalog Downloads</CardTitle></CardHeader>
            <CardContent>
              {catalogSorted.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No catalogs uploaded yet</p> : (
                <div className="space-y-2">
                  {catalogSorted.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.type?.replace(/_/g, " ")}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-bold text-violet-600">{c.download_count || 0}</p>
                        <p className="text-xs text-muted-foreground">downloads</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Products ({products.length})</CardTitle></CardHeader>
            <CardContent>
              {products.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No products yet</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {products.slice(0, 6).map(p => (
                    <div key={p.id} className="rounded-lg border overflow-hidden">
                      {p.image_url ? <img src={p.image_url} className="w-full h-20 object-cover" alt={p.title} /> : <div className="w-full h-20 bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>}
                      <p className="text-xs p-1.5 truncate font-medium">{p.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "buyers" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Industries</CardTitle></CardHeader>
            <CardContent>
              {industryData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No industry data yet</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={industryData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Country Distribution</CardTitle></CardHeader>
            <CardContent>
              {countryData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No data yet</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={countryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {countryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "funnel" && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 mt-2">
              {funnelData.map((step, i) => (
                <div key={step.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{step.name}</span>
                      <span className="font-bold">{step.value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${funnelData[0].value ? (step.value / funnelData[0].value) * 100 : 0}%`,
                          backgroundColor: step.fill,
                        }}
                      />
                    </div>
                    {i > 0 && funnelData[i - 1].value > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {((step.value / funnelData[i - 1].value) * 100).toFixed(0)}% conversion from previous step
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}