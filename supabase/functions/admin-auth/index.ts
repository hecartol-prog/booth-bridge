import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { errorEnvelope, successEnvelope } from "../_shared/envelope.ts";
import { isAdminUser } from "../_shared/auth.ts";

const ADMIN_ROLES_ENV = ["admin", "superadmin", "systemadmin", "supportadmin"];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse(errorEnvelope("Method not allowed.", { code: "METHOD_NOT_ALLOWED" }), 405);
  }

  const started = Date.now();

  try {
    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email || !password) {
      return jsonResponse(
        errorEnvelope("Email and password are required.", {
          code: "INVALID_REQUEST",
          latency: Date.now() - started,
        }),
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        errorEnvelope("Supabase environment is not configured.", {
          code: "CONFIG_ERROR",
          latency: Date.now() - started,
        }),
        500,
      );
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    if (adminEmail && adminPassword) {
      const valid =
        email.trim().toLowerCase() === adminEmail.trim().toLowerCase() &&
        password === adminPassword;

      if (!valid) {
        return jsonResponse(
          errorEnvelope("Invalid admin credentials.", {
            code: "AI_AUTHENTICATION",
            latency: Date.now() - started,
          }),
          401,
        );
      }

      return jsonResponse(
        successEnvelope({
          result: { success: true, mode: "env_credentials" },
          provider: "supabase",
          latency: Date.now() - started,
          metadata: { roles: ADMIN_ROLES_ENV },
        }),
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return jsonResponse(
        errorEnvelope(error?.message ?? "Invalid admin credentials.", {
          code: "AI_AUTHENTICATION",
          latency: Date.now() - started,
        }),
        401,
      );
    }

    if (!isAdminUser(data.user)) {
      return jsonResponse(
        successEnvelope({
          result: { success: false },
          provider: "supabase",
          latency: Date.now() - started,
          metadata: { reason: "not_admin_role" },
        }),
      );
    }

    return jsonResponse(
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
      errorEnvelope(message, {
        code: "EDGE_FUNCTION_ERROR",
        latency: Date.now() - started,
      }),
      500,
    );
  }
});
