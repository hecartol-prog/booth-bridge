/**
 * RC10.6 — Bridge debug events and API activity into Sentry.
 */

import * as Sentry from "@sentry/react";
import { onDebugEvent } from "@/debug/debugBridge";
import { isSentryEnabled } from "@/monitoring/sentryConfig";
import { captureRuntimeError } from "@/monitoring/sentryErrors";
import { sentryBreadcrumbs } from "@/monitoring/sentryBreadcrumbs";
import { scrubMetadata } from "@/monitoring/sentryScrub";

let installed = false;

/**
 * @param {string} category
 * @param {Record<string, unknown>} apiEntry
 */
function trackApiSpan(category, apiEntry) {
  if (!isSentryEnabled()) return;

  const url = String(apiEntry.url || "");
  const duration = Number(apiEntry.duration || 0);
  const status = Number(apiEntry.status || 0);
  const method = String(apiEntry.method || "GET");

  Sentry.startSpan(
    {
      name: `${method} ${category}`,
      op: `http.client.${category}`,
      attributes: {
        "http.url": url,
        "http.status_code": status,
        duration_ms: duration,
      },
    },
    () => undefined,
  );

  if (apiEntry.error || status >= 400) {
    const subsystem =
      category === "ai" ? "AI"
        : category === "storage" ? "STORAGE"
          : category === "supabase" ? "SUPABASE"
            : "NETWORK";

    captureRuntimeError(apiEntry.error || `HTTP ${status}`, {
      subsystem,
      category: "api_failure",
      metadata: scrubMetadata({
        url,
        method,
        status,
        duration,
        responseSize: apiEntry.responseSize,
      }),
      level: status >= 500 ? "error" : "warning",
    });
  }
}

export function installMonitoringBridge() {
  if (installed || !isSentryEnabled()) return;
  installed = true;

  onDebugEvent("error", (payload) => {
    const entry = /** @type {Record<string, unknown>} */ (payload);
    captureRuntimeError(String(entry.message || "Runtime error"), {
      subsystem: "UI",
      category: "unhandled",
      component: typeof entry.component === "string" ? entry.component : undefined,
      route: typeof entry.page === "string" ? entry.page : undefined,
      metadata: scrubMetadata({
        stack: entry.stack,
        severity: entry.severity,
      }),
    });
  });

  onDebugEvent("api", (payload) => {
    const entry = /** @type {Record<string, unknown>} */ (payload);
    trackApiSpan(String(entry.category || "other"), entry);
  });

  onDebugEvent("ai", (payload) => {
    const entry = /** @type {Record<string, unknown>} */ (payload);
    if (entry.success) {
      sentryBreadcrumbs.aiResponse(scrubMetadata(entry));
    } else {
      sentryBreadcrumbs.aiRequest(scrubMetadata(entry));
      captureRuntimeError(entry.error || "AI request failed", {
        subsystem: "AI",
        category: "ai_failure",
        metadata: scrubMetadata(entry),
      });
    }
  });

  onDebugEvent("storage", (payload) => {
    const entry = /** @type {Record<string, unknown>} */ (payload);
    sentryBreadcrumbs.storageUpload(scrubMetadata(entry));
    if (entry.lastUploadError || entry.uploadStatus === "failed") {
      captureRuntimeError(String(entry.lastUploadError || "Storage upload failed"), {
        subsystem: "STORAGE",
        category: "storage_failure",
        metadata: scrubMetadata(entry),
      });
    }
  });

  onDebugEvent("pipeline", (payload) => {
    const data = /** @type {{ stageKey?: string, entry?: { status?: string, error?: string } }} */ (payload);
    const stage = data.stageKey || "pipeline";
    const status = data.entry?.status;
    if (status === "RUNNING") sentryBreadcrumbs.ocrStarted({ stage });
    else if (status === "PASS") sentryBreadcrumbs.ocrFinished({ stage });
    else if (status === "FAILED") {
      sentryBreadcrumbs.ocrFailed({ stage, error: data.entry?.error });
      captureRuntimeError(data.entry?.error || `OCR stage failed: ${stage}`, {
        subsystem: "OCR",
        category: "ocr_failure",
        metadata: { stage },
      });
    }
  });
}
