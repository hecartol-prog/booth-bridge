import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, AlertCircle, XCircle, Building2, Package, FileText,
  QrCode, Wifi, Image, Users, Star, MapPin, Download, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react";
import { exportGenericCSV } from "@/utils/csvExport";

const TIER_CONFIG = {
  launch_ready: { label: "Launch Ready 🚀", color: "bg-green-500", textColor: "text-green-700", bg: "bg-green-50", min: 90 },
  gold: { label: "Gold Booth 🥇", color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50", min: 75 },
  silver: { label: "Silver Booth 🥈", color: "bg-slate-400", textColor: "text-slate-700", bg: "bg-slate-50", min: 50 },
  bronze: { label: "Bronze Booth 🥉", color: "bg-orange-400", textColor: "text-orange-700", bg: "bg-orange-50", min: 0 },
};

function getTier(score) {
  if (score >= 90) return TIER_CONFIG.launch_ready;
  if (score >= 75) return TIER_CONFIG.gold;
  if (score >= 50) return TIER_CONFIG.silver;
  return TIER_CONFIG.bronze;
}

function ReadinessGauge({ score }) {
  const tier = getTier(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 75 ? "#f59e0b" : score >= 50 ? "#94a3b8" : "#f97316";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{score}%</span>
          <span className="text-xs text-muted-foreground">ready</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-semibold ${tier.textColor}`}>{tier.label}</span>
    </div>
  );
}

function CheckItem({ icon: Icon, label, passed, count, total, onDrill }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 100;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${passed ? "bg-green-100" : "bg-red-100"}`}>
        {passed ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-xs font-semibold ${passed ? "text-green-600" : "text-red-500"}`}>{count}/{total}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1 mt-1">
          <div
            className={`rounded-full h-1 transition-all ${passed ? "bg-green-500" : "bg-red-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {!passed && (
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 shrink-0" onClick={onDrill}>
          Fix
        </Button>
      )}
    </div>
  );
}

