/**
 * RC10.5 — Export debug report as JSON.
 */

import { getDebugState } from "@/debug/debugStore";
import { getEnvironmentLabel } from "@/debug/debugGate";
import { maskSensitiveData } from "@/debug/debugMask";

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  return browser;
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

/**
 * @param {Record<string, unknown>} [overrides]
 */
export function buildDebugReport(overrides = {}) {
  const state = getDebugState();
  const buildInfo = /** @type {Record<string, string>} */ (
    typeof __BB_BUILD_INFO__ !== "undefined" ? __BB_BUILD_INFO__ : {}
  );

  return maskSensitiveData({
    exportedAt: new Date().toISOString(),
    environment: {
      label: getEnvironmentLabel(),
      mode: import.meta.env.MODE,
      url: window.location.href,
      route: window.location.pathname,
      language: navigator.language,
      online: navigator.onLine,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    },
    application: {
      version: buildInfo.version || import.meta.env.VITE_APP_VERSION || "0.0.0",
      commit: buildInfo.commit || "unknown",
      buildTimestamp: buildInfo.timestamp || null,
    },
    browser: {
      name: getBrowserInfo(),
      os: getOsInfo(),
      userAgent: navigator.userAgent,
    },
    session: overrides.session || null,
    ai: state.ai,
    ocr: {
      stages: state.ocrStages,
      meta: state.ocrRunMeta,
    },
    supabase: state.supabase,
    storage: state.storage,
    database: state.database,
    errors: state.errors.slice(0, 50),
    network: state.apiRequests.slice(0, 100),
    performance: overrides.performance || null,
    featureFlags: {
      VITE_AI_ENABLED: import.meta.env.VITE_AI_ENABLED ?? "true",
      VITE_DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE ?? "false",
      VITE_APP_URL: import.meta.env.VITE_APP_URL ?? "",
      VITE_RC10_VISION_MODEL: import.meta.env.VITE_RC10_VISION_MODEL ?? "",
      VITE_RC10_NORMALIZE_MODEL: import.meta.env.VITE_RC10_NORMALIZE_MODEL ?? "",
      backend: "supabase",
      storage: "supabase",
    },
    logs: state.logs.slice(0, 100),
  });
}

export function downloadDebugReport(overrides = {}) {
  const report = buildDebugReport(overrides);
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `debug-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
