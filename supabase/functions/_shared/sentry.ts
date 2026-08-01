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

function parseDsn(dsn: string) {
  const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!match) return null;
  return { publicKey: match[1], host: match[2], projectId: match[3] };
}

function getSentryEnvelopeUrl(dsn: string) {
  const parsed = parseDsn(dsn);
  if (!parsed) return null;
  return `https://${parsed.host}/api/${parsed.projectId}/envelope/`;
}

function parseStackFrames(error: Error) {
  return (error.stack || "").split("\n").slice(1).map((line) => {
    const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
    return match
      ? {
        filename: match[2],
        function: match[1],
        lineno: parseInt(match[3], 10),
        colno: parseInt(match[4], 10),
      }
      : { filename: "unknown" };
  });
}

export function captureEdgeException(error: unknown, context: EdgeErrorContext = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const frames = error instanceof Error ? parseStackFrames(error) : [{ filename: "edge" }];

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

  const envelopeUrl = getSentryEnvelopeUrl(DSN);
  if (!envelopeUrl) return;

  const parsed = parseDsn(DSN);
  if (!parsed) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "javascript",
    environment: ENVIRONMENT,
    exception: {
      values: [{
        type: "Error",
        value: message,
        stacktrace: { frames },
      }],
    },
    extra: scrubValue(context),
    tags: {
      runtime: "supabase-edge",
      subsystem: String(context.subsystem || "EDGE"),
    },
  };

  // Sentry envelope format: header + item header + payload
  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    dsn: DSN,
    sent_at: new Date().toISOString(),
  });
  const itemHeader = JSON.stringify({ type: "event", content_type: "application/json" });
  const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(payload)}`;

  fetch(envelopeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=boothbridge-edge/1.0`,
    },
    body,
  }).catch(() => {
    /* best-effort */
  });
}