function DrillDownPanel({ title, items, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportGenericCSV(items, `${title}.csv`)}>
              <Download className="w-3 h-3 mr-1" /> Export
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All clear! ✓</p>
          ) : items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.company_name || item.name || item.id}</p>
                <p className="text-xs text-muted-foreground">Booth {item.booth_number || "—"} · {item.event_name || "—"}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">Incomplete</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EventReadinessCenter() {
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [drillDown, setDrillDown] = useState(null); // { title, items }
  const [expandWarnings, setExpandWarnings] = useState(false);

  const { data: exhibitors = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["erc-exhibitors"], queryFn: () => base44.entities.ExhibitorProfile.list(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["erc-products"], queryFn: () => base44.entities.Product.list(),
  });
  const { data: catalogs = [] } = useQuery({
    queryKey: ["erc-catalogs"], queryFn: () => base44.entities.CatalogItem.list(),
  });
  const { data: nfcProfiles = [] } = useQuery({
    queryKey: ["erc-nfc"], queryFn: () => base44.entities.NFCProfile.list(),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["erc-events"], queryFn: () => base44.entities.Event.list(),
  });

  const eventNames = [...new Set(exhibitors.map(e => e.event_name).filter(Boolean))].sort();

  const filteredExhibitors = selectedEvent === "all"
    ? exhibitors
    : exhibitors.filter(e => e.event_name === selectedEvent);

  const total = filteredExhibitors.length;

  // Readiness checks
  const checks = useMemo(() => {
    if (total === 0) return [];
    const withLogo = filteredExhibitors.filter(e => e.logo_url);
    const withDesc = filteredExhibitors.filter(e => e.description && e.description.length > 10);
    const withBooth = filteredExhibitors.filter(e => e.booth_number);
    const withWebsite = filteredExhibitors.filter(e => e.website);

    const exIds = filteredExhibitors.map(e => e.user_id).filter(Boolean);
    const withProducts = exIds.filter(uid => products.some(p => p.exhibitor_user_id === uid || p.user_id === uid));
    const withCatalogs = exIds.filter(uid => catalogs.some(c => c.user_id === uid));
    const withNFC = exIds.filter(uid => nfcProfiles.some(n => n.user_id === uid && n.active));

    return [
      {
        label: "Logo Uploaded", count: withLogo.length, total,
        missing: filteredExhibitors.filter(e => !e.logo_url),
      },
      {
        label: "Company Description", count: withDesc.length, total,
        missing: filteredExhibitors.filter(e => !e.description || e.description.length <= 10),
      },
      {
        label: "Booth Number Assigned", count: withBooth.length, total,
        missing: filteredExhibitors.filter(e => !e.booth_number),
      },
      {
        label: "Website Listed", count: withWebsite.length, total,
        missing: filteredExhibitors.filter(e => !e.website),
      },
      {
        label: "Products Uploaded", count: withProducts.length, total,
        missing: filteredExhibitors.filter(e => !withProducts.includes(e.user_id)),
      },
      {
        label: "Catalog / Brochure", count: withCatalogs.length, total,
        missing: filteredExhibitors.filter(e => !withCatalogs.includes(e.user_id)),
      },
      {
        label: "NFC Badge Activated", count: withNFC.length, total,
        missing: filteredExhibitors.filter(e => !withNFC.includes(e.user_id)),
      },
    ];
  }, [filteredExhibitors, products, catalogs, nfcProfiles, total]);

  const score = useMemo(() => {
    if (checks.length === 0) return 0;
    const weights = [15, 10, 20, 5, 25, 15, 10]; // must sum to 100
    return Math.round(
      checks.reduce((sum, c, i) => sum + (c.count / Math.max(c.total, 1)) * (weights[i] || 10), 0)
    );
  }, [checks]);

  const warnings = checks.filter(c => c.count < c.total);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {drillDown && (
        <DrillDownPanel
          title={drillDown.title}
          items={drillDown.items}
          onClose={() => setDrillDown(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-primary" /> Event Readiness Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pre-launch exhibitor readiness dashboard</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-52"><SelectValue placeholder="All Events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventNames.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold">No exhibitors found</p>
            <p className="text-sm text-muted-foreground mt-1">Select an event or wait for exhibitors to register.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Score gauge */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <ReadinessGauge score={score} />
              <div className="w-full space-y-1 text-center">
                <p className="text-sm font-medium">{total} Exhibitors</p>
                <p className="text-xs text-muted-foreground">{selectedEvent === "all" ? "All Events" : selectedEvent}</p>
              </div>
              {/* Tier legend */}
              <div className="w-full space-y-1.5 pt-2 border-t">
                {Object.values(TIER_CONFIG).reverse().map(tier => (
                  <div key={tier.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${tier.bg}`}>
                    <div className={`w-2 h-2 rounded-full ${tier.color}`} />
                    <span className={`text-xs font-medium ${tier.textColor}`}>{tier.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">≥ {tier.min}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Readiness Checklist
                <span className="text-xs font-normal text-muted-foreground">{checks.filter(c => c.count === c.total).length}/{checks.length} complete</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checks.map(c => (
                <CheckItem
                  key={c.label}
                  label={c.label}
                  count={c.count}
                  total={c.total}
                  passed={c.count === c.total}
                  onDrill={() => setDrillDown({ title: `Missing: ${c.label}`, items: c.missing })}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warning Summary */}
      {warnings.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setExpandWarnings(v => !v)}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-amber-800">{warnings.length} area{warnings.length > 1 ? "s" : ""} need attention</span>
              </div>
              {expandWarnings ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
            </button>
            {expandWarnings && (
              <div className="mt-3 space-y-2">
                {warnings.map(w => (
                  <div key={w.label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <span className="text-sm text-amber-900">{w.label}: {w.total - w.count} exhibitor{w.total - w.count > 1 ? "s" : ""} missing</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => setDrillDown({ title: `Missing: ${w.label}`, items: w.missing })}>
                      View List
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {[
          { label: "Total Exhibitors", value: total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Launch Ready", value: checks.length > 0 ? Math.round(total * (score / 100)) : 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Need Attention", value: warnings.reduce((s, w) => s + (w.total - w.count), 0), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Events Monitored", value: selectedEvent === "all" ? events.length : 1, icon: Star, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(s => (
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
    </div>
  );
}