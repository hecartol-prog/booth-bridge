/**
 * RC10.5 — Global error and fetch interceptors.
 */

import { addApiRequest, addDebugError, addDebugLog } from "@/debug/debugStore";

let installed = false;

/**
 * @param {ErrorEvent} event
 */
function handleWindowError(event) {
  addDebugError({
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    component: event.filename ? event.filename.split("/").pop() : "unknown",
    message: event.message || "Unknown error",
    stack: event.error?.stack || null,
    severity: "error",
  });
}

/**
 * @param {PromiseRejectionEvent} event
 */
function handleUnhandledRejection(event) {
  const reason = event.reason;
  const message =
    reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
  addDebugError({
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    component: "promise",
    message,
    stack: reason instanceof Error ? reason.stack : null,
    severity: "error",
  });
}

/**
 * @param {string} url
 */
function classifyRequest(url) {
  const u = url.toLowerCase();
  if (u.includes("openrouter") || u.includes("/functions/v1/ai-")) return "ai";
  if (u.includes("supabase.co") && u.includes("/storage/")) return "storage";
  if (u.includes("supabase.co")) return "supabase";
  return "other";
}

export function installDebugInterceptors() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const started = Date.now();
    const input = args[0];
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    const method =
      args[1]?.method ||
      (input instanceof Request ? input.method : "GET");

    let status = 0;
    let responseSize = 0;
    let error = null;
    let retryCount = 0;

    try {
      const response = await originalFetch(...args);
      status = response.status;
      const clone = response.clone();
      try {
        const buf = await clone.arrayBuffer();
        responseSize = buf.byteLength;
      } catch {
        responseSize = 0;
      }
      return response;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = Date.now() - started;
      const category = classifyRequest(url);
      addApiRequest({
        timestamp: new Date().toISOString(),
        method: method.toUpperCase(),
        url,
        duration,
        status,
        responseSize,
        error,
        retryCount,
        category,
      });
      addDebugLog(
        category === "ai" ? "AI" : category === "storage" ? "STORAGE" : "SUPABASE",
        error || status >= 400 ? "warn" : "debug",
        `${method.toUpperCase()} ${url}`,
        { status, responseSize },
        duration
      );
    }
  };

  addDebugLog("DEBUG", "info", "Debug interceptors installed");
}

export function uninstallDebugInterceptors() {
  if (!installed) return;
  window.removeEventListener("error", handleWindowError);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  installed = false;
}
