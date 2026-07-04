import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; message: string; status: number };

const ADMIN_ROLES = new Set(["admin", "superadmin", "systemadmin", "supportadmin"]);

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

  const supabase = createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

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
