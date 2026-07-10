/**
 * RC10.5 — Playwright / E2E test hooks exposed on window.__BB_DEBUG__.
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { auth } from "@/api/authClient";
import { isAiEnabled } from "@/config/backend";
import * as aiClient from "@/api/aiClient";
import { getDebugState, patchSupabaseState } from "@/debug/debugStore";
import { buildDebugReport } from "@/debug/exportReport";

/**
 * @param {() => Promise<unknown>} fn
 * @param {string} name
 */
async function runHook(fn, name) {
  const started = Date.now();
  try {
    const result = await fn();
    return { ok: true, name, durationMs: Date.now() - started, result };
  } catch (error) {
    return {
      ok: false,
      name,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function installPlaywrightHooks() {
  if (typeof window === "undefined") return;

  window.__BB_DEBUG__ = {
    getState: () => getDebugState(),
    exportReport: () => buildDebugReport(),
    runHealthCheck: () =>
      runHook(async () => {
        const supabase = getSupabaseClient();
        const start = Date.now();
        const { error } = await supabase.from("user").select("id").limit(1);
        patchSupabaseState({
          databaseReachable: !error,
          latencyMs: Date.now() - start,
          connectionStatus: error ? "error" : "connected",
          lastHealthCheck: new Date().toISOString(),
        });
        if (error) throw error;
        return { database: true };
      }, "healthCheck"),

    runOcrTest: () =>
      runHook(async () => {
        const state = getDebugState();
        const stages = Object.values(state.ocrStages);
        const hasRun = stages.some((s) => s.status !== "IDLE");
        return { hasPipelineData: hasRun, stages: state.ocrStages };
      }, "ocrTest"),

    runAuthTest: () =>
      runHook(async () => {
        const user = await auth.getCurrentUser();
        const session = await auth.currentSession();
        return {
          authenticated: !!user,
          userId: user?.id ?? null,
          hasSession: !!session,
        };
      }, "authTest"),

    runStorageTest: () =>
      runHook(async () => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        return { bucketCount: data?.length ?? 0 };
      }, "storageTest"),

    runAiTest: () =>
      runHook(async () => {
        if (!isAiEnabled()) return { enabled: false };
        const health = await aiClient.health();
        return { enabled: true, health };
      }, "aiTest"),

    runRealtimeTest: () =>
      runHook(async () => {
        const supabase = getSupabaseClient();
        const channel = supabase.channel("bb-debug-health");
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Realtime timeout")), 5000);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timeout);
              resolve(status);
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(timeout);
              reject(new Error(`Realtime ${status}`));
            }
          });
        });
        await supabase.removeChannel(channel);
        return { subscribed: true };
      }, "realtimeTest"),

    runNotificationsTest: () =>
      runHook(async () => {
        const supabase = getSupabaseClient();
        const user = await auth.getCurrentUser();
        if (!user?.id) return { skipped: true, reason: "not authenticated" };
        const { data, error } = await supabase
          .from("notification")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (error) throw error;
        return { reachable: true, sampleCount: data?.length ?? 0 };
      }, "notificationsTest"),
  };
}
