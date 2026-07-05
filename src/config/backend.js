/**
 * Backend configuration — single switch for migration phases.
 *
 * VITE_DATA_BACKEND=supabase  (default) — canonical Supabase backend (Phase 7.7 RC3)
 * VITE_DATA_BACKEND=base44              — emergency rollback to Base44
 */

const VALID_BACKENDS = ["base44", "supabase"];

const rawBackend = import.meta.env.VITE_DATA_BACKEND || "supabase";

/** Active data backend identifier */
export const DATA_BACKEND = VALID_BACKENDS.includes(rawBackend) ? rawBackend : "supabase";

export function isBase44() {
  return DATA_BACKEND === "base44";
}

export function isSupabase() {
  return DATA_BACKEND === "supabase";
}

/** LLM / OCR features — can be disabled independently during cutover */
export function isAiEnabled() {
  return import.meta.env.VITE_AI_ENABLED !== "false";
}

/** Supabase env present (does not imply DATA_BACKEND=supabase) */
export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
