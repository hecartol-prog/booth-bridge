import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; message: string; status: number };

const ADMIN_ROLES = new Set(["admin", "superadmin", "systemadmin", "supportadmin"]);

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_cachedClient) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    _cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _cachedClient;
}

export async function validateJwt(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, message: "Missing or invalid Authorization header.", status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, message: "Missing bearer token.", status: 401 };
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      message: error?.message ?? "Invalid or expired JWT.",
      status: 401,
    };
  }

  return { ok: true, user: data.user };
}

export function isAdminUser(user: User): boolean {
  const role = (user.app_metadata?.role || "").toString().toLowerCase();
  return ADMIN_ROLES.has(role);
}
