/** LLM / OCR features — can be disabled independently during cutover */
export function isAiEnabled() {
  return import.meta.env.VITE_AI_ENABLED !== "false";
}

/** Supabase env present */
export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** RC10.6 local debug flag — requires authenticated session (see debugGate.js) */
export function isDebugMode() {
  return import.meta.env.DEV && import.meta.env.VITE_DEBUG_MODE === "true";
}
