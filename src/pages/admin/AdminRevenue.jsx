import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV } from "@/utils/adminExport";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, Crown, Star, TrendingUp, Zap, Edit, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminRevenue() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: subscriptions = [] } = useQuery({ queryKey: ["admin-subs"], queryFn: () => db.PremiumBoothSubscription.list() });
  const { data: sponsored = [] } = useQuery({ queryKey: ["admin-sponsored"], queryFn: () => db.SponsoredListing.list() });
  const { data: billing = [] } = useQuery({ queryKey: ["admin-billing"], queryFn: () => db.BillingTransaction.list() });
  const { data: billingSubs = [] } = useQuery({ queryKey: ["admin-billing-subs"], queryFn: () => db.BillingSubscription.list() });

  const updateSub = useMutation({
    mutationFn: (/** @type {any} */ d) => db.PremiumBoothSubscription.update(d.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-subs"] }); toast({ title: "Subscription updated" }); setEditing(null); },
  });

  const activeSubs = subscriptions.filter(s => s.status === "active");
  const totalRevenue = billing.filter(t => t.status === "succeeded").reduce((s, t) => s + (t.amount || 0), 0);
  const mrr = activeSubs.reduce((s, sub) => s + (sub.amount_paid || 0), 0);

  const statCards = [
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "MRR (Active Subs)", value: `$${mrr.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Subscriptions", value: activeSubs.length, icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Sponsored Listings", value: sponsored.filter(s => s.status === "active").length, icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Transactions", value: billing.length, icon: Zap, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Billing Subscriptions", value: billingSubs.length, icon: RefreshCcw, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  const subColumns = [
    { header: "Exhibitor ID", accessor: "exhibitor_id" },
    { header: "Plan", accessor: "plan_type", render: r => <Badge className="bg-amber-100 text-amber-700">{r.plan_type}</Badge> },
    { header: "Status", accessor: "status", render: r => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span> },
    { header: "Payment", accessor: "payment_status", render: r => <span className={`text-xs ${r.payment_status === "paid" ? "text-green-600 font-medium" : "text-slate-500"}`}>{r.payment_status}</span> },
    { header: "Amount", accessor: "amount_paid", render: r => <span className="font-semibold">${r.amount_paid || 0}</span> },
    { header: "Start", accessor: "start_date" },
    { header: "End", accessor: "end_date" },
    { header: "Actions", sortable: false, render: r => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing({ ...r })}><Edit className="w-3 h-3" /></Button>
      </div>
    )},
  ];

  const txColumns = [
    { header: "Type", accessor: "type", render: r => <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{r.type}</span> },
    { header: "Status", accessor: "status", render: r => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "succeeded" ? "bg-green-100 text-green-700" : r.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{r.status}</span> },
    { header: "Amount", accessor: "amount", render: r => <span className="font-semibold">${r.amount || 0} {r.currency || "USD"}</span> },
    { header: "Provider", accessor: "provider" },
    { header: "Description", accessor: "description", render: r => <span className="text-xs text-slate-500 max-w-[200px] truncate block">{r.description || "—"}</span> },
    { header: "Date", accessor: "created_date", render: r => <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</span> },
  ];

  const tierBreakdown = sponsored.reduce((acc, s) => { acc[s.visibility_tier] = (acc[s.visibility_tier] || 0) + 1; return acc; }, {});
  const tierData = Object.entries(tierBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Revenue Operations Center</h2>
        <p className="text-sm text-slate-500">Financial control & subscription management</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tierData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sponsored Listing Tier Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={tierData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {tierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-3 w-fit">
          <TabsTrigger value="subscriptions" className="text-xs">Premium Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">Transactions ({billing.length})</TabsTrigger>
          <TabsTrigger value="billing-subs" className="text-xs">Billing Subscriptions ({billingSubs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <AdminDataGrid data={subscriptions} columns={subColumns}
            filterOptions={[{ key: "status", label: "Status", options: ["active","expired","cancelled","trial"].map(v => ({ value: v, label: v })) }]}
            onExport={rows => exportToCSV(rows, "subscriptions")}
            bulkActions={[{ label: "Export CSV", onClick: ids => exportToCSV(subscriptions.filter(s => ids.includes(s.id)), "subscriptions") }]} />
        </TabsContent>

        <TabsContent value="transactions">
          <AdminDataGrid data={billing} columns={txColumns}
            filterOptions={[{ key: "status", label: "Status", options: ["succeeded","failed","pending","refunded"].map(v => ({ value: v, label: v })) }]}
            onExport={rows => exportToCSV(rows, "transactions")} />
        </TabsContent>

        <TabsContent value="billing-subs">
          <AdminDataGrid data={billingSubs}
            columns={[
              { header: "Plan", accessor: "plan_name", render: r => <span className="font-medium">{r.plan_name || r.plan_type}</span> },
              { header: "Status", accessor: "status", render: r => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100"}`}>{r.status}</span> },
              { header: "Amount", accessor: "amount", render: r => <span className="font-semibold">${r.amount || 0} {r.currency || "USD"}/{r.interval || "mo"}</span> },
              { header: "Provider", accessor: "provider" },
              { header: "Period End", accessor: "current_period_end", render: r => <span className="text-xs text-slate-400">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString() : "—"}</span> },
            ]}
            onExport={rows => exportToCSV(rows, "billing-subscriptions")} />
        </TabsContent>
      </Tabs>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Subscription</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Select value={editing.status} onValueChange={v => setEditing(d => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","expired","cancelled","trial"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                <Select value={editing.payment_status} onValueChange={v => setEditing(d => ({ ...d, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["paid","pending","failed","free"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => updateSub.mutate(editing)}>Save</Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}