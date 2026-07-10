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
 * Parse structured error payloads returned by Edge Functions on non-2xx responses.
 * @param {unknown} error
 */
async function readEdgeErrorPayload(error) {
  const err = error && typeof error === "object" ? /** @type {Record<string, unknown>} */ (error) : null;
  const context = err?.context;
  if (context && typeof context === "object" && "json" in context && typeof context.json === "function") {
    try {
      return await context.json();
    } catch {
      return null;
    }
  }
  return null;
}

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
    const edgePayload = await readEdgeErrorPayload(error);
    const edgeMessage =
      (edgePayload && typeof edgePayload === "object" && "message" in edgePayload && typeof edgePayload.message === "string"
        ? edgePayload.message
        : edgePayload && typeof edgePayload === "object" && edgePayload.error && typeof edgePayload.error === "object" && "message" in edgePayload.error
        ? String(edgePayload.error.message)
        : null) ||
      (error instanceof Error ? error.message : "AI request failed");

    const edgeCode =
      (edgePayload && typeof edgePayload === "object" && "code" in edgePayload && typeof edgePayload.code === "string"
        ? edgePayload.code
        : edgePayload && typeof edgePayload === "object" && edgePayload.error && typeof edgePayload.error === "object" && "code" in edgePayload.error
        ? String(edgePayload.error.code)
        : "AI_EDGE_FUNCTION");

    const normalized = normalizeAiError(
      { message: edgeMessage, name: error instanceof Error ? error.name : "FunctionsHttpError" },
      {
        provider: "supabase",
        code: edgeCode,
      },
    );
    normalized.context = "edge_function";
    normalized.function = name;
    normalized.stage = edgePayload && typeof edgePayload === "object" && "stage" in edgePayload
      ? edgePayload.stage
      : null;
    normalized.provider = edgePayload && typeof edgePayload === "object" && "provider" in edgePayload
      ? edgePayload.provider
      : null;
    normalized.model = edgePayload && typeof edgePayload === "object" && "model" in edgePayload
      ? edgePayload.model
      : null;
    normalized.details = edgePayload && typeof edgePayload === "object"
      ? edgePayload.details ?? edgePayload
      : null;
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
