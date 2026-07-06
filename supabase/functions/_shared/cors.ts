const DEFAULT_METHODS = "POST, OPTIONS";
const DEFAULT_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-requested-with";

function parseAllowedOrigins(): string[] {
  const raw =
    Deno.env.get("ALLOWED_ORIGINS") ||
    Deno.env.get("VITE_APP_URL") ||
    Deno.env.get("APP_URL") ||
    "";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveOrigin(req: Request): string | null {
  const requestOrigin = req.headers.get("Origin");
  const allowed = parseAllowedOrigins();

  if (!requestOrigin) {
    return allowed.length === 1 ? allowed[0] : null;
  }

  if (allowed.length === 0) {
    return null;
  }

  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function corsHeaders(req: Request, extra: Record<string, string> = {}): HeadersInit {
  const origin = resolveOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": DEFAULT_HEADERS,
    "Access-Control-Allow-Methods": DEFAULT_METHODS,
    "Vary": "Origin",
    ...extra,
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = resolveOrigin(req);
    if (!origin && req.headers.get("Origin")) {
      return new Response(null, { status: 403 });
    }

    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req, extra),
      "Content-Type": "application/json",
    },
  });
}
