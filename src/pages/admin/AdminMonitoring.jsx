import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Plus, Download, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

const SEVERITY_CONFIG = {
  info: { color: "bg-blue-100 text-blue-700", icon: CheckCircle2, label: "Info" },
  warning: { color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle, label: "Warning" },
  critical: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Critical" },
};

const SYSTEMS = [
  { key: "api", label: "API Status" },
  { key: "database", label: "Database" },
  { key: "payments", label: "Payments" },
  { key: "nfc", label: "NFC Engine" },
  { key: "ocr", label: "OCR Engine" },
  { key: "offline", label: "Offline Queue" },
  { key: "sw", label: "Service Worker" },
  { key: "sync", label: "Sync Engine" },
];

function SystemHealthCard({ label, status }) {
  const colors = { operational: "text-green-600 bg-green-50", degraded: "text-yellow-600 bg-yellow-50", down: "text-red-600 bg-red-50" };
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === "operational" ? "bg-green-500" : status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className={`text-xs font-medium mt-0.5 ${status === "operational" ? "text-green-600" : status === "degraded" ? "text-yellow-600" : "text-red-600"}`}>{status}</p>
      </div>
    </div>
  );
}

export default function AdminMonitoring() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", severity: "info", category: "system" });
  const [sevFilter, setSevFilter] = useState("all");

  const { data: alerts = [], refetch } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: () => base44.entities.SystemAlert.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemAlert.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["system-alerts"] }); setCreating(false); setForm({ title: "", message: "", severity: "info", category: "system" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemAlert.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-alerts"] }),
  });

  const filtered = sevFilter === "all" ? alerts : alerts.filter(a => a.severity === sevFilter);
  const activeCount = alerts.filter(a => a.status === "active").length;
  const criticalCount = alerts.filter(a => a.severity === "critical" && a.status === "active").length;

  const exportAlerts = () => {
    const csv = ["Date,Severity,Category,Title,Status,Message", ...alerts.map(a => [a.created_date, a.severity, a.category, `"${a.title}"`, a.status, `"${a.message || ""}"`].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `alerts-${Date.now()}.csv`; a.click();
  };

  // Simulate system health based on recent alerts
  const getSystemStatus = (key) => {
    const recent = alerts.filter(a => a.category === key && a.status === "active");
    if (recent.some(a => a.severity === "critical")) return "down";
    if (recent.some(a => a.severity === "warning")) return "degraded";
    return "operational";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> Production Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time system health and alert management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportAlerts}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Alert</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Alerts", value: activeCount, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Critical", value: criticalCount, color: "text-red-600", bg: "bg-red-50" },
          { label: "Total Alerts", value: alerts.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Resolved", value: alerts.filter(a => a.status === "resolved").length, color: "text-green-600", bg: "bg-green-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* System Health Grid */}
      <div>
        <h3 className="font-semibold mb-3">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SYSTEMS.map(s => <SystemHealthCard key={s.key} label={s.label} status={getSystemStatus(s.key)} />)}
        </div>
      </div>

      {/* Alert Log */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-3">
          <span className="font-semibold text-sm">Alert History</span>
          <Select value={sevFilter} onValueChange={setSevFilter}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No alerts</div>}
          {filtered.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-red-600" : alert.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{alert.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{alert.severity}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{alert.created_date ? format(new Date(alert.created_date), "MMM d, HH:mm") : ""}</span>
                  </div>
                  {alert.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.message}</p>}
                </div>
                {alert.status === "active" && (
                  <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => updateMutation.mutate({ id: alert.id, data: { status: "resolved", resolved_at: new Date().toISOString() } })}>
                    Resolve
                  </Button>
                )}
                {alert.status !== "active" && <span className="text-xs text-green-600 font-medium shrink-0">{alert.status}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {creating && (
        <Dialog open onOpenChange={() => setCreating(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create System Alert</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label>Message</Label><Textarea className="mt-1" rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sync">Sync</SelectItem><SelectItem value="webhook">Webhook</SelectItem><SelectItem value="nfc">NFC</SelectItem><SelectItem value="ocr">OCR</SelectItem><SelectItem value="payment">Payment</SelectItem><SelectItem value="offline_queue">Offline Queue</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}