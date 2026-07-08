import * as supabaseAi from "@/api/supabaseAi";

export function currentGateway() {
  return "supabase";
}

export function generate(params, options) {
  return supabaseAi.supabaseGenerate(params, options);
}

export function extractDocument(params, options) {
  return supabaseAi.supabaseExtractDocument(params, options);
}

export function recommend(params, options) {
  return supabaseAi.supabaseRecommend(params, options);
}

export function match(params, options) {
  return supabaseAi.supabaseMatch(params, options);
}

export async function* stream(params, options = {}) {
  yield* supabaseAi.supabaseStream(supabaseAi.EDGE_FUNCTIONS.generate, params, options);
}

export async function health() {
  return supabaseAi.supabaseHealth();
}
