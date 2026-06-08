import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2, XCircle, RefreshCw, Plug, PlugZap, AlertCircle,
  BarChart2, Calendar, Users, Zap, Clock, ArrowUpRight
} from "lucide-react";

const PROVIDERS = [
  {
    key: "calendly",
    name: "Calendly",
    description: "Smart meeting scheduling. BoothBridge owns all meeting data.",
    icon: "📅",
    category: "Scheduling",
    features: ["Meeting Requests", "Auto-scheduling", "Calendar Sync"],
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Sync meetings to Google Calendar. BoothBridge remains source of truth.",
    icon: "📆",
    category: "Calendar",
    features: ["Meeting Sync", "Reminders", "Participant Invites"],
    color: "bg-green-50 border-green-200",
  },
  {
    key: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Enterprise calendar sync for Outlook and Microsoft 365 users.",
    icon: "📧",
    category: "Calendar",
    features: ["Meeting Sync", "Availability Sync", "Enterprise Support"],
    color: "bg-sky-50 border-sky-200",
  },
  {
    key: "salesforce",
    name: "Salesforce",
    description: "Push qualified leads with full intelligence. BoothBridge scores first.",
    icon: "☁️",
    category: "CRM",
    features: ["Lead Push", "Contact Sync", "Opportunity Pull", "Activity Timeline"],
    color: "bg-indigo-50 border-indigo-200",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    description: "Sync leads, contacts and trigger marketing workflows from BoothBridge data.",
    icon: "🔶",
    category: "CRM",
    features: ["Contact Sync", "Deal Sync", "Marketing Automation", "Activity Push"],
    color: "bg-orange-50 border-orange-200",
  },
  {
    key: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Coming soon — virtual meeting rooms and team notifications.",
    icon: "💬",
    category: "Communication",
    features: ["Virtual Meetings", "Team Alerts"],
    color: "bg-purple-50 border-purple-200",
    coming_soon: true,
  },
  {
    key: "zoom",
    name: "Zoom",
    description: "Coming soon — virtual booth meetings and webinars.",
    icon: "📹",
    category: "Communication",
    features: ["Virtual Meetings", "Webinars"],
    color: "bg-blue-50 border-blue-200",
    coming_soon: true,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    description: "Coming soon — profile enrichment and lead sourcing.",
    icon: "💼",
    category: "Social",
    features: ["Profile Enrichment", "Lead Sourcing"],
    color: "bg-blue-50 border-blue-200",
    coming_soon: true,
  },
];

const statusColor = (status) => ({
  connected: "bg-green-100 text-green-700",
  disconnected: "bg-slate-100 text-slate-600",
  error: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
}[status] || "bg-slate-100 text-slate-600");

const statusIcon = (status) => ({
  connected: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  disconnected: <XCircle className="w-4 h-4 text-slate-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  pending: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />,
}[status] || <XCircle className="w-4 h-4 text-slate-400" />);

export default function IntegrationHub() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(null);

  const { data: connections = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => base44.entities.IntegrationConnection.list("-created_date", 100),
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => base44.entities.IntegrationSyncLog.list("-created_date", 50),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities-hub"],
    queryFn: () => base44.entities.Activity.list("-created_date", 200),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) =>
      base44.entities.IntegrationConnection.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.IntegrationConnection.update(id, { status: "disconnected", is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const getConnection = (providerKey) =>
    connections.find((c) => c.provider === providerKey);

  // Stats
  const totalConnected = connections.filter((c) => c.status === "connected").length;
  const totalSynced = connections.reduce((acc, c) => acc + (c.records_synced || 0), 0);
  const totalFailed = connections.reduce((acc, c) => acc + (c.failed_syncs || 0), 0);
  const recentLogs = syncLogs.slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <PlugZap className="w-6 h-6 text-primary" />
            Integration Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            BoothBridge remains the system of record. External platforms are execution endpoints only.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Connected", value: totalConnected, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, color: "text-green-600" },
          { label: "Records Synced", value: totalSynced.toLocaleString(), icon: <RefreshCw className="w-5 h-5 text-primary" />, color: "text-primary" },
          { label: "Sync Failures", value: totalFailed, icon: <AlertCircle className="w-5 h-5 text-red-500" />, color: "text-red-500" },
          { label: "Activity Events", value: activities.length, icon: <Zap className="w-5 h-5 text-amber-500" />, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-3">
              {s.icon}
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Integration Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Integrations</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.map((provider) => {
            const conn = getConnection(provider.key);
            const isConnected = conn?.status === "connected";

            return (
              <Card key={provider.key} className={`border ${provider.color} relative`}>
                {provider.coming_soon && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">{provider.category}</Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs leading-relaxed mt-2">
                    {provider.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {provider.features.map((f) => (
                      <span key={f} className="text-xs bg-white/70 border rounded px-2 py-0.5 text-muted-foreground">
                        {f}
                      </span>
                    ))}
                  </div>

                  {conn && (
                    <div className="bg-white/60 rounded-lg p-3 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        {statusIcon(conn.status)}
                        <span className={`font-medium ${statusColor(conn.status)} px-2 py-0.5 rounded-full`}>
                          {conn.status}
                        </span>
                        {conn.account_identifier && (
                          <span className="text-muted-foreground truncate">{conn.account_identifier}</span>
                        )}
                      </div>
                      {conn.last_sync && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Last sync: {new Date(conn.last_sync).toLocaleString()}
                        </div>
                      )}
                      <div className="flex gap-4 text-muted-foreground">
                        <span>✓ {conn.records_synced || 0} synced</span>
                        {conn.failed_syncs > 0 && (
                          <span className="text-red-500">✗ {conn.failed_syncs} failed</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!provider.coming_soon && (
                      <>
                        {isConnected ? (
                          <>
                            <Switch
                              checked={conn.is_active !== false}
                              onCheckedChange={(val) => toggleMutation.mutate({ id: conn.id, is_active: val })}
                            />
                            <span className="text-xs text-muted-foreground flex-1">
                              {conn.is_active !== false ? "Active" : "Paused"}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                              onClick={() => disconnectMutation.mutate(conn.id)}
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={connecting === provider.key}
                            onClick={() => {
                              // Opens integration settings — placeholder for OAuth flow
                              setConnecting(provider.key);
                              setTimeout(() => setConnecting(null), 1500);
                            }}
                          >
                            <Plug className="w-3 h-3 mr-1" />
                            {connecting === provider.key ? "Connecting..." : "Connect"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Sync Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Recent Sync Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sync activity yet</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                    {log.status === "success"
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : log.status === "failed"
                      ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      : <RefreshCw className="w-4 h-4 text-yellow-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.provider} — {log.sync_type?.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.records_succeeded}/{log.records_attempted} records
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_date).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" /> Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 10).map((act) => (
                  <div key={act.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                    <span className="text-lg shrink-0">
                      {act.points > 20 ? "🔥" : act.points > 10 ? "⚡" : "📍"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate capitalize">
                        {act.activity_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {act.event_name || act.company_name || "—"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">+{act.points}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}