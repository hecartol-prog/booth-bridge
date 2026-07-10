/**
 * RC10.6 — Optional Sentry reporting for Supabase Edge Functions.
 * Enabled when SENTRY_DSN is set in function secrets.
 */

type EdgeErrorContext = Record<string, unknown>;

const DSN = Deno.env.get("SENTRY_DSN");
const ENVIRONMENT = Deno.env.get("SENTRY_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "production";

function scrubValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return value
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[Filtered]")
      .replace(/or-[A-Za-z0-9]+/g, "[Filtered]");
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (/password|token|secret|api[_-]?key|authorization|jwt/i.test(key)) {
        out[key] = "[Filtered]";
      } else {
        out[key] = scrubValue(val);
      }
    }
    return out;
  }
  return value;
}

export function captureEdgeException(error: unknown, context: EdgeErrorContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    scope: "edge",
    event: "exception",
    environment: ENVIRONMENT,
    message,
    stack,
    context: scrubValue(context),
  }));

  if (!DSN) return;

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    environment: ENVIRONMENT,
    exception: {
      values: [{ type: "Error", value: message, stacktrace: stack ? { frames: [{ filename: "edge" }] } : undefined }],
    },
    extra: scrubValue(context),
    tags: {
      runtime: "supabase-edge",
      subsystem: String(context.subsystem || "EDGE"),
    },
  };

  fetch(DSN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* best-effort */
  });
}
