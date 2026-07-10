/**
 * RC10.6 — Scrub secrets before Sentry export.
 */

import { maskSensitiveData } from "@/debug/debugMask";

const HEADER_DENY = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "apikey",
  "x-supabase-api-key",
]);

const VALUE_PATTERNS = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /(?:api[_-]?key|secret|token|password|bearer)\s*[:=]\s*["']?[^"'\s]+/gi,
  /sk_[A-Za-z0-9]+/g,
  /or-[A-Za-z0-9]+/g,
];

/**
 * @param {string} value
 */
function scrubString(value) {
  if (typeof value !== "string") return value;
  let out = value;
  for (const pattern of VALUE_PATTERNS) {
    out = out.replace(pattern, "[Filtered]");
  }
  return out;
}

/**
 * @param {import("@sentry/react").Event} event
 */
export function scrubSentryEvent(event) {
  if (event.request?.headers) {
    for (const key of Object.keys(event.request.headers)) {
      if (HEADER_DENY.has(key.toLowerCase())) {
        event.request.headers[key] = "[Filtered]";
      }
    }
  }

  if (event.request?.cookies) {
    event.request.cookies = {};
  }

  if (event.user) {
    delete event.user.ip_address;
    if (event.user.email) {
      // Keep email for support correlation — never include tokens.
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: crumb.message ? scrubString(crumb.message) : crumb.message,
      data: crumb.data ? /** @type {Record<string, unknown>} */ (maskSensitiveData(crumb.data)) : crumb.data,
    }));
  }

  if (event.extra) {
    event.extra = /** @type {Record<string, unknown>} */ (maskSensitiveData(event.extra));
  }

  if (event.contexts) {
    for (const [key, ctx] of Object.entries(event.contexts)) {
      if (ctx && typeof ctx === "object") {
        event.contexts[key] = /** @type {Record<string, unknown>} */ (maskSensitiveData(ctx));
      }
    }
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubString(ex.value);
      if (ex.stacktrace?.frames) {
        for (const frame of ex.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = /** @type {Record<string, string>} */ (maskSensitiveData(frame.vars));
          }
        }
      }
    }
  }

  return event;
}

/**
 * @param {Record<string, unknown>} metadata
 */
export function scrubMetadata(metadata) {
  return /** @type {Record<string, unknown>} */ (maskSensitiveData(metadata));
}
