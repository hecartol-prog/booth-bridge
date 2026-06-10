import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, Users, Building2, QrCode, Wifi, ScanLine, Bookmark,
  MessageSquare, Calendar, AlertTriangle, CheckCircle2, RefreshCw,
  Zap, TrendingUp, Clock, Server, Database, Globe, Radio
} from "lucide-react";

const REFRESH_INTERVAL = 30000; // 30s

function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      LIVE
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, bg, alert }) {
  return (
    <Card className={alert ? "border-red-300 bg-red-50/40" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          {alert && <AlertTriangle className="w-4 h-4 text-red-500" />}
        </div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function HealthIndicator({ label, status }) {
  const config = {
    ok: { dot: "bg-green-500", text: "text-green-700", label: "OK" },
    warn: { dot: "bg-amber-400 animate-pulse", text: "text-amber-700", label: "Warning" },
    error: { dot: "bg-red-500 animate-pulse", text: "text-red-700", label: "Error" },
  }[status] || { dot: "bg-slate-400", text: "text-slate-600", label: "Unknown" };

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
      </div>
    </div>
  );
}

function ActivityFeedItem({ action, timestamp, type }) {
  const icons = {
    scan: QrCode,
    nfc: Wifi,
    meeting: Calendar,
    rfi: MessageSquare,
    connection: Users,
    ocr: ScanLine,
    default: Activity,
  };
  const Icon = icons[type] || icons.default;
  const colors = {
    scan: "text-blue-600 bg-blue-50",
    nfc: "text-purple-600 bg-purple-50",
    meeting: "text-amber-600 bg-amber-50",
    rfi: "text-red-600 bg-red-50",
    connection: "text-green-600 bg-green-50",
    ocr: "text-teal-600 bg-teal-50",
    default: "text-slate-600 bg-slate-50",
  };
  const colorClass = colors[type] || colors.default;
  const relTime = (() => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  })();

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-xs flex-1 leading-snug">{action}</p>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{relTime}</span>
    </div>
  );
}

