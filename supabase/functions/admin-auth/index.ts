import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { errorEnvelope, successEnvelope } from "../_shared/envelope.ts";
import { isAdminUser } from "../_shared/auth.ts";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const rateLimitAttempts = new Map<string, { count: number; resetAt: number }>();

function getRequestIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown")
    .split(",")[0]
    .trim() || "unknown";
}

function checkRateLimit(req: Request, started: number): Response | null {
  const ip = getRequestIp(req);
  const now = Date.now();
  const current = rateLimitAttempts.get(ip);

  if (current && current.resetAt <= now) {
    rateLimitAttempts.delete(ip);
  }

  const entry = rateLimitAttempts.get(ip) || {
    count: 0,
    resetAt: now + RATE_LIMIT_WINDOW_MS,
  };

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return jsonResponse(
      req,
      errorEnvelope("Too many attempts. Try again later.", {
        code: "RATE_LIMITED",
        latency: Date.now() - started,
      }),
      429,
    );
  }

  entry.count += 1;
  rateLimitAttempts.set(ip, entry);
  return null;
}

function clearRateLimit(req: Request) {
  rateLimitAttempts.delete(getRequestIp(req));
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(req, errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    const rateLimited = checkRateLimit(req, started);
    if (rateLimited) return rateLimited;

    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email || !password) {
      return jsonResponse(
        req,
        errorEnvelope("Email and password are required.", {
          code: "INVALID_REQUEST",
          latency: Date.now() - started,
        }),
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || (!anonKey && !serviceRoleKey)) {
      return jsonResponse(
        req,
        errorEnvelope("Supabase environment is not configured.", {
          code: "CONFIG_ERROR",
          latency: Date.now() - started,
        }),
        500,
      );
    }

    const authKey = anonKey || serviceRoleKey!;
    const supabase = createClient(supabaseUrl, authKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return jsonResponse(
        req,
        errorEnvelope(error?.message ?? "Invalid admin credentials.", {
          code: "AI_AUTHENTICATION",
          latency: Date.now() - started,
        }),
        401,
      );
    }

    if (!isAdminUser(data.user)) {
      return jsonResponse(
        req,
        successEnvelope({
          result: { success: false },
          provider: "supabase",
          latency: Date.now() - started,
          metadata: { reason: "not_admin_role" },
        }),
      );
    }

    clearRateLimit(req);

    return jsonResponse(
      req,
      successEnvelope({
        result: { success: true, mode: "supabase_role" },
        provider: "supabase",
        latency: Date.now() - started,
        metadata: { user_id: data.user.id },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      req,
      errorEnvelope(message, {
        code: "EDGE_FUNCTION_ERROR",
        latency: Date.now() - started,
      }),
      500,
    );
  }
});
