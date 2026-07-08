/** LLM / OCR features — can be disabled independently during cutover */
export function isAiEnabled() {
  return import.meta.env.VITE_AI_ENABLED !== "false";
}

/** Supabase env present */
export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
