/**
 * Supabase client singleton — lazy-initialized when env vars are present.
 * Auth always uses this client.
 */

import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/backend";

let client = null;

/**
 * Returns the shared Supabase client. Throws if Supabase env vars are missing.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "[supabaseClient] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required"
    );
  }

  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      }
    );
  }

  return client;
}

/**
 * Safe check for Phase 1+ diagnostics without throwing.
 */
export function tryGetSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseClient();
}
