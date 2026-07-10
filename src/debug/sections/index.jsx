/**
 * RC10.5 — Debug console section panels.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/authClient";
import { getSupabaseClient } from "@/api/supabaseClient";
import { isAiEnabled } from "@/config/backend";
import * as aiClient from "@/api/aiClient";
import { queryClientInstance } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DebugRow } from "@/debug/components/DebugRow";
import { StatusBadge } from "@/debug/components/StatusBadge";
import { useDebugStore } from "@/debug/hooks/useDebugStore";
import { usePerformanceMetrics } from "@/debug/hooks/usePerformanceMetrics";
import { getEnvironmentLabel, getDebugAccess, isLocalDebugModeEnabled, isDebugConsoleEmergencyLocked } from "@/debug/debugGate";
import { decodeJwtPayload, maskSecret } from "@/debug/debugMask";
import {
  clearDebugErrors,
  getOcrStageLabels,
  patchDatabaseState,
  patchOcrStage,
  patchStorageState,
  patchSupabaseState,
  resetOcrPipeline,
  setLoginTimestamp,
} from "@/debug/debugStore";
import { downloadDebugReport } from "@/debug/exportReport";
import { installPlaywrightHooks } from "@/debug/playwrightHooks";
import { captureRuntimeError } from "@/monitoring/sentryErrors";
import { isSentryEnabled } from "@/monitoring/sentryConfig";

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  return "Unknown";
}

function getOsInfo() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}

function formatBytes(bytes) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function formatMs(ms) {
  if (ms == null) return "—";
  return `${Math.round(ms)} ms`;
}

export function AdminAccessSection({ access: accessProp }) {
  const { user, isAuthenticated } = useAuth();
  const buildInfo = typeof __BB_BUILD_INFO__ !== "undefined" ? __BB_BUILD_INFO__ : {};
  const access = accessProp || getDebugAccess(user, isAuthenticated);

  return (
    <div className="space-y-1">
      <DebugRow label="Authenticated admin" value={isAuthenticated && user ? user.email : "No"} />
      <DebugRow label="Role" value={user?.role || "—"} />
      <DebugRow label="Permissions" value={access.permissions.join(", ") || "—"} />
      <DebugRow label="Access reason" value={access.reason} mono />
      <DebugRow label="Environment" value={getEnvironmentLabel()} />
      <DebugRow label="Debug mode" value={isLocalDebugModeEnabled() ? "Enabled (local)" : "Disabled"} />
      <DebugRow label="Emergency lock" value={isDebugConsoleEmergencyLocked() ? "ACTIVE" : "Off"} />
      <DebugRow label="Current build" value={buildInfo.version || "0.0.0"} mono />
      <DebugRow label="Git commit" value={buildInfo.commit || "unknown"} mono />
    </div>
  );
}

export function AppInfoSection() {
  const location = useLocation();
  const buildInfo = typeof __BB_BUILD_INFO__ !== "undefined" ? __BB_BUILD_INFO__ : {};

  return (
    <div className="space-y-1">
      <DebugRow label="Version" value={buildInfo.version || "0.0.0"} mono />
      <DebugRow label="Git commit" value={buildInfo.commit || "unknown"} mono />
      <DebugRow label="Build time" value={buildInfo.timestamp || "—"} mono />
      <DebugRow label="Environment" value={getEnvironmentLabel()} />
      <DebugRow label="URL" value={window.location.href} mono />
      <DebugRow label="Browser" value={getBrowserInfo()} />
      <DebugRow label="OS" value={getOsInfo()} />
      <DebugRow label="Viewport" value={`${window.innerWidth}×${window.innerHeight}`} />
      <DebugRow label="Language" value={navigator.language} />
      <DebugRow label="Online" value={navigator.onLine ? "Online" : "Offline"} />
      <DebugRow label="Route" value={location.pathname} mono />
    </div>
  );
}

export function AuthSection() {
  const { user, isAuthenticated, logout } = useAuth();
  const [session, setSession] = useState(null);
  const [jwtInfo, setJwtInfo] = useState(null);
  const [countdown, setCountdown] = useState("—");
  const store = useDebugStore();

  const refreshSession = useCallback(async () => {
    const s = await auth.currentSession();
    setSession(s);
    const token = s?.access_token;
    if (token) {
      const payload = decodeJwtPayload(token);
      setJwtInfo(payload);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession, user]);

  useEffect(() => {
    const exp = jwtInfo?.exp;
    if (!exp) return undefined;
    const tick = () => {
      const remaining = exp * 1000 - Date.now();
      if (remaining <= 0) setCountdown("Expired");
      else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [jwtInfo]);

  const sessionExp = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString()
    : "—";

  return (
    <div className="space-y-2">
      <DebugRow label="Authenticated" value={isAuthenticated ? "Yes" : "No"} />
      <DebugRow label="User ID" value={user?.id} mono />
      <DebugRow label="Email" value={user?.email} />
      <DebugRow label="Role" value={user?.role || "—"} />
      <DebugRow label="User role" value={user?.user_role || "—"} />
      <DebugRow label="Session expiration" value={sessionExp} />
      <DebugRow label="JWT countdown" value={countdown} />
      <DebugRow label="JWT issuer" value={jwtInfo?.iss || "—"} mono />
      <DebugRow label="JWT audience" value={jwtInfo?.aud || "—"} mono />
      <DebugRow label="Provider" value={session?.user?.app_metadata?.provider || "email"} />
      <DebugRow
        label="Email verified"
        value={session?.user?.email_confirmed_at ? "Yes" : "No"}
      />
      <DebugRow
        label="Access token"
        value={session?.access_token ? maskSecret(session.access_token) : "—"}
        mono
      />
      <DebugRow
        label="Refresh token"
        value={session?.refresh_token ? maskSecret(session.refresh_token) : "—"}
        mono
      />
      <DebugRow label="Login timestamp" value={store.loginTimestamp || "—"} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          onClick={() => logout(true)}
        >
          Logout
        </Button>
        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={refreshSession}>
          Refresh session
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          onClick={async () => {
            await refreshSession();
            const token = (await auth.currentSession())?.access_token;
            const payload = decodeJwtPayload(token || "");
            alert(payload ? `JWT valid structure. Exp: ${payload.exp}` : "No JWT");
          }}
        >
          Validate JWT
        </Button>
      </div>
    </div>
  );
}

export function SupabaseSection() {
  const store = useDebugStore();

  const runHealthCheck = async () => {
    const started = Date.now();
    patchSupabaseState({ connectionStatus: "checking" });
    try {
      const supabase = getSupabaseClient();
      const { error: dbError } = await supabase.from("user").select("id").limit(1);
      const latency = Date.now() - started;

      let storageOk = false;
      try {
        const { error: stError } = await supabase.storage.listBuckets();
        storageOk = !stError;
      } catch {
        storageOk = false;
      }

      let edgeOk = false;
      try {
        await aiClient.health();
        edgeOk = true;
      } catch {
        edgeOk = false;
      }

      const channels = supabase.getChannels?.() || [];
      patchSupabaseState({
        connectionStatus: dbError ? "error" : "connected",
        latencyMs: latency,
        databaseReachable: !dbError,
        storageReachable: storageOk,
        edgeFunctionsReachable: edgeOk,
        realtimeConnected: channels.some((c) => c.state === "joined"),
        channelCount: channels.length,
        lastHealthCheck: new Date().toISOString(),
      });
    } catch {
      patchSupabaseState({ connectionStatus: "error", latencyMs: Date.now() - started });
    }
  };

  return (
    <div className="space-y-2">
      <DebugRow label="Supabase URL" value={store.supabase.url} mono />
      <DebugRow label="Connection" value={store.supabase.connectionStatus} />
      <DebugRow label="Latency" value={formatMs(store.supabase.latencyMs)} />
      <DebugRow
        label="Realtime connected"
        value={store.supabase.realtimeConnected ? "Yes" : "No"}
      />
      <DebugRow label="Channel count" value={store.supabase.channelCount} />
      <DebugRow
        label="Storage reachable"
        value={store.supabase.storageReachable == null ? "—" : store.supabase.storageReachable ? "Yes" : "No"}
      />
      <DebugRow
        label="Database reachable"
        value={store.supabase.databaseReachable == null ? "—" : store.supabase.databaseReachable ? "Yes" : "No"}
      />
      <DebugRow
        label="Edge Functions"
        value={store.supabase.edgeFunctionsReachable == null ? "—" : store.supabase.edgeFunctionsReachable ? "Yes" : "No"}
      />
      <DebugRow label="Last health check" value={store.supabase.lastHealthCheck || "—"} />
      <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs" onClick={runHealthCheck}>
        Run health check
      </Button>
    </div>
  );
}

export function AiSection() {
  const store = useDebugStore();

  const runAiHealth = async () => {
    try {
      await aiClient.health();
      patchSupabaseState({ edgeFunctionsReachable: true });
    } catch (e) {
      patchSupabaseState({ edgeFunctionsReachable: false });
    }
  };

  return (
    <div className="space-y-2">
      <DebugRow label="AI enabled" value={isAiEnabled() ? "Yes" : "No"} />
      <DebugRow label="Provider" value={store.ai.provider} />
      <DebugRow label="Gateway" value="OpenRouter (via Edge)" />
      <DebugRow label="Model" value={store.ai.model || "—"} mono />
      <DebugRow label="Vision model" value={store.ai.visionModel} mono />
      <DebugRow label="Text model" value={store.ai.textModel} mono />
      <DebugRow label="Last latency" value={formatMs(store.ai.lastLatency)} />
      <DebugRow label="Avg latency" value={formatMs(store.ai.avgLatency)} />
      <DebugRow
        label="Token usage"
        value={store.ai.tokenUsage ? JSON.stringify(store.ai.tokenUsage) : "—"}
        mono
      />
      <DebugRow label="Est. cost" value={store.ai.estimatedCost ?? "—"} />
      <DebugRow label="Last error" value={store.ai.lastError || "—"} />
      <DebugRow label="Last request" value={store.ai.lastRequest || "—"} />
      <DebugRow label="Last response" value={store.ai.lastResponseCode || "—"} />
      <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs" onClick={runAiHealth}>
        AI health check
      </Button>
    </div>
  );
}

export function OcrSection() {
  const store = useDebugStore();
  const labels = getOcrStageLabels();
  const stageOrder = Object.keys(labels);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            resetOcrPipeline();
            patchOcrStage("image_selected", { status: "PASS", meta: { manual: true } });
          }}
        >
          Mark image selected
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetOcrPipeline}>
          Reset pipeline
        </Button>
      </div>
      {stageOrder.map((key, i) => {
        const stage = store.ocrStages[key];
        return (
          <div key={key}>
            {i > 0 && <div className="mb-2 text-center text-slate-600">↓</div>}
            <div className="rounded border border-slate-700/60 bg-slate-900/50 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{labels[key]}</span>
                <StatusBadge status={stage.status} />
              </div>
              <DebugRow label="Duration" value={formatMs(stage.durationMs)} />
              {stage.error && <DebugRow label="Error" value={stage.error} />}
            </div>
          </div>
        );
      })}
      <div className="border-t border-slate-700 pt-2">
        <DebugRow label="Image before" value={formatBytes(store.ocrRunMeta.imageSizeBefore)} />
        <DebugRow label="Image after" value={formatBytes(store.ocrRunMeta.imageSizeAfter)} />
        <DebugRow
          label="Compression ratio"
          value={
            store.ocrRunMeta.compressionRatio != null
              ? `${(store.ocrRunMeta.compressionRatio * 100).toFixed(1)}%`
              : "—"
          }
        />
        <DebugRow label="Vision latency" value={formatMs(store.ocrRunMeta.visionLatency)} />
        <DebugRow
          label="Normalization latency"
          value={formatMs(store.ocrRunMeta.normalizationLatency)}
        />
      </div>
    </div>
  );
}

export function ApiSection() {
  const store = useDebugStore();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "errors") return store.apiRequests.filter((r) => r.error || r.status >= 400);
    if (filter === "all") return store.apiRequests;
    return store.apiRequests.filter((r) => r.category === filter);
  }, [store.apiRequests, filter]);

  const filters = [
    { id: "all", label: "All" },
    { id: "errors", label: "Errors" },
    { id: "ai", label: "AI" },
    { id: "supabase", label: "Supabase" },
    { id: "storage", label: "Storage" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded px-2 py-0.5 text-[10px] ${
              filter === f.id
                ? "bg-violet-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ScrollArea className="h-48">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500">No requests logged yet.</p>
        ) : (
          filtered.map((req, i) => (
            <div
              key={`${req.timestamp}-${i}`}
              className="mb-2 rounded border border-slate-800 p-2 text-[10px] font-mono"
            >
              <div className="flex justify-between text-slate-400">
                <span>
                  {req.method} {req.status || "—"}
                </span>
                <span>{formatMs(req.duration)}</span>
              </div>
              <div className="truncate text-slate-300">{req.url}</div>
              {req.responseSize > 0 && (
                <div className="text-slate-500">{formatBytes(req.responseSize)}</div>
              )}
              {req.error && <div className="text-red-400">{req.error}</div>}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

export function StorageSection() {
  const store = useDebugStore();

  const testUpload = async () => {
    patchStorageState({ uploadStatus: "uploading" });
    const started = Date.now();
    try {
      const supabase = getSupabaseClient();
      const blob = new Blob(["bb-debug-test"], { type: "text/plain" });
      const path = `debug/test-${Date.now()}.txt`;
      const { error } = await supabase.storage
        .from(store.storage.bucket)
        .upload(path, blob, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from(store.storage.bucket)
        .createSignedUrl(path, 3600);
      patchStorageState({
        uploadStatus: "success",
        lastUpload: path,
        signedUrl: signed?.signedUrl || null,
        uploadLatency: Date.now() - started,
        lastUploadError: null,
      });
    } catch (e) {
      patchStorageState({
        uploadStatus: "failed",
        uploadLatency: Date.now() - started,
        lastUploadError: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="space-y-2">
      <DebugRow label="Bucket" value={store.storage.bucket} mono />
      <DebugRow label="Upload status" value={store.storage.uploadStatus} />
      <DebugRow label="Last upload" value={store.storage.lastUpload || "—"} mono />
      <DebugRow
        label="Signed URL"
        value={store.storage.signedUrl ? maskSecret(store.storage.signedUrl, 8) : "—"}
        mono
      />
      <DebugRow label="Public URL" value={store.storage.publicUrl || "—"} mono />
      <DebugRow label="Upload latency" value={formatMs(store.storage.uploadLatency)} />
      <DebugRow label="Last error" value={store.storage.lastUploadError || "—"} />
      <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs" onClick={testUpload}>
        Test upload
      </Button>
    </div>
  );
}

export function DatabaseSection() {
  const store = useDebugStore();

  useEffect(() => {
    const cache = queryClientInstance.getQueryCache();
    const queries = cache.getAll();
    const pending = queries.filter((q) => q.state.fetchStatus === "fetching").length;
    const failed = queries.filter((q) => q.state.status === "error").length;

    patchDatabaseState({
      profileLoaded: queries.some(
        (q) => String(q.queryKey[0]).includes("profile") && q.state.status === "success"
      ),
      companyLoaded: queries.some(
        (q) => String(q.queryKey[0]).includes("company") && q.state.status === "success"
      ),
      meetingsLoaded: queries.some(
        (q) => String(q.queryKey[0]).includes("meeting") && q.state.status === "success"
      ),
      notificationsLoaded: queries.some(
        (q) => String(q.queryKey[0]).includes("notification") && q.state.status === "success"
      ),
      pendingMutations: pending,
      failedMutations: failed,
    });
  });

  return (
    <div className="space-y-1">
      <DebugRow
        label="Profile loaded"
        value={store.database.profileLoaded ? "Yes" : "No"}
      />
      <DebugRow
        label="Company loaded"
        value={store.database.companyLoaded ? "Yes" : "No"}
      />
      <DebugRow
        label="Meetings loaded"
        value={store.database.meetingsLoaded ? "Yes" : "No"}
      />
      <DebugRow
        label="Notifications loaded"
        value={store.database.notificationsLoaded ? "Yes" : "No"}
      />
      <DebugRow label="Realtime subs" value={store.database.realtimeSubscriptions} />
      <DebugRow label="Pending mutations" value={store.database.pendingMutations} />
      <DebugRow label="Failed mutations" value={store.database.failedMutations} />
      <DebugRow label="Retry queue" value={store.database.retryQueue} />
    </div>
  );
}

export function PerformanceSection() {
  const store = useDebugStore();
  const perf = usePerformanceMetrics();
  const buildInfo = typeof __BB_BUILD_INFO__ !== "undefined" ? __BB_BUILD_INFO__ : {};

  return (
    <div className="space-y-1">
      <DebugRow label="FPS" value={perf.fps ?? "—"} />
      <DebugRow label="Memory" value={perf.memoryMb != null ? `${perf.memoryMb} MB` : "—"} />
      <DebugRow label="JS heap" value={perf.jsHeapMb != null ? `${perf.jsHeapMb} MB` : "—"} />
      <DebugRow label="CPU estimate" value={perf.cpuEstimate ?? "N/A"} />
      <DebugRow label="LCP" value={perf.lcp != null ? `${perf.lcp} ms` : "—"} />
      <DebugRow label="React renders" value={store.renderCount} />
      <DebugRow label="Slow components" value="—" />
      <DebugRow label="Bundle version" value={buildInfo.commit || "—"} mono />
    </div>
  );
}

export function ErrorsSection() {
  const store = useDebugStore();

  const copyError = (err) => {
    navigator.clipboard.writeText(JSON.stringify(err, null, 2));
  };

  const exportErrors = () => {
    const blob = new Blob([JSON.stringify(store.errors, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debug-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={clearDebugErrors}>
          Clear
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={exportErrors}>
          Export JSON
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            captureRuntimeError(new Error("RC10.6 manual Sentry test"), {
              subsystem: "UI",
              category: "manual_test",
            });
          }}
          disabled={!isSentryEnabled()}
        >
          Sentry test
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => {
            throw new Error("RC10.6 manual JS error");
          }}
        >
          Throw error
        </Button>
      </div>
      <ScrollArea className="h-52">
        {store.errors.length === 0 ? (
          <p className="text-xs text-slate-500">No errors captured.</p>
        ) : (
          store.errors.map((err, i) => (
            <div key={`${err.timestamp}-${i}`} className="mb-2 rounded border border-red-900/40 p-2">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{err.timestamp}</span>
                <span>{err.severity}</span>
              </div>
              <div className="text-xs text-red-300">{err.message}</div>
              <div className="text-[10px] text-slate-500">
                {err.page} · {err.component}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-6 text-[10px]"
                onClick={() => copyError(err)}
              >
                Copy
              </Button>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

export function FeatureFlagsSection() {
  return (
    <div className="space-y-1">
      <DebugRow label="VITE_AI_ENABLED" value={import.meta.env.VITE_AI_ENABLED ?? "(unset)"} />
      <DebugRow label="VITE_DEBUG_MODE" value={import.meta.env.VITE_DEBUG_MODE ?? "(unset)"} />
      <DebugRow label="VITE_DISABLE_DEBUG_CONSOLE" value={import.meta.env.VITE_DISABLE_DEBUG_CONSOLE ?? "(unset)"} />
      <DebugRow label="VITE_SENTRY_DSN" value={import.meta.env.VITE_SENTRY_DSN ? "configured" : "(unset)"} />
      <DebugRow label="VITE_SENTRY_ENVIRONMENT" value={import.meta.env.VITE_SENTRY_ENVIRONMENT ?? "(unset)"} />
      <DebugRow label="Sentry active" value={isSentryEnabled() ? "Yes" : "No"} />
      <DebugRow label="VITE_APP_URL" value={import.meta.env.VITE_APP_URL ?? "—"} mono />
      <DebugRow
        label="OCR vision model"
        value={import.meta.env.VITE_RC10_VISION_MODEL || "qwen/qwen-2.5-vl-72b-instruct"}
        mono
      />
      <DebugRow
        label="OCR normalize model"
        value={import.meta.env.VITE_RC10_NORMALIZE_MODEL || "qwen/qwen-2.5-72b-instruct"}
        mono
      />
      <DebugRow label="Backend" value="supabase" />
      <DebugRow label="Storage" value="supabase" />
    </div>
  );
}

export function LogsSection() {
  const store = useDebugStore();
  const [tagFilter, setTagFilter] = useState("all");

  const tags = ["all", "AUTH", "SUPABASE", "OCR", "AI", "UPLOAD", "STORAGE", "REALTIME", "PROFILE", "NOTIFICATIONS"];

  const filtered =
    tagFilter === "all" ? store.logs : store.logs.filter((l) => l.tag === tagFilter);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTagFilter(t)}
            className={`rounded px-1.5 py-0.5 text-[9px] ${
              tagFilter === t ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ScrollArea className="h-48">
        {filtered.slice(0, 50).map((log, i) => (
          <div key={`${log.timestamp}-${i}`} className="mb-1 font-mono text-[10px] text-slate-400">
            <span className="text-violet-400">[{log.tag}]</span> {log.severity} — {log.message}
            {log.duration != null && <span className="text-slate-600"> ({log.duration}ms)</span>}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

export function PlaywrightSection() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    installPlaywrightHooks();
  }, []);

  const hooks = [
    { key: "runHealthCheck", label: "Health check" },
    { key: "runOcrTest", label: "OCR test" },
    { key: "runAuthTest", label: "Auth test" },
    { key: "runStorageTest", label: "Storage test" },
    { key: "runAiTest", label: "AI test" },
    { key: "runRealtimeTest", label: "Realtime test" },
    { key: "runNotificationsTest", label: "Notifications test" },
  ];

  const runHook = async (key) => {
    const api = window.__BB_DEBUG__;
    if (!api?.[key]) return;
    setRunning(true);
    const result = await api[key]();
    setResults((prev) => [result, ...prev].slice(0, 10));
    setRunning(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {hooks.map((h) => (
          <Button
            key={h.key}
            size="sm"
            variant="outline"
            className="h-7 text-[10px]"
            disabled={running}
            onClick={() => runHook(h.key)}
          >
            {h.label}
          </Button>
        ))}
      </div>
      <ScrollArea className="h-36">
        {results.map((r, i) => (
          <div
            key={i}
            className={`mb-1 rounded p-1.5 text-[10px] font-mono ${
              r.ok ? "bg-emerald-950/40 text-emerald-400" : "bg-red-950/40 text-red-400"
            }`}
          >
            {r.name}: {r.ok ? "PASS" : "FAIL"} ({r.durationMs}ms)
            {r.error && <div>{r.error}</div>}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

export function ExportSection() {
  const { user, isAuthenticated } = useAuth();
  const perf = usePerformanceMetrics();

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Export a complete debug report as JSON. Secrets are masked automatically.
      </p>
      <Button
        size="sm"
        className="w-full"
        onClick={() =>
          downloadDebugReport({
            session: {
              authenticated: isAuthenticated,
              userId: user?.id,
              email: user?.email,
              role: user?.role,
            },
            performance: perf,
          })
        }
      >
        Export Debug Report
      </Button>
    </div>
  );
}

// Track login timestamp when auth succeeds
export function AuthTracker() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) setLoginTimestamp(new Date().toISOString());
  }, [isAuthenticated]);
  return null;
}
