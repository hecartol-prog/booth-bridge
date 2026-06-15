/**
 * Supabase client singleton — lazy-initialized when backend is supabase.
 * Not used while VITE_DATA_BACKEND=base44 (default).
 */

import { createClient } from "@supabase/supabase-js";
import { isSupabase, isSupabaseConfigured } from "@/config/backend";

let client = null;

/**
 * Returns the shared Supabase client. Throws if backend is not supabase or env is missing.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (!isSupabase()) {
    throw new Error(
      "[supabaseClient] getSupabaseClient() requires VITE_DATA_BACKEND=supabase"
    );
  }

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
  if (!isSupabase() || !isSupabaseConfigured()) return null;
  return getSupabaseClient();
}