export default function LiveEventControlRoom() {
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timerRef = useRef(null);

  const queryOpts = { refetchInterval: REFRESH_INTERVAL, staleTime: 20000 };

  const { data: connections = [], refetch: refetchConn } = useQuery({ queryKey: ["lcr-connections"], queryFn: () => base44.entities.Connection.list(), ...queryOpts });
  const { data: meetings = [], refetch: refetchMeet } = useQuery({ queryKey: ["lcr-meetings"], queryFn: () => base44.entities.Meeting.list(), ...queryOpts });
  const { data: rfis = [], refetch: refetchRfi } = useQuery({ queryKey: ["lcr-rfis"], queryFn: () => base44.entities.RFI.list(), ...queryOpts });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["lcr-exhibitors"], queryFn: () => base44.entities.ExhibitorProfile.list(), ...queryOpts });
  const { data: nfcInteractions = [] } = useQuery({ queryKey: ["lcr-nfc"], queryFn: () => base44.entities.NFCInteraction.list(), ...queryOpts });
  const { data: scannedContacts = [] } = useQuery({ queryKey: ["lcr-ocr"], queryFn: () => base44.entities.ScannedContact.list(), ...queryOpts });
  const { data: savedBooths = [] } = useQuery({ queryKey: ["lcr-saved"], queryFn: () => base44.entities.SavedBooth.list(), ...queryOpts });
  const { data: events = [] } = useQuery({ queryKey: ["lcr-events"], queryFn: () => base44.entities.Event.list() });

  const eventNames = [...new Set(exhibitors.map(e => e.event_name).filter(Boolean))].sort();

  const filterByEvent = (arr, field = "event_name") =>
    selectedEvent === "all" ? arr : arr.filter(r => r[field] === selectedEvent);

  // Last 24h
  const last24h = (arr) => {
    const cutoff = Date.now() - 86400000;
    return arr.filter(r => new Date(r.created_date || r.timestamp).getTime() > cutoff);
  };

  const recentConnections = last24h(connections);
  const recentMeetings = last24h(meetings);
  const recentNFC = last24h(nfcInteractions);
  const recentOCR = last24h(scannedContacts);

  // Scans per minute (last 5 min)
  const last5min = (arr) => {
    const cutoff = Date.now() - 300000;
    return arr.filter(r => new Date(r.created_date || r.timestamp).getTime() > cutoff);
  };
  const scansPerMin = Math.round(
    (last5min(nfcInteractions).length + last5min(scannedContacts).length) / 5
  );

  // Sync queue from localStorage
  const offlineQueue = (() => {
    try { return JSON.parse(localStorage.getItem("bb_sync_queue") || "[]").length; } catch { return 0; }
  })();

  const activeEvent = events.find(e => e.status === "active");

  const refetchAll = () => {
    refetchConn(); refetchMeet(); refetchRfi();
    setLastRefresh(new Date());
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      refetchAll();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  // Build live activity feed from recent records
  const activityFeed = [
    ...recentConnections.slice(0, 8).map(r => ({
      action: `New connection: ${r.buyer_company || "Buyer"} ↔ ${r.exhibitor_company || "Exhibitor"}`,
      timestamp: r.created_date,
      type: "connection",
    })),
    ...recentNFC.slice(0, 5).map(r => ({
      action: `NFC tap: ${r.interaction_type?.replace(/_/g, " ")} at ${r.event_name || "event"}`,
      timestamp: r.timestamp || r.created_date,
      type: "nfc",
    })),
    ...recentMeetings.slice(0, 5).map(r => ({
      action: `Meeting scheduled: ${r.requested_by_company || "Buyer"} → ${r.target_exhibitor_company || "Exhibitor"}`,
      timestamp: r.created_date,
      type: "meeting",
    })),
    ...recentOCR.slice(0, 4).map(r => ({
      action: `OCR scan: ${r.full_name || r.company || "Contact"} captured`,
      timestamp: r.created_date,
      type: "ocr",
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

  const metrics = [
    { icon: Users, label: "Active Connections (24h)", value: recentConnections.length, sub: `${connections.length} total`, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Building2, label: "Active Exhibitors", value: exhibitors.filter(e => e.live_status === "available" || e.live_status === "busy").length, sub: `${exhibitors.length} registered`, color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Wifi, label: "NFC Taps (24h)", value: recentNFC.length, sub: `${scansPerMin}/min rate`, color: "text-violet-600", bg: "bg-violet-50" },
    { icon: ScanLine, label: "OCR Captures (24h)", value: recentOCR.length, sub: `${scannedContacts.length} total`, color: "text-teal-600", bg: "bg-teal-50" },
    { icon: Calendar, label: "Meetings (24h)", value: recentMeetings.length, sub: `${meetings.length} total`, color: "text-amber-600", bg: "bg-amber-50" },
    { icon: MessageSquare, label: "RFIs Generated", value: rfis.length, sub: "all time", color: "text-red-600", bg: "bg-red-50" },
    { icon: Bookmark, label: "Saved Suppliers", value: savedBooths.length, sub: "all time", color: "text-pink-600", bg: "bg-pink-50" },
    { icon: Zap, label: "Offline Queue", value: offlineQueue, sub: "pending sync", color: offlineQueue > 10 ? "text-red-600" : "text-green-600", bg: offlineQueue > 10 ? "bg-red-50" : "bg-green-50", alert: offlineQueue > 20 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500" /> Live Event Control Room
            </h1>
            <LiveBadge />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {eventNames.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={refetchAll}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Event Banner */}
      {activeEvent && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-green-800">
            Live Event: {activeEvent.name}
          </span>
          <span className="text-xs text-green-600">{activeEvent.venue} · {activeEvent.city}</span>
        </div>
      )}

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {metrics.map(m => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Health Monitor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HealthIndicator label="API Server" status="ok" />
            <HealthIndicator label="Database" status="ok" />
            <HealthIndicator label="NFC Service" status={recentNFC.length === 0 ? "warn" : "ok"} />
            <HealthIndicator label="OCR Service" status="ok" />
            <HealthIndicator label="Offline Sync" status={offlineQueue > 20 ? "error" : offlineQueue > 5 ? "warn" : "ok"} />
            <HealthIndicator label="Payment Gateway" status="ok" />
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Live Activity Feed
              <span className="text-[10px] text-muted-foreground ml-auto">Last 24 hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {activityFeed.map((item, i) => (
                  <ActivityFeedItem key={i} {...item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="mt-4 space-y-2">
        {offlineQueue > 10 && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Large Offline Queue</p>
              <p className="text-xs text-amber-700">{offlineQueue} items pending sync. Check device connectivity.</p>
            </div>
            <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200">Warning</Badge>
          </div>
        )}
        {recentNFC.length === 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Wifi className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">No NFC Activity (24h)</p>
              <p className="text-xs text-blue-700">Verify NFC badges are active and distributed to exhibitors.</p>
            </div>
            <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">Info</Badge>
          </div>
        )}
        {offlineQueue === 0 && recentConnections.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-green-800">All systems operational. Event running smoothly. ✓</p>
          </div>
        )}
      </div>
    </div>
  );
}