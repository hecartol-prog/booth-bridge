/**
 * Supabase Edge Function AI client (Phase 7.4D).
 * Internal module — consumed by aiClient.js only.
 *
 * Server logic lives in Edge Functions (not implemented in this phase).
 */

import { getSupabaseClient } from "@/api/supabaseClient";
import { normalizeAiError } from "@/ai/aiErrors";

/** @type {Record<string, string>} */
export const EDGE_FUNCTIONS = {
  generate: "ai-generate",
  chat: "ai-chat",
  document: "ai-document",
  businessCard: "ai-business-card",
  summary: "ai-summary",
  classify: "ai-classify",
  recommend: "ai-recommend",
  match: "ai-match",
  health: "ai-health",
};

/**
 * @param {string} name
 * @param {Record<string, unknown>} body
 * @param {{ signal?: AbortSignal }} [options]
 */
async function invokeEdgeFunction(name, body, options = {}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (error) {
    const normalized = normalizeAiError(error, {
      provider: "supabase",
      code: "AI_EDGE_FUNCTION",
    });
    normalized.context = "edge_function";
    normalized.function = name;
    throw normalized;
  }

  return data;
}

export function supabaseGenerate(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.generate, params, options);
}

export function supabaseChat(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.chat, params, options);
}

export function supabaseExtractDocument(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.document, params, options);
}

export function supabaseExtractBusinessCard(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.businessCard, params, options);
}

export function supabaseSummarize(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.summary, params, options);
}

export function supabaseClassify(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.classify, params, options);
}

export function supabaseRecommend(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.recommend, params, options);
}

export function supabaseMatch(params, options) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.match, params, options);
}

export async function supabaseHealth() {
  try {
    const data = await invokeEdgeFunction(EDGE_FUNCTIONS.health, { ping: true });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: normalizeAiError(error, { provider: "supabase" }) };
  }
}

/**
 * Streaming stub — Edge Function should return SSE; client parses when implemented.
 * @param {string} functionName
 * @param {Record<string, unknown>} body
 * @param {{ signal?: AbortSignal, onChunk?: (chunk: string) => void }} [options]
 */
export async function* supabaseStream(functionName, body, options = {}) {
  const response = await supabaseGenerate(
    { ...body, stream: true, target_function: functionName },
    options
  );

  if (response?.chunks && Array.isArray(response.chunks)) {
    for (const chunk of response.chunks) {
      if (options.onChunk) options.onChunk(chunk);
      yield chunk;
    }
    return;
  }

  const text =
    typeof response === "string"
      ? response
      : response?.result || response?.text || JSON.stringify(response);
  if (options.onChunk) options.onChunk(text);
  yield text;
}
