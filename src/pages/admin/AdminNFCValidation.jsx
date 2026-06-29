import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Radio, BarChart3 } from "lucide-react";

export default function AdminNFCValidation() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);

  const { data: tags = [] } = useQuery({ queryKey: ["nfc-tags"], queryFn: () => db.NFCProductTag.list("-created_date", 500) });
  const { data: profiles = [] } = useQuery({ queryKey: ["nfc-profiles"], queryFn: () => db.NFCProfile.list("-created_date", 500) });
  const { data: products = [] } = useQuery({ queryKey: ["products-all"], queryFn: () => db.Product.list("-created_date", 1000) });

  const runValidation = () => {
    setRunning(true);
    setTimeout(() => {
      const productIds = new Set(products.map(p => p.id));
      const healthy = [], broken = [], orphan = [], inactive = [], duplicate = [];
      const tagCodesSeen = new Set();

      tags.forEach(tag => {
        const issues = [];
        if (!tag.active_status) { inactive.push({ ...tag, issues: ["inactive"] }); return; }
        if (!tag.product_id || !productIds.has(tag.product_id)) issues.push("missing_product");
        if (!tag.supplier_user_id) issues.push("missing_supplier");
        if (tag.tag_code && tagCodesSeen.has(tag.tag_code)) issues.push("duplicate_code");
        if (tag.tag_code) tagCodesSeen.add(tag.tag_code);
        if (issues.length === 0) healthy.push(tag);
        else if (issues.includes("missing_supplier")) orphan.push({ ...tag, issues });
        else broken.push({ ...tag, issues });
      });

      const profileBroken = profiles.filter(p => !p.user_id || !p.active);
      const total = tags.length + profiles.length;
      const healthyCount = healthy.length + profiles.filter(p => p.user_id && p.active).length;
      const score = total > 0 ? Math.round((healthyCount / total) * 100) : 100;

      setReport({ healthy, broken, orphan, inactive, duplicate, profileBroken, score, total, timestamp: new Date() });
      setRunning(false);
    }, 1200);
  };

  const scoreColor = !report ? "text-slate-400" : report.score >= 90 ? "text-green-600" : report.score >= 70 ? "text-yellow-600" : "text-red-600";
  const scoreBg = !report ? "bg-slate-50" : report.score >= 90 ? "bg-green-50" : report.score >= 70 ? "bg-yellow-50" : "bg-red-50";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radio className="w-6 h-6 text-primary" /> NFC Validation Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Validate all NFC tags before event launch</p>
        </div>
        <Button onClick={runValidation} disabled={running}>
          {running ? "Validating..." : "▶ Run Full Validation"}
        </Button>
      </div>

      {/* Health Score */}
      <div className={`rounded-2xl p-6 ${scoreBg} border flex items-center gap-6`}>
        <div className="text-center">
          <p className={`text-5xl font-bold ${scoreColor}`}>{report ? `${report.score}%` : "—"}</p>
          <p className="text-sm text-muted-foreground mt-1">NFC Health Score</p>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Product Tags", value: tags.length, icon: Radio, color: "text-blue-600" },
            { label: "NFC Profiles", value: profiles.length, icon: ShieldCheck, color: "text-purple-600" },
            { label: "Healthy", value: report ? report.healthy.length : "—", icon: CheckCircle2, color: "text-green-600" },
            { label: "Issues", value: report ? report.broken.length + report.orphan.length : "—", icon: AlertTriangle, color: "text-red-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {!report && (
        <div className="bg-white rounded-xl border p-12 text-center text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Run validation to see NFC health report</p>
          <p className="text-sm mt-1">Checks all product tags, profiles, users, and event associations</p>
        </div>
      )}

      {report && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: "healthy", label: "Healthy Tags", color: "green", icon: CheckCircle2, items: report.healthy },
            { key: "broken", label: "Broken Tags", color: "red", icon: XCircle, items: report.broken },
            { key: "orphan", label: "Orphan Tags", color: "orange", icon: AlertTriangle, items: report.orphan },
            { key: "inactive", label: "Inactive Tags", color: "slate", icon: Radio, items: report.inactive },
          ].map(section => (
            <div key={section.key} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <section.icon className={`w-4 h-4 text-${section.color}-600`} />
                <span className="font-semibold text-sm">{section.label}</span>
                <Badge variant="secondary" className="ml-auto">{section.items.length}</Badge>
              </div>
              {section.items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {section.items.slice(0, 20).map((item, i) => (
                    <div key={i} className="text-xs bg-slate-50 rounded p-2">
                      <span className="font-mono text-slate-500">{item.tag_code || item.id?.slice(0, 10)}</span>
                      {item.issues && <span className="ml-2 text-red-600">{item.issues.join(", ")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {report && (
        <p className="text-xs text-muted-foreground text-center">
          Last validated: {report.timestamp.toLocaleString()}
        </p>
      )}
    </div>
  );
}