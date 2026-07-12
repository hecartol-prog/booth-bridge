/**
 * RC10.6 — Categorized runtime error reporting for Sentry.
 */

import * as Sentry from "@sentry/react";
import { isSentryEnabled } from "@/monitoring/sentryConfig";
import { scrubMetadata } from "@/monitoring/sentryScrub";

/** @typedef {"AUTH"|"SUPABASE"|"OCR"|"AI"|"UPLOAD"|"REALTIME"|"PROFILE"|"NOTIFICATIONS"|"STORAGE"|"NETWORK"|"UI"} ErrorSubsystem */

/**
 * @param {unknown} error
 * @param {{
 *   subsystem: ErrorSubsystem,
 *   category?: string,
 *   component?: string,
 *   route?: string,
 *   metadata?: Record<string, unknown>,
 *   level?: "fatal"|"error"|"warning"|"log"|"info"|"debug",
 * }} options
 */
export function captureRuntimeError(error, options) {
  if (!isSentryEnabled()) return;

  const err = error instanceof Error ? error : new Error(String(error ?? "Unknown error"));
  const route = options.route || (typeof window !== "undefined" ? window.location.pathname : undefined);

  Sentry.withScope((scope) => {
    scope.setTag("subsystem", options.subsystem);
    scope.setTag("error_category", options.category || "runtime");
    if (options.component) scope.setTag("component", options.component);
    if (route) scope.setTag("route", route);
    scope.setLevel(options.level || "error");
    scope.setContext("runtime", scrubMetadata({
      subsystem: options.subsystem,
      category: options.category || "runtime",
      timestamp: new Date().toISOString(),
      route: route || null,
      component: options.component || null,
      ...options.metadata,
    }));
    Sentry.captureException(err);
  });
}

/**
 * @param {string} message
 * @param {Parameters<typeof captureRuntimeError>[1]} options
 */
export function captureRuntimeMessage(message, options) {
  if (!isSentryEnabled()) return;
  captureRuntimeError(new Error(message), options);
}

/**
 * @param {import("@sentry/react").Span} span
 * @param {Record<string, unknown>} data
 */
export function setSpanData(span, data) {
  if (!span) return;
  for (const [key, value] of Object.entries(scrubMetadata(data))) {
    const normalized = typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "unknown");
    span.setAttribute(key, normalized);
  }
}
