import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, CheckCircle2, AlertTriangle, Download, BarChart3, Clock } from "lucide-react";
import { format } from "date-fns";

const ACTION_TYPES = ["qr_scan", "nfc_tap", "ocr_capture", "supplier_save", "product_save", "meeting_create", "follow_up"];

function simulateActions(count, types) {
  const results = [];
  const latencies = [];
  let failures = 0, duplicates = 0;
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const latency = 10 + Math.random() * 200;
    const isFail = Math.random() < 0.03;
    const key = `${type}-${Math.floor(Math.random() * count * 0.9)}`;
    const isDup = seen.has(key);
    seen.add(key);
    latencies.push(latency);
    if (isFail) failures++;
    if (isDup) duplicates++;
    results.push({ type, latency, status: isFail ? "failed" : "success", duplicate: isDup });
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return {
    action_count: count,
    failure_count: failures,
    duplicate_count: duplicates,
    sync_errors: Math.floor(failures * 0.4),
    offline_queue_errors: Math.floor(failures * 0.2),
    avg_latency_ms: Math.round(avgLatency),
    failure_rate: Math.round((failures / count) * 100 * 10) / 10,
    raw_results: { sample: results.slice(0, 10) },
  };
}

export default function AdminStressTest() {
  const qc = useQueryClient();
  const [actionCount, setActionCount] = useState("100");
  const [selectedTypes, setSelectedTypes] = useState(ACTION_TYPES);
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);

  const { data: history = [] } = useQuery({
    queryKey: ["stress-tests"],
    queryFn: () => base44.entities.StressTestResult.list("-created_date", 50),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.StressTestResult.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stress-tests"] }),
  });

  const runTest = () => {
    setRunning(true);
    const count = parseInt(actionCount);
    const start = Date.now();
    setTimeout(() => {
      const res = simulateActions(count, selectedTypes);
      const duration = Date.now() - start;
      const result = {
        test_name: `Stress Test — ${count} actions`,
        action_types: selectedTypes,
        duration_ms: duration,
        status: "completed",
        ...res,
      };
      setCurrentResult(result);
      saveMutation.mutate(result);
      setRunning(false);
    }, Math.min(count * 0.5, 3000));
  };

  const exportReport = (r) => {
    const csv = [
      ["Field", "Value"],
      ["Test Name", r.test_name || r.test_name],
      ["Actions", r.action_count],
      ["Duration (ms)", r.duration_ms],
      ["Avg Latency (ms)", r.avg_latency_ms],
      ["Failures", r.failure_count],
      ["Failure Rate (%)", r.failure_rate],
      ["Duplicates", r.duplicate_count],
      ["Sync Errors", r.sync_errors],
      ["Offline Queue Errors", r.offline_queue_errors],
    ].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `stress-test-${Date.now()}.csv`; a.click();
  };

  const toggleType = (t) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Stress Test Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Simulate high-load scenarios and generate performance reports</p>
      </div>

      {/* Config */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold">Test Configuration</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={actionCount} onValueChange={setActionCount}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 Actions</SelectItem>
              <SelectItem value="500">500 Actions</SelectItem>
              <SelectItem value="1000">1,000 Actions</SelectItem>
              <SelectItem value="5000">5,000 Actions</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map(t => (
              <button key={t} onClick={() => toggleType(t)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedTypes.includes(t) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}>
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
          <Button onClick={runTest} disabled={running || selectedTypes.length === 0} className="ml-auto">
            {running ? "Running..." : "▶ Run Test"}
          </Button>
        </div>
      </div>

      {/* Current Result */}
      {currentResult && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Latest Results — {currentResult.action_count} actions</h3>
            <Button variant="outline" size="sm" onClick={() => exportReport(currentResult)}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg Latency", value: `${currentResult.avg_latency_ms}ms`, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Failure Rate", value: `${currentResult.failure_rate}%`, color: currentResult.failure_rate > 5 ? "text-red-600" : "text-green-600", bg: currentResult.failure_rate > 5 ? "bg-red-50" : "bg-green-50" },
              { label: "Duplicates", value: currentResult.duplicate_count, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Sync Errors", value: currentResult.sync_errors, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(m => (
              <div key={m.label} className={`${m.bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Test History</span>
          <Badge variant="secondary" className="ml-auto">{history.length}</Badge>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Avg Latency</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Failure Rate</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Duplicates</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Export</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No tests run yet</td></tr>}
            {history.map(r => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.created_date ? format(new Date(r.created_date), "MMM d, HH:mm") : "—"}</td>
                <td className="px-4 py-2.5 font-medium">{r.action_count?.toLocaleString()}</td>
                <td className="px-4 py-2.5">{r.avg_latency_ms}ms</td>
                <td className="px-4 py-2.5"><span className={r.failure_rate > 5 ? "text-red-600 font-medium" : "text-green-600"}>{r.failure_rate}%</span></td>
                <td className="px-4 py-2.5">{r.duplicate_count}</td>
                <td className="px-4 py-2.5"><Button variant="ghost" size="sm" onClick={() => exportReport(r)}><Download className="w-3.5 h-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}